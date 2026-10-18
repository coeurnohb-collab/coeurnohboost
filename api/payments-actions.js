// api/payments-actions.js : point d'entree. La logique est dans api/_lib/payments-core.js.
// Si un fichier du serveur manque ou est invalide, la reponse est un message JSON lisible
// (au lieu d'une page d'erreur serveur), et l'erreur complete est ecrite dans les Logs Vercel.
let core = null;
let loadError = null;
try {
  core = require('./_lib/payments-core');
} catch (e) {
  loadError = e;
  console.error('[payments-actions] chargement impossible :', (e && e.stack) || e);
}

module.exports = async function handler(req, res) {
  if (loadError) {
    const detail = String((loadError && loadError.message) || loadError).split('\n')[0].slice(0, 180);
    return res.status(500).json({ success: false, error: 'Service momentanément indisponible. Détail technique : ' + detail });
  }
  return core(req, res);
};
