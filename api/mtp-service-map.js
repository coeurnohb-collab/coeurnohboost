// Correspondance service coeurnohboost <-> ID MoreThanPanel
// Structure : plateforme > type de service > qualite (standard/premium/vip) > ID MoreThanPanel
//
// Comment lire les captures MoreThanPanel pour choisir les 3 qualites :
// - standard = le service le moins cher (souvent "Non-drop" simple)
// - premium  = un service intermediaire (plus rapide ou meilleure retention)
// - vip      = le service le plus cher / le plus rapide / le plus fiable
//
// Tant qu'un ID est "null", cette combinaison reste en attente pour un
// traitement manuel - rien ne casse.

module.exports = {
  tiktok: {
    followers: { standard: null, premium: null, vip: null },
    likes:     { standard: null, premium: null, vip: null },
    views:     { standard: null, premium: null, vip: null },
    comments:  { standard: null, premium: null, vip: null },
    shares:    { standard: null, premium: null, vip: null }
  },
  instagram: {
    followers: { standard: null, premium: null, vip: null },
    likes:     { standard: null, premium: null, vip: null },
    views:     { standard: null, premium: null, vip: null },
    comments:  { standard: null, premium: null, vip: null }
  },
  youtube: {
    views:     { standard: null, premium: null, vip: null },
    followers: { standard: null, premium: null, vip: null },
    likes:     { standard: null, premium: null, vip: null }
  },
  facebook: {
    followers: { standard: null, premium: null, vip: null },
    likes:     { standard: null, premium: null, vip: null },
    views:     { standard: null, premium: null, vip: null },
    shares:    { standard: null, premium: null, vip: null }
  },
  twitter: {
    followers: { standard: null, premium: null, vip: null },
    likes:     { standard: null, premium: null, vip: null },
    shares:    { standard: null, premium: null, vip: null },
    views:     { standard: null, premium: null, vip: null }
  },
  telegram: {
    followers: { standard: null, premium: null, vip: null },
    views:     { standard: null, premium: null, vip: null }
  },
  whatsapp: {
    followers: { standard: null, premium: null, vip: null },
    views:     { standard: null, premium: null, vip: null }
  },
  snapchat: {
    followers: { standard: null, premium: null, vip: null },
    views:     { standard: null, premium: null, vip: null }
  },
  linkedin: {
    followers: { standard: null, premium: null, vip: null },
    likes:     { standard: null, premium: null, vip: null }
  },
  pinterest: {
    followers: { standard: null, premium: null, vip: null },
    repins:    { standard: null, premium: null, vip: null }
  },
  twitch: {
    followers: { standard: null, premium: null, vip: null },
    views:     { standard: null, premium: null, vip: null }
  },
  spotify: {
    views:     { standard: null, premium: null, vip: null },
    followers: { standard: null, premium: null, vip: null }
  },
  discord: {
    followers: { standard: null, premium: null, vip: null }
  },
  threads: {
    followers: { standard: null, premium: null, vip: null },
    likes:     { standard: null, premium: null, vip: null }
  },
  kwai: {
    followers: { standard: null, premium: null, vip: null },
    likes:     { standard: null, premium: null, vip: null },
    views:     { standard: null, premium: null, vip: null }
  },
  likee: {
    followers: { standard: null, premium: null, vip: null },
    likes:     { standard: null, premium: null, vip: null },
    views:     { standard: null, premium: null, vip: null }
  },
  reddit: {
    followers: { standard: null, premium: null, vip: null },
    likes:     { standard: null, premium: null, vip: null }
  },
  soundcloud: {
    views:     { standard: null, premium: null, vip: null },
    followers: { standard: null, premium: null, vip: null },
    likes:     { standard: null, premium: null, vip: null }
  }
};
