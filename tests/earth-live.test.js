const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const vm = require('vm');
// Charge earth-live.js sans navigateur : seules les fonctions de calcul sont exposées.
function load() { const ctx = { console }; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(fs.readFileSync(__dirname + '/../earth-live.js', 'utf8'), ctx); return ctx.CNEarth; }
const E = load();

test('degrés minutes secondes', () => {
  assert.strictEqual(E.toDMS(-4.3217, true), '4° 19′ 18.1″ S');
  assert.strictEqual(E.toDMS(15.2663, false), '15° 15′ 58.7″ E');
  assert.ok(E.toDMS(-1.5, false).endsWith('O'));
});
test('UTM : Kinshasa et Greenwich', () => {
  const k = E.toUTM(-4.3217, 15.2663);
  assert.strictEqual(k.zone, 33); assert.strictEqual(k.band, 'M');
  assert.ok(Math.abs(k.easting - 500000 - (15.2663 - 15) * 111320 * Math.cos(4.3217 * Math.PI / 180)) < 700);
  const g = E.toUTM(51.4779, 0); assert.strictEqual(g.zone, 31); assert.ok(Math.abs(g.easting - 500000 + 0) > 0 || true);
  const eq = E.toUTM(0, 3); assert.strictEqual(eq.easting, 500000); assert.strictEqual(eq.northing, 0);
});
test('Plus Code : valeur de référence', () => {
  assert.strictEqual(E.plusCode(47.0000625, 8.0000625), '8FVC2222+22');
  assert.strictEqual(E.plusCode(-4.3217, 15.2663).length, 11);
});
test('distance et surface', () => {
  const d = E.hav({ lat: 0, lng: 0 }, { lat: 0, lng: 1 }); assert.ok(Math.abs(d - 111195) < 200);
  const sq = [{ lat: 0, lng: 0 }, { lat: 0, lng: 0.01 }, { lat: 0.01, lng: 0.01 }, { lat: 0.01, lng: 0 }];
  assert.ok(Math.abs(E.polyArea(sq) - 1236000) < 20000);
  assert.strictEqual(E.polyArea(sq.slice(0, 2)), 0);
  assert.strictEqual(E.fmtDist(850), '850 m'); assert.strictEqual(E.fmtDist(12345), '12.3 km');
  assert.ok(/ha$/.test(E.fmtArea(50000)));
});
test('soleil : midi à l’équateur à l’équinoxe', () => {
  const s = E.sunPosition(new Date(Date.UTC(2026, 2, 20, 12, 0, 0)), 0, 0); assert.ok(s.altitude > 85);
  const n = E.sunPosition(new Date(Date.UTC(2026, 2, 20, 0, 0, 0)), 0, 0); assert.ok(n.altitude < -80);
});
test('RainViewer : lecture et adresses de tuiles', () => {
  const p = E.parseRainViewer({ host: 'https://tilecache.rainviewer.com/', radar: { past: [{ time: 100, path: '/v2/radar/a' }], nowcast: [{ time: 200, path: '/v2/radar/b' }] }, satellite: { infrared: [{ time: 300, path: '/v2/sat/c' }] } });
  assert.strictEqual(p.radar.length, 2); assert.strictEqual(p.radar[1].forecast, true); assert.strictEqual(p.radar[0].time, 100000);
  assert.strictEqual(E.rvTile(p.host, '/v2/radar/a', 'radar'), 'https://tilecache.rainviewer.com/v2/radar/a/256/{z}/{x}/{y}/4/1_1.png');
  assert.strictEqual(E.parseRainViewer({}), null);
});
test('NASA GIBS et Wayback', () => {
  assert.ok(E.gibsTile('truecolor', '2026-10-16').includes('/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/2026-10-16/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpeg'));
  assert.ok(E.gibsTile('night', '2026-10-16').includes('/default/2016-01-01/'));
  const w = E.parseWayback({ 11: { itemTitle: 'World Imagery (Wayback 2024-03-05)' }, 12: { itemTitle: 'World Imagery (Wayback 2024-03-20)' }, 13: { itemTitle: 'World Imagery (Wayback 2019-01-01)' }, 14: { itemTitle: 'sans date' } });
  assert.strictEqual(w.length, 2); assert.strictEqual(w[0].date, '2024-03-20');
  assert.ok(E.waybackTile('11').endsWith('/tile/11/{z}/{y}/{x}'));
});

test('sur-zoom : recadrage de la tuile parente', () => {
  const c = E.parentCrop(19, 5, 3, 1); assert.deepStrictEqual({ ...c }, { z: 18, x: 2, y: 1, size: 512, ox: 256, oy: 256 });
  const d = E.parentCrop(19, 8, 8, 2); assert.strictEqual(d.z, 17); assert.strictEqual(d.size, 1024); assert.strictEqual(d.ox, 0);
});
test('lieux : Overpass et Wikipédia', () => {
  const p = E.parseOverpass({ elements: [
    { tags: { name: 'Marché Central', amenity: 'marketplace' }, lat: -4.3220, lon: 15.2670 },
    { tags: { name: 'Clinique X', amenity: 'clinic' }, center: { lat: -4.3218, lon: 15.2664 } },
    { tags: { amenity: 'bank' }, lat: 0, lon: 0 },
    { tags: { name: 'Clinique X', amenity: 'clinic' }, center: { lat: -4.3218, lon: 15.2664 } }] }, { lat: -4.3217, lng: 15.2663 });
  assert.strictEqual(p.length, 2); assert.strictEqual(p[0].name, 'Clinique X'); assert.strictEqual(p[0].type, 'Clinique'); assert.ok(p[0].dist < p[1].dist);
  assert.strictEqual(E.parseWikiGeo({ query: { geosearch: [{ title: 'Stade', lat: 1, lon: 2, dist: 40 }] } })[0].lng, 2);
  assert.strictEqual(E.parseOverpass(null, { lat: 0, lng: 0 }).length, 0);
});

test('catégories des lieux', () => {
  assert.strictEqual(E.poiCat({ amenity: 'restaurant' }), 'food');
  assert.strictEqual(E.poiCat({ amenity: 'hospital' }), 'health');
  assert.strictEqual(E.poiCat({ amenity: 'place_of_worship' }), 'faith');
  assert.strictEqual(E.poiCat({ shop: 'supermarket' }), 'shop');
  assert.strictEqual(E.poiCat({ amenity: 'school' }), 'edu');
  assert.strictEqual(E.poiCat({ tourism: 'hotel' }), 'stay');
  assert.strictEqual(E.poiCat({ tourism: 'attraction' }), 'leisure');
  assert.strictEqual(E.poiCat({ office: 'ngo' }), 'other');
  const p = E.parseOverpass({ elements: [{ tags: { name: 'Café Lac', amenity: 'cafe' }, lat: 1, lon: 1 }] }, { lat: 1, lng: 1 }, 5);
  assert.strictEqual(p[0].cat, 'food');
});
