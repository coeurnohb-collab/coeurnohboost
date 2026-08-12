// Correspondance service coeurnohboost <-> ID MoreThanPanel
//
// Pour remplir : connecte-toi sur MoreThanPanel, va dans Services,
// trouve le service correspondant, note son numero ID, et remplace
// le "null" correspondant ci-dessous par ce numero.
//
// Tant qu'un ID est "null", la commande reste en attente pour un
// traitement manuel - rien ne casse.

module.exports = {
  tiktok:    { followers: null, likes: null, views: null, comments: null, shares: null },
  instagram: { followers: null, likes: null, views: null, comments: null },
  youtube:   { views: null, followers: null, likes: null },
  facebook:  { followers: null, likes: null, views: null, shares: null },
  twitter:   { followers: null, likes: null, shares: null, views: null },
  telegram:  { followers: null, views: null },
  whatsapp:  { followers: null, views: null },
  snapchat:  { followers: null, views: null },
  linkedin:  { followers: null, likes: null },
  pinterest: { followers: null, repins: null },
  twitch:    { followers: null, views: null },
  spotify:   { views: null, followers: null },
  discord:   { followers: null },
  threads:   { followers: null, likes: null },
  kwai:      { followers: null, likes: null, views: null },
  likee:     { followers: null, likes: null, views: null },
  reddit:    { followers: null, likes: null },
  soundcloud:{ views: null, followers: null, likes: null }
};
