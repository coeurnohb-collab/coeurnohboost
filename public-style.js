// api/_lib/public-style.js
// Feuille de style commune des pages publiques servies par le serveur (services, aide, guide d'utilisation).
// Même univers visuel que la page d'accueil de l'application : fond pierre claire, surfaces d'un vrai blanc façon miroir,
// titres à empattements (Lora), textes en Inter, couleurs unies (aucun dégradé). Module partagé (pas une fonction Vercel).
'use strict';

const FONTS = `@font-face{font-family:'CN Inter';font-style:normal;font-weight:400;font-display:swap;src:url(/cn-inter-400.woff2) format('woff2')}
@font-face{font-family:'CN Inter';font-style:normal;font-weight:500;font-display:swap;src:url(/cn-inter-500.woff2) format('woff2')}
@font-face{font-family:'CN Inter';font-style:normal;font-weight:600 900;font-display:swap;src:url(/cn-inter-600.woff2) format('woff2')}
@font-face{font-family:'CN Serif';font-style:normal;font-weight:400 700;font-display:swap;src:url(/cn-serif.woff2) format('woff2')}
@font-face{font-family:'CN Serif';font-style:italic;font-weight:400 700;font-display:swap;src:url(/cn-serif-italic.woff2) format('woff2')}`;

const PUBLIC_CSS = FONTS + `
:root{--bg:#f4f5f7;--stone:#ebecee;--card:#fff;--ink:#141a26;--ink2:#454e60;--line:#dadde3;--line2:#c3c9d3;--accent:#1d4ed8;--mark:#f39c1f;--navy:#223350;--sand:#eef0f3;--ok:#2f7d57;--mirror:inset 0 1px 0 #fff,0 1px 2px rgba(16,24,40,.05),0 14px 30px -20px rgba(16,24,40,.30);--serif:'CN Serif',Georgia,'Times New Roman',serif;--sans:'CN Inter',-apple-system,'Segoe UI',Roboto,system-ui,sans-serif;color-scheme:light}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:16px;line-height:1.65;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
a{color:var(--navy)}img{max-width:100%;height:auto}
.wrap{max-width:1040px;margin:0 auto;padding:0 20px}
header.top{background:rgba(255,255,255,.82);-webkit-backdrop-filter:saturate(170%) blur(16px);backdrop-filter:saturate(170%) blur(16px);color:var(--ink);position:sticky;top:0;z-index:5;border-bottom:1px solid var(--line);box-shadow:inset 0 1px 0 #fff}
header.top .wrap{display:flex;align-items:center;gap:14px;min-height:62px}
.brand{display:flex;align-items:center;gap:11px;font-family:var(--serif);font-weight:600;font-size:1.2rem;letter-spacing:-.01em;color:var(--ink);text-decoration:none;margin-right:auto}
.brand img{width:34px;height:34px;border-radius:9px;border:1px solid var(--line)}
.brand em{font-style:italic;font-weight:500;color:var(--accent)}
nav.mainnav{display:none;gap:4px}
nav.mainnav a{color:var(--ink2);text-decoration:none;font-weight:500;font-size:.94rem;padding:8px 12px;border-radius:8px}
nav.mainnav a:hover,nav.mainnav a[aria-current="page"]{color:var(--ink);background:var(--sand)}
.langs{display:flex;gap:2px;align-items:center}
.langs a{color:var(--ink2);text-decoration:none;font-weight:600;font-size:.78rem;padding:6px 8px;border-radius:7px;letter-spacing:.04em}
.langs a[aria-current="true"]{background:var(--navy);color:#fff}
.pill{display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:0 22px;border-radius:12px;background:var(--navy);color:#fff;font-weight:600;text-decoration:none;border:1.5px solid var(--navy);font-size:.95rem;cursor:pointer;font-family:inherit;line-height:1.2;text-align:center}
.pill:hover{background:#16233a}
.pill.ghost{background:transparent;color:var(--ink);border-color:var(--line2)}
.pill.ghost:hover{background:var(--sand)}
header.top .pill{min-height:40px;padding:0 16px;font-size:.88rem;white-space:nowrap}
.pill .sh{display:none}
.hero{background:var(--stone);padding:34px 0 38px;border-bottom:1px solid var(--line)}
.crumbs{font-size:.84rem;color:var(--ink2);margin:0 0 16px}.crumbs a{color:var(--ink2);text-decoration:none;border-bottom:1px solid var(--line)}.crumbs a:hover{color:var(--ink)}
.tag{display:inline-flex;align-items:center;gap:8px;font-size:.72rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--accent)}
.tag:before{content:'';display:block;width:34px;height:2px;background:var(--mark)}
.tag svg{width:16px;height:16px}
h1{font-family:var(--serif);font-weight:600;font-size:clamp(1.9rem,6.2vw,3.05rem);line-height:1.12;letter-spacing:-.018em;margin:14px 0 14px;max-width:20ch}
h1.wide{max-width:26ch}
h1 em{font-style:italic;font-weight:500;color:var(--accent)}
.lead{font-size:1.08rem;color:var(--ink2);margin:0 0 22px;max-width:62ch}
.cta{display:flex;flex-wrap:wrap;gap:10px}
main section{padding:34px 0 6px}
h2{font-family:var(--serif);font-weight:600;font-size:clamp(1.4rem,4.4vw,1.85rem);line-height:1.2;letter-spacing:-.012em;margin:0 0 16px}
h3{font-family:var(--sans);font-weight:600;font-size:1.02rem;line-height:1.3;margin:0 0 6px}
.grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px 20px;box-shadow:var(--mirror)}
.card p{margin:0;color:var(--ink2);font-size:.95rem}
a.card{text-decoration:none;color:inherit;display:block}a.card:hover{border-color:var(--line2)}
.ico{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:11px;background:var(--sand);border:1px solid var(--line);color:var(--navy);margin-bottom:12px}
.ico svg{width:20px;height:20px}
.ico.has-photo{padding:0;overflow:hidden;background:#fff}.ico.has-photo img{display:block;width:100%;height:100%;object-fit:cover}
ol.steps{margin:0;padding:0;list-style:none;counter-reset:s;display:grid;gap:10px}
ol.steps li{counter-increment:s;background:var(--card);border:1px solid var(--line);box-shadow:var(--mirror);border-radius:14px;padding:15px 18px 15px 62px;position:relative}
ol.steps li:before{content:counter(s);position:absolute;left:16px;top:10px;font-family:var(--serif);font-style:italic;font-weight:500;font-size:1.9rem;line-height:1.3;color:var(--accent)}
.trust{display:flex;flex-wrap:wrap;gap:8px 20px;color:var(--ink2);font-size:.88rem;margin-top:18px}
.trust span:before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--mark);margin-right:9px;vertical-align:middle}
details{background:var(--card);border:1px solid var(--line);box-shadow:var(--mirror);border-radius:14px;margin:0 0 10px}
summary{cursor:pointer;padding:15px 18px;font-weight:600;list-style:none}
summary::-webkit-details-marker{display:none}
summary:after{content:'+';float:right;font-weight:500;font-size:1.2rem;line-height:1;color:var(--accent)}
details[open] summary:after{content:'\\2212'}
details p{margin:0;padding:0 18px 16px;color:var(--ink2)}
.links{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(210px,1fr))}
.links a{display:flex;gap:12px;align-items:center;background:var(--card);border:1px solid var(--line);box-shadow:var(--mirror);border-radius:14px;padding:12px 15px;text-decoration:none;color:var(--ink);font-weight:500}
.links a:hover{border-color:var(--line2)}
.links a .ico{margin:0;flex:0 0 auto;width:36px;height:36px}
.band{background:var(--card);color:var(--ink);border:1px solid var(--line);box-shadow:var(--mirror);border-radius:22px;padding:30px 22px;margin:36px 0 10px;text-align:center}
.band h2{margin-bottom:8px}.band p{margin:0 auto 18px;color:var(--ink2);max-width:52ch}
footer.ft{background:var(--card);color:var(--ink2);border-top:1px solid var(--line);padding:34px 0 40px;margin-top:44px;font-size:.88rem}
footer.ft strong{color:var(--ink);font-family:var(--serif);font-weight:600;font-size:1.05rem}
footer.ft a{color:var(--ink);text-decoration:none;margin-right:16px;display:inline-block;padding:4px 0}footer.ft a:hover{color:var(--accent);text-decoration:underline}
footer.ft p{margin:14px 0 0}
/* Guide d'utilisation */
.gp-fig{margin:0}.gp-fig img{display:block;width:100%;height:auto;border-radius:16px;border:1px solid var(--line);background:var(--sand);box-shadow:var(--mirror)}
.gp-fig figcaption{font-size:.84rem;color:var(--ink2);margin-top:8px}
.gp-cols{display:grid;gap:26px}
.gp-shot{margin:0 auto;max-width:300px}.gp-shot img{display:block;width:100%;height:auto;border-radius:30px;border:8px solid #1a2230}
.gp-shot figcaption{text-align:center;font-size:.84rem;color:var(--ink2);margin-top:10px}
.gp-tip{background:var(--card);border:1px solid var(--line);box-shadow:var(--mirror);border-left:4px solid var(--mark);border-radius:12px;padding:14px 18px;margin:16px 0 0}
.gp-tip b{display:block;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin-bottom:4px}
.gp-tip p{margin:0;color:var(--ink2)}
.gp-nav{display:flex;gap:10px;justify-content:space-between;flex-wrap:wrap;margin-top:22px}
.gp-nav a{flex:1 1 220px;display:block;text-decoration:none;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 16px}
.gp-nav a small{display:block;color:var(--ink2);font-size:.78rem;letter-spacing:.06em;text-transform:uppercase}
.gp-nav a span{font-weight:600}
.gp-nav a:last-child{text-align:right}
.gp-topics{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(270px,1fr))}
.gp-topic{display:block;text-decoration:none;color:inherit;background:var(--card);border:1px solid var(--line);box-shadow:var(--mirror);border-radius:16px;overflow:hidden}
.gp-topic:hover{border-color:var(--line2)}
.gp-topic img{display:block;width:100%;height:auto;aspect-ratio:1200/630;background:var(--sand)}
.gp-topic div{padding:14px 18px 18px}.gp-topic p{margin:0;color:var(--ink2);font-size:.92rem}
.gp-topic small{display:block;margin-top:8px;color:var(--accent);font-weight:600;font-size:.78rem}
.gp-gallery{display:grid;gap:22px;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));align-items:start}
@media(min-width:760px){nav.mainnav{display:flex}.hero{padding:54px 0 58px}.gp-cols{grid-template-columns:minmax(0,1fr) 300px;align-items:start}.gp-cols .gp-shot{position:sticky;top:84px;margin:0}}
@media(max-width:520px){.pill .lg{display:none}.pill .sh{display:inline}}
@media(max-width:420px){.langs a{padding:6px 6px}header.top .wrap{gap:8px}.brand{font-size:1.05rem}.brand img{width:30px;height:30px}}
@media(max-width:380px){header.top{position:static}header.top .wrap{flex-wrap:wrap;padding-top:8px;padding-bottom:8px;row-gap:2px}.langs{flex:1 0 100%;justify-content:flex-start;margin-left:-6px}}
`;

module.exports = { PUBLIC_CSS, FONTS };
