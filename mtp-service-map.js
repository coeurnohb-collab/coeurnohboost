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
//
// NOTE IMPORTANTE : pour la plupart des services ci-dessous, une seule
// offre MoreThanPanel a ete confirmee dans les captures fournies (pas
// 3 niveaux distincts). Dans ces cas, le MEME ID est utilise pour
// standard/premium/vip (commentaire "meme ID x3") afin d'activer
// l'automatisation tout de suite. Consequence : payer Premium ou VIP
// ne changera rien a la qualite reelle tant qu'on n'aura pas trouve
// 2 offres superieures pour ce service precis chez MoreThanPanel.
// Remplace ces "meme ID x3" par de vrais 3 niveaux des que possible.

module.exports = {
  tiktok: {
    followers: { standard: 9854, premium: 5760, vip: 2560 }, // 3 vrais niveaux : No Refill $1.14 / 30j Refill $2.05 / 30j Refill UHQ $5.99
    likes:     { standard: 5737, premium: 2563, vip: 7722 }, // 3 vrais niveaux : Real 30j Refill $0.51 / 30j Refill Low Drop $1.24 / Real UHQ $11.89
    views:     { standard: 9743, premium: 9742, vip: 9744 }, // 3 vrais niveaux : Monetizable $0.03 / Real 30j Refill $0.14 / Views SEO Retention $0.51
    comments:  { standard: 9848, premium: 9847, vip: 3656 }, // NOUVEAU — 3 vrais niveaux : Custom Speed 1-5K/Day $4.80 / Random Speed 100-500/Day $5.19 / Random 30j Refill Speed 100-1K/Day $14.07
    shares:    { standard: 5026, premium: 2572, vip: 7724 }  // 3 vrais niveaux : No Refill $0.11 / 30j Refill UHQ $0.25 / 30j Refill $0.29
  },
  instagram: {
    followers: { standard: 5787, premium: 9751, vip: 7961 }, // 3 vrais niveaux : Flag Not Important $1.38 / Lifetime Guaranteed $1.82 / VIP 30j Refill $2.18
    likes:     { standard: 2518, premium: 9764, vip: 8086 }, // 3 vrais niveaux : Premium 30j Refill $0.29 / 30j Refill Old Accounts $0.44 / Real UHQ $0.66
    views:     { standard: 9749, premium: 2523, vip: 2524 }, // 3 vrais niveaux : Real 30j Refill Drip-Feed $0.02 / Real 30j Refill $0.03 / Real Lifetime Guaranteed $0.05
    comments:  { standard: 6226, premium: 6227, vip: 6227 }  // NOUVEAU — 2 niveaux trouves (Auto Comments) : Auto Random Comments $7.32 / Auto Emoji Comments $8.13 (aucune 3e option plus chere trouvee)
  },
  youtube: {
    views:     { standard: 9681, premium: 8121, vip: 9662 }, // 3 vrais niveaux : Native Ads Lifetime Guaranteed $1.82 / Algorithm Boost Lifetime Guaranteed $2.03 / Real Video 60j Refill Drip-Feed $2.90
    followers: { standard: 2386, premium: 8355, vip: 9882 }, // 3 vrais niveaux : No Refill $0.72 / 30j Refill Low Drop $20.15 / 30j Refill Speed 50-150/Day $31.73
    likes:     { standard: 9539, premium: 9538, vip: 918 },  // NOUVEAU — enfin de vraies Likes video (pas Comment Likes) : 30j Refill Speed 10-20K/Day $1.39 / Lifetime Guaranteed $1.77 / 30j Refill Speed 1-5K/Day $3.53
    watchtime: { standard: 8866, premium: 7479, vip: 7481 }  // NOUVEAU — 3 vrais niveaux trouves : WatchTime Views 30j Refill 60-70Min+ $26.40 / WatchTime Hours Views From Ads 60Min+ $50.75 / WatchTime Hours 15Min+ $72.50
  },
  facebook: {
    followers: { standard: 4138, premium: 9059, vip: 4139 }, // 3 vrais niveaux : No Refill $0.18 / 30j Refill Drip-Feed $0.51 / Profile 30j Refill Speed 10-20K/Day $0.87
    likes:     { standard: 9787, premium: 7101, vip: 7100 }, // NOUVEAU — 3 vrais niveaux trouves : Post Likes 30j Refill Old Accounts $0.51 / Speed 5-10K/Day $0.58 / 30j Refill Speed 10-100K/Day $0.73
    views:     { standard: 9798, premium: 7347, vip: 7069 }, // 3 vrais niveaux : Video Views Lifetime Refill $0.16 / Video/Reel 10 Secondes $3.72 / Video/Reel 600 Secondes $16.20
    shares:    { standard: 9318, premium: 9318, vip: 9318 }  // meme ID x3 — achat $0.75/1000 (Split Delivery) — aucune autre offre trouvee
  },
  twitter: {
    followers: { standard: 2596, premium: 2596, vip: 2596 }, // meme ID x3 — achat $4.35/1000
    likes:     { standard: 5802, premium: 5802, vip: 5802 }, // meme ID x3 — achat $4.35/1000
    shares:    { standard: 1604, premium: 3308, vip: 5288 }, // 3 vrais niveaux : Retweets No Refill $1.19 / Refill 7j $2.89 / Organic UHQ $7.25
    views:     { standard: 8863, premium: 8864, vip: 8865 }  // 3 vrais niveaux : simple $0.01 / Refill 30j $0.02 / Lifetime Guaranteed $0.03
  },
  telegram: {
    followers: { standard: 3521, premium: 3521, vip: 3521 }, // meme ID x3 — achat $2.60/1000
    views:     { standard: 2951, premium: 2951, vip: 2951 }  // meme ID x3 — achat $0.15/1000 ("Last 50 Post")
  },
  whatsapp: {
    followers: { standard: 4885, premium: 4885, vip: 4885 }, // meme ID x3 — achat $16.68/1000
    views:     { standard: null, premium: null, vip: null }  // aucun ID confirme
  },
  snapchat: {
    followers: { standard: 8384, premium: 8384, vip: 8384 }, // meme ID x3 — achat $16.38/1000
    views:     { standard: 8393, premium: 8394, vip: 8396 }  // NOUVEAU — 3 vrais niveaux (Story Views) : First 5 Stories $23.39 / All Stories $33.91 / Send Story to Friend $49.92
  },
  linkedin: {
    followers: { standard: 5467, premium: 9109, vip: 9110 }, // 3 niveaux : Page Followers UHQ $21.75 / Profile 30j Refill Speed 250-1K/Day $29.00 / Company 30j Refill $29.00 (2 dernieres offres au meme prix — aucune 3e option plus chere trouvee)
    likes:     { standard: 5472, premium: 9417, vip: 9417 }  // 2 niveaux : Post Likes UHQ $11.60 / 30j Refill Speed 200-500/Day $21.75 (aucune 3e option plus chere trouvee)
  },
  pinterest: {
    followers: { standard: 2922, premium: 2922, vip: 2922 }, // meme ID x3 — achat $16.68/1000
    repins:    { standard: null, premium: null, vip: null }  // aucun ID confirme
  },
  twitch: {
    followers: { standard: 7189, premium: 7189, vip: 7189 }, // meme ID x3 — achat $0.14/1000
    views:     { standard: null, premium: null, vip: null }  // aucun ID confirme
  },
  spotify: {
    views:     { standard: 2549, premium: 2547, vip: 4978 }, // 3 vrais niveaux : Track Plays Global Lifetime Guaranteed $0.59 / Advance Track Plays Global 30j Refill $0.69 / Advance Track Plays USA $0.79
    followers: { standard: 4502, premium: 4502, vip: 4502 }  // meme ID x3 — achat $0.20/1000 — aucune autre offre trouvee
  },
  discord: {
    followers: { standard: 7344, premium: 7344, vip: 7344 }  // meme ID x3 — achat $1.81/1000
  },
  threads: {
    followers: { standard: 2775, premium: 2775, vip: 2775 }, // meme ID x3 — achat $19.58/1000
    likes:     { standard: 2776, premium: 2776, vip: 2776 }  // meme ID x3 — achat $11.24/1000
  },
  kwai: {
    followers: { standard: 9612, premium: 9612, vip: 9612 }, // meme ID x3 — achat $0.45/1000
    likes:     { standard: 9614, premium: 9614, vip: 9614 }, // meme ID x3 — achat $0.22/1000
    views:     { standard: null, premium: null, vip: null }  // aucun ID confirme
  },
  likee: {
    // ⚠️ LIKEE N'A PAS D'ID CHEZ MORETHANPANEL — ce reseau n'est vendu par aucun
    // fournisseur confirme pour l'instant. Reste en traitement manuel tant qu'un
    // fournisseur alternatif n'est pas trouve.
    followers: { standard: null, premium: null, vip: null },
    likes:     { standard: null, premium: null, vip: null },
    views:     { standard: null, premium: null, vip: null }
  },
  reddit: {
    followers: { standard: 8039, premium: 8038, vip: 2875 }, // 3 niveaux : Profile Followers 30j Refill $2.40 / Channel Subscribers 30j Refill $2.40 (meme prix, ID different) / Real Followers UHQ $106.36
    likes:     { standard: 7339, premium: 7339, vip: 2874 }  // 2 niveaux : Upvotes UHQ $13.05 / Comment Upvotes Old Accounts $72.00 (aucune 2e option Upvotes classique trouvee)
  },
  soundcloud: {
    views:     { standard: 9910, premium: 9910, vip: 9910 }, // meme ID x3 — achat $1.00/1000
    followers: { standard: 2198, premium: 2198, vip: 2198 }, // meme ID x3 — achat $12.42/1000
    likes:     { standard: 2205, premium: 2205, vip: 2205 }  // meme ID x3 — achat $12.56/1000
  }
};
