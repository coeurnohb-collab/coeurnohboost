// middleware.js (à la racine, à côté de script.js) : noms de domaine personnalisés des sites (ex. ceciana.com).
// Quand un visiteur ouvre un nom de domaine de site, la page du site est servie à la racine de ce domaine, sans « /s/… ».
// Le site coeurnohuniverse.com (et les adresses vercel.app) ne sont JAMAIS touchés : la fonction rend la main tout de suite.
// En cas de moindre doute ou d'erreur, la requête continue normalement (le site ne tombe jamais à cause de ce fichier).

const MAIN = /(^|\.)(coeurnohuniverse\.com|vercel\.app|localhost)$/i;

export const config = {
  matcher: ['/', '/produit/:p', '/service/:p', '/article/:p', '/sitemap.xml', '/robots.txt', '/manifest.webmanifest', '/sw.js', '/site-icon-192.png', '/site-icon-512.png', '/site-icon-180.png', '/site-icon-maskable.png']
};

function pass() { return new Response(null, { headers: { 'x-middleware-next': '1' } }); }

export default function middleware(request) {
  try {
    const url = new URL(request.url);
    const host = String(request.headers.get('host') || url.hostname || '').toLowerCase().replace(/:\d+$/, '');
    if (!host || MAIN.test(host) || (request.method !== 'GET' && request.method !== 'HEAD')) return pass();
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const q = new URLSearchParams();
    q.set('host', host);
    const m = /^\/(produit|service|article)\/([a-z0-9-]{1,70})$/.exec(path);
    if (path === '/') { /* page d'accueil du site */ }
    else if (m) { q.set('detail', m[1]); q.set('item', m[2]); }
    else if (path === '/sitemap.xml') q.set('sitemap', 'site');
    else if (path === '/robots.txt') q.set('robots', '1');
    else if (path === '/manifest.webmanifest') q.set('manifest', '1');
    else if (path === '/sw.js') q.set('sw', '1');
    else if (/^\/site-icon-(192|512|180|maskable)\.png$/.test(path)) q.set('icon', path.replace(/^\/site-icon-|\.png$/g, ''));
    else return pass();
    ['fresh', 'espace'].forEach((k) => { if (url.searchParams.has(k)) q.set(k, url.searchParams.get(k) || '1'); });
    return new Response(null, { headers: { 'x-middleware-rewrite': new URL('/api/render-site?' + q.toString(), request.url).toString() } });
  } catch (e) {
    return pass();
  }
}
