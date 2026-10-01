// api/generate-mockup.js
// Genere un VRAI mockup photoréaliste avec une IA de génération d'image
// (Google Gemini / "Nano Banana") au lieu d'un simple montage en canvas :
// le design est appliqué au produit avec les bonnes ombres, plis et
// perspective, comme s'il avait été imprimé/brodé directement dessus.
//
// Nécessite la variable d'environnement Vercel : GEMINI_API_KEY
// (à récupérer sur https://aistudio.google.com/apikey -- facturation
// Google à activer sur le projet Cloud pour que les appels passent).
//
// GEMINI_IMAGE_MODEL (optionnel) : nom du modèle à utiliser. Par défaut
// "gemini-2.5-flash-image". Si Google publie un modèle plus récent/moins
// cher, change juste cette variable d'environnement -- aucun code à
// modifier.
//
// ---- MONETISATION ----
// Chaque génération coûte réellement de l'argent à Coeurnoh Universe
// (facturé par Google, environ 0,04 $/image). Pour que ce ne soit pas une
// fonctionnalité qui coûte sans jamais rapporter :
//   - FREE_QUOTA générations gratuites à vie par utilisateur (compteur
//     users/{uid}.mockupFreeUsed).
//   - Au-delà, chaque génération débite PRICE_USD du portefeuille interne
//     de l'utilisateur (le même solde que partout ailleurs dans l'app).
//   - Si le solde est insuffisant : message clair invitant à recharger,
//     rien n'est débité.
//   - Si la génération IA échoue malgré tout APRES avoir débité/consommé
//     le quota, remboursement automatique (le client ne paie jamais pour
//     un résultat qu'il n'a pas reçu).
// Ajuste FREE_QUOTA et PRICE_USD ci-dessous selon ta politique.

const admin = require('firebase-admin');
const { initFirebaseAdmin, verifyCaller, enforceRateLimit, sendError, UserError, getBody, roundMoney } = require('./_lib/security');
const { buildWalletTxEntry } = require('./_lib/wallet-ledger');

initFirebaseAdmin();
const db = admin.firestore();

const DEFAULT_MODEL = 'gemini-2.5-flash-image';
const MAX_INPUT_B64_CHARS = 6_000_000; // ~4.5 Mo par image une fois décodée
const FREE_QUOTA = 2;
const PRICE_USD = 0.20;

function parseDataUrl(value) {
  if (typeof value !== 'string' || !value) return null;
  const m = /^data:([^;]+);base64,(.+)$/.exec(value);
  if (!m) return null;
  if (m[2].length > MAX_INPUT_B64_CHARS) return null;
  return { mimeType: m[1], data: m[2] };
}

// Débite (quota gratuit ou solde) AVANT d'appeler l'IA -- en cas d'échec
// de la génération, refundCharge() ci-dessous annule exactement ceci.
async function chargeForGeneration(uid) {
  const userRef = db.collection('users').doc(uid);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) throw new UserError('Compte introuvable.');
    const data = snap.data();
    const freeUsed = data.mockupFreeUsed || 0;
    const balance = data.balance || 0;

    if (freeUsed < FREE_QUOTA) {
      tx.update(userRef, { mockupFreeUsed: freeUsed + 1 });
      return { type: 'free', freeRemaining: FREE_QUOTA - (freeUsed + 1), balance };
    }
    if (balance < PRICE_USD) {
      throw new UserError(`Solde insuffisant pour générer ce mockup (${PRICE_USD.toFixed(2)} $). Recharge ton portefeuille pour continuer.`);
    }
    const newBalance = roundMoney(balance - PRICE_USD);
    tx.update(userRef, { balance: newBalance });
    tx.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
      uid, type: 'mockup_ai', amount: -PRICE_USD, balanceAfter: newBalance,
      description: 'Génération de mockup IA', relatedId: null
    }));
    return { type: 'paid', freeRemaining: 0, balance: newBalance };
  });
}

// Annule exactement la charge ci-dessus si la génération échoue derrière.
async function refundCharge(uid, charge) {
  const userRef = db.collection('users').doc(uid);
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) return;
      const data = snap.data();
      if (charge.type === 'free') {
        tx.update(userRef, { mockupFreeUsed: admin.firestore.FieldValue.increment(-1) });
      } else {
        const balance = data.balance || 0;
        const newBalance = roundMoney(balance + PRICE_USD);
        tx.update(userRef, { balance: newBalance });
        tx.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
          uid, type: 'mockup_ai_refund', amount: PRICE_USD, balanceAfter: newBalance,
          description: 'Remboursement : génération IA échouée', relatedId: null
        }));
      }
    });
  } catch (e) {
    console.error('[generate-mockup] Échec du remboursement pour', uid, e.message);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });

  let caller, charge;
  try {
    caller = await verifyCaller(req);
    await enforceRateLimit({ scope: 'generate_mockup', id: caller.uid, limit: 8, windowSec: 3600 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new UserError("La génération IA n'est pas encore activée sur ce serveur (clé GEMINI_API_KEY manquante). Contacte l'administrateur.");
    }

    const body = getBody(req);
    const base = parseDataUrl(body.baseImage);
    const design = parseDataUrl(body.designImage);
    if (!base || !design) {
      throw new UserError('Photo du produit ou design manquant ou trop volumineux (réduis la taille des images et réessaie).');
    }
    const placementHint = typeof body.placementHint === 'string' ? body.placementHint.slice(0, 200) : '';

    // Débit (gratuit ou payant) AVANT l'appel IA -- remboursé automatiquement
    // plus bas si la génération échoue.
    charge = await chargeForGeneration(caller.uid);

    const model = process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL;
    const prompt =
      "You are a professional product photographer and mockup compositor. " +
      "The FIRST image is a blank product photo (packaging, apparel, bag...). " +
      "The SECOND image is a design/logo/artwork to apply onto that product. " +
      "Composite the second image onto the product from the first image as if it had been printed, embroidered or engraved there originally at the factory — matching the product's exact lighting, shadows, fabric folds, surface curvature, perspective and color grading. " +
      (placementHint ? `Placement instructions: ${placementHint}. ` : '') +
      "Keep everything else in the original photo unchanged. Do not add any watermark, text, or logo that wasn't in the design. " +
      "Output one single photorealistic, high-resolution product photography image.";

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;
    const geminiRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: base.mimeType, data: base.data } },
            { inlineData: { mimeType: design.mimeType, data: design.data } }
          ]
        }],
        generationConfig: { responseModalities: ['IMAGE'] }
      })
    });

    const data = await geminiRes.json();
    if (!geminiRes.ok) {
      const msg = (data && data.error && data.error.message) || `Erreur Gemini (${geminiRes.status})`;
      throw new UserError(`Génération impossible : ${msg}`);
    }

    const parts = (((data.candidates || [])[0] || {}).content || {}).parts || [];
    const imagePart = parts.find((p) => p.inlineData && p.inlineData.data);
    if (!imagePart) {
      throw new UserError("L'IA n'a pas renvoyé d'image. Réessaie, ou change légèrement le design/la photo.");
    }

    return res.status(200).json({
      success: true,
      imageDataUrl: `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`,
      billing: charge
    });
  } catch (err) {
    // Si on avait déjà débité (gratuit ou payant) avant que l'échec
    // n'arrive, on rembourse -- jamais facturer un résultat non livré.
    if (caller && charge) await refundCharge(caller.uid, charge);
    return sendError(res, err, 'generate-mockup');
  }
};
