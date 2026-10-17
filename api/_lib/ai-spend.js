// api/_lib/ai-spend.js
// Controle des depenses IA de l'Academie : mesure chaque appel, plafonne par jour / par mois / par eleve,
// et alimente le tableau de bord de l'administrateur. Dans /_lib : ce n'est PAS une fonction serverless.
//
// Collection ECRITE ET LUE PAR LE SERVEUR SEULEMENT (aucune regle Firestore a ouvrir) :
//   academy_ai_spend/d-YYYY-MM-DD       total du jour   {calls, errors, blocked, tokensIn, tokensOut, costUsd, byKind}
//   academy_ai_spend/m-YYYY-MM          total du mois   (memes champs)
//   academy_ai_spend/u-YYYY-MM-DD-<uid> total d'un eleve pour le jour {uid, day, calls, costUsd}
// Reglages (lus dans app_config/academy_ai, modifiables par l'admin) :
//   dailyBudgetUsd, monthlyBudgetUsd, perUserDailyUsd  (0 ou absent = pas de plafond)
//   priceInPerM, priceOutPerM                          (prix par million de tokens ; vide = tarif par defaut du fournisseur)
// Les couts sont des ESTIMATIONS : la facture reelle reste celle du fournisseur.

// Tarifs par defaut ($ / million de tokens) quand l'admin n'en a pas saisi.
const DEFAULT_PRICES = { anthropic: { in: 3, out: 15 }, gemini: { in: 0.3, out: 2.5 } };

const num = (v, min, max, fb) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fb; };
const r4 = (x) => Math.round(x * 10000) / 10000;
const dayId = (ms) => new Date(ms).toISOString().slice(0, 10);
const monthId = (ms) => new Date(ms).toISOString().slice(0, 7);
const KINDS = ['plan', 'lesson', 'tutor', 'other'];

function normalizeSpendConfig(raw) {
  const d = raw && typeof raw === 'object' ? raw : {};
  return {
    dailyBudgetUsd: r4(num(d.dailyBudgetUsd, 0, 100000, 0)),
    monthlyBudgetUsd: r4(num(d.monthlyBudgetUsd, 0, 1000000, 0)),
    perUserDailyUsd: r4(num(d.perUserDailyUsd, 0, 10000, 0)),
    priceInPerM: num(d.priceInPerM, 0, 1000, 0),
    priceOutPerM: num(d.priceOutPerM, 0, 5000, 0)
  };
}

// Estimation du cout d'un appel. Pure et testable.
function estimateCost({ provider, tokensIn, tokensOut }, cfg) {
  const def = DEFAULT_PRICES[provider] || DEFAULT_PRICES.anthropic;
  const pin = cfg && cfg.priceInPerM > 0 ? cfg.priceInPerM : def.in;
  const pout = cfg && cfg.priceOutPerM > 0 ? cfg.priceOutPerM : def.out;
  return r4(((Number(tokensIn) || 0) * pin + (Number(tokensOut) || 0) * pout) / 1e6);
}

// Decision de plafond, pure : renvoie null si tout va bien, sinon un message clair pour l'eleve.
function budgetVerdict(cfg, { day, month, user }) {
  if (cfg.dailyBudgetUsd > 0 && day >= cfg.dailyBudgetUsd) return { scope: 'day', message: "Le tuteur de l'Académie est en pause jusqu'à demain : la capacité du jour est atteinte. Reviens demain, rien n'a été décompté." };
  if (cfg.monthlyBudgetUsd > 0 && month >= cfg.monthlyBudgetUsd) return { scope: 'month', message: "Le tuteur de l'Académie est en pause jusqu'au début du mois prochain : la capacité mensuelle est atteinte. Rien n'a été décompté." };
  if (cfg.perUserDailyUsd > 0 && user >= cfg.perUserDailyUsd) return { scope: 'user', message: "Tu as atteint ta limite d'utilisation du tuteur pour aujourd'hui. Reviens demain, rien n'a été décompté." };
  return null;
}

