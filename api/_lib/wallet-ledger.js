// api/_lib/wallet-ledger.js
// Construit une ligne du relevé "wallet_transactions". Ce fichier n'est PAS
// une fonction serverless (il est dans /_lib, ignore par Vercel pour le
// compte des 12 fonctions du plan gratuit) -- juste un helper partage pour
// eviter de dupliquer la meme structure dans chaque fichier api/*.js qui
// touche au solde.
//
// Le "portefeuille" reste "users/{uid}.balance" (source unique de verite).
// "wallet_transactions" n'est qu'un historique lisible, ecrit TOUJOURS dans
// la MEME transaction Firestore que la modification du solde -- jamais
// separement, pour qu'il ne puisse jamais se desynchroniser.
//
// Usage dans un fichier api/*.js existant, a l'interieur d'un
// db.runTransaction(async (transaction) => { ... }) :
//   const { buildWalletTxEntry } = require('./_lib/wallet-ledger');
//   transaction.set(db.collection('wallet_transactions').doc(), buildWalletTxEntry({
//     uid, type: 'contest_entry', amount: -entryFee, balanceAfter: newBuyerBalance,
//     description: `Participation à "${contest.title}"`, relatedId: contestId
//   }));

function buildWalletTxEntry({ uid, type, amount, balanceAfter, description, relatedId }) {
  return {
    uid,
    type,
    amount: Math.round((amount || 0) * 100) / 100,
    balanceAfter: Math.round((balanceAfter || 0) * 100) / 100,
    description: description || '',
    relatedId: relatedId || null,
    createdAt: new Date().toISOString()
  };
}

module.exports = { buildWalletTxEntry };