function createAiSpend({ db, admin, ADMIN_UID }) {
  const FV = () => admin.firestore.FieldValue;
  const col = () => db.collection('academy_ai_spend');
  let cfgCache = { at: 0, cfg: normalizeSpendConfig({}) };
  let totCache = { at: 0, key: '', day: 0, month: 0 };

  async function getSpendConfig(force) {
    if (!force && Date.now() - cfgCache.at < 20000) return cfgCache.cfg;
    try { const s = await db.collection('app_config').doc('academy_ai').get(); cfgCache = { at: Date.now(), cfg: normalizeSpendConfig(s.exists ? s.data() : {}) }; }
    catch (e) { /* on garde la derniere valeur connue */ }
    return cfgCache.cfg;
  }
  async function totals(now) {
    const key = dayId(now);
    if (totCache.key === key && Date.now() - totCache.at < 15000) return totCache;
    const [d, m] = await Promise.all([col().doc('d-' + key).get(), col().doc('m-' + monthId(now)).get()]);
    totCache = { at: Date.now(), key, day: d.exists ? Number(d.data().costUsd) || 0 : 0, month: m.exists ? Number(m.data().costUsd) || 0 : 0 };
    return totCache;
  }

  // A appeler AVANT chaque appel a l'IA : leve une erreur claire si un plafond est atteint.
  async function check(uid) {
    const now = Date.now();
    let cfg, tot, userCost = 0;
    try {
      cfg = await getSpendConfig();
      if (!(cfg.dailyBudgetUsd > 0 || cfg.monthlyBudgetUsd > 0 || cfg.perUserDailyUsd > 0)) return;
      tot = await totals(now);
      if (cfg.perUserDailyUsd > 0 && uid) { const s = await col().doc('u-' + dayId(now) + '-' + uid).get(); userCost = s.exists ? Number(s.data().costUsd) || 0 : 0; }
    } catch (e) { return; } // en cas de panne de lecture, on ne bloque pas les eleves
    const v = budgetVerdict(cfg, { day: tot.day, month: tot.month, user: userCost });
    if (v) {
      try { await col().doc('d-' + dayId(now)).set({ day: dayId(now), kind: 'day', blocked: FV().increment(1) }, { merge: true }); } catch (e) { /* secondaire */ }
      const err = new Error(v.message); err.code = 'ai_budget_' + v.scope; throw err;
    }
  }

  // A appeler APRES chaque appel (reussi ou non) avec les tokens lus dans la reponse du fournisseur.
  async function record({ uid, kind, provider, model, tokensIn, tokensOut, ok }) {
    try {
      const now = Date.now(), cfg = await getSpendConfig();
      const k = KINDS.includes(kind) ? kind : 'other';
      const tin = Math.max(0, Math.floor(Number(tokensIn) || 0)), tout = Math.max(0, Math.floor(Number(tokensOut) || 0));
      const cost = ok === false ? 0 : estimateCost({ provider, tokensIn: tin, tokensOut: tout }, cfg);
      const inc = (n) => FV().increment(n);
      const body = (extra) => Object.assign({
        calls: inc(1), errors: inc(ok === false ? 1 : 0), tokensIn: inc(tin), tokensOut: inc(tout), costUsd: inc(cost),
        byKind: { [k]: { calls: inc(1), costUsd: inc(cost) } }, updatedAt: new Date(now).toISOString()
      }, extra || {});
      const b = db.batch();
      b.set(col().doc('d-' + dayId(now)), body({ day: dayId(now), kind: 'day', lastModel: String(model || '').slice(0, 60) }), { merge: true });
      b.set(col().doc('m-' + monthId(now)), body({ month: monthId(now), kind: 'month' }), { merge: true });
      if (uid) b.set(col().doc('u-' + dayId(now) + '-' + uid), { uid, day: dayId(now), kind: 'user', calls: inc(1), costUsd: inc(cost), tokensOut: inc(tout) }, { merge: true });
      await b.commit();
      totCache.at = 0; // les totaux seront relus au prochain controle
    } catch (e) { console.error('[ai-spend] enregistrement impossible :', e && e.message); }
  }

  // Rapport pour l'admin : aujourd'hui, mois, 14 derniers jours, eleves les plus consommateurs.
  async function report(uid) {
    if (uid !== ADMIN_UID) throw new Error('Accès réservé à l’administrateur.');
    const now = Date.now(), cfg = await getSpendConfig(true);
    const ids = []; for (let i = 0; i < 14; i++) ids.push(dayId(now - i * 86400000));
    const [dSnaps, mSnap, uSnap] = await Promise.all([
      db.getAll(...ids.map((id) => col().doc('d-' + id))),
      col().doc('m-' + monthId(now)).get(),
      col().where('day', '==', dayId(now)).limit(300).get()
    ]);
    const pick = (s) => { const d = s.exists ? s.data() : {}; return { calls: d.calls || 0, errors: d.errors || 0, blocked: d.blocked || 0, tokensIn: d.tokensIn || 0, tokensOut: d.tokensOut || 0, costUsd: r4(d.costUsd || 0), byKind: d.byKind || {} }; };
    const days = dSnaps.map((s, i) => Object.assign({ day: ids[i] }, pick(s)));
    const users = uSnap.docs.map((s) => s.data()).filter((u) => u.kind === 'user').sort((a, b) => (b.costUsd || 0) - (a.costUsd || 0)).slice(0, 10);
    const names = {};
    await Promise.all(users.map(async (u) => { try { const s = await db.collection('users').doc(u.uid).get(); names[u.uid] = s.exists ? (s.data().name || s.data().email || '') : ''; } catch (e) { names[u.uid] = ''; } }));
    return {
      success: true, config: cfg, today: days[0], month: pick(mSnap), days,
      topUsers: users.map((u) => ({ uid: u.uid, name: names[u.uid] || '', calls: u.calls || 0, costUsd: r4(u.costUsd || 0) }))
    };
  }

  return { check, record, report, getSpendConfig };
}

module.exports = { createAiSpend, estimateCost, budgetVerdict, normalizeSpendConfig, DEFAULT_PRICES };
