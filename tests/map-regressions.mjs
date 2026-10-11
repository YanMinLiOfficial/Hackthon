import assert from 'node:assert/strict';
import { build } from 'esbuild';

async function bundle(entry, plugins = []) {
  const result = await build({
    entryPoints: [entry], bundle: true, write: false, format: 'esm', jsx: 'automatic',
    loader: { '.svg': 'dataurl', '.png': 'dataurl' }, define: { 'import.meta.env': '{}' }, plugins,
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}

const { migrateStoredData } = await bundle('src/store/migrate.ts');
const { STORAGE_VERSION } = await bundle('src/app/config/storage.ts');
const { buildSeedData } = await bundle('src/data/seed.ts');
const { matchesCampusPoi, AMAP_PLACE_QUERIES } = await bundle('src/app/config/map.ts');
assert.equal(matchesCampusPoi('南方科技大学-第三科研楼', '南方科技大学第三科研楼'), true);
assert.equal(matchesCampusPoi('南方科技大学', '南方科技大学第三科研楼'), false);
assert.equal(matchesCampusPoi('第三科研楼', '南方科技大学工学院'), false);
const seed = buildSeedData();
const legacy = structuredClone(seed);
legacy.preferences.largeText = true;
legacy.pointRecords.push({ id: 'user-record', delta: 42 });
legacy.places[0].coordinates.x = 99;
for (const place of legacy.places) {
  delete place.coordinates.lat;
  delete place.coordinates.lng;
}
legacy.places.push({ ...seed.places[0], id: 'custom-place', coordinates: { x: 1, y: 2 } });
const migrated = migrateStoredData(legacy, seed);
const oldPhotos = structuredClone(seed);
oldPhotos.posts[0].images = ['/src/assets/photo-ramp-occupied.svg', 'data:image/png;base64,user-photo'];
oldPhotos.observations[0].photo = '/assets/photo-ramp-occupied-abc123.svg';
const updatedPhotos = migrateStoredData(oldPhotos, seed);
assert.equal(updatedPhotos.posts[0].images[0], seed.posts[0].images[0]);
assert.equal(updatedPhotos.posts[0].images[1], 'data:image/png;base64,user-photo');
assert.equal(updatedPhotos.observations[0].photo, seed.observations[0].photo);
assert.equal(migrated.schemaVersion, STORAGE_VERSION);
assert.equal(migrated.places[0].coordinates.x, 99);
assert.equal(migrated.preferences.largeText, true);
assert.equal(migrated.pointRecords.at(-1).id, 'user-record');
assert.equal(migrated.places.at(-1).coordinates.lat, undefined);
assert.ok(migrated.places.slice(0, 5).every((p) => Number.isFinite(p.coordinates.lat) && Number.isFinite(p.coordinates.lng)));
assert.deepEqual(migrateStoredData(migrated, seed), migrated);
assert.equal(migrateStoredData(null, seed), seed);
const custom = structuredClone(seed);
custom.places[0].coordinates = { x: 1, y: 2, lat: 22.6, lng: 114 };
assert.equal(migrateStoredData(custom, seed).places[0].coordinates.lng, 114);
const beforeTestSeed = structuredClone(seed);
beforeTestSeed.places = beforeTestSeed.places.filter((place) => place.id !== 'place-canteen-2-test');
beforeTestSeed.observations = beforeTestSeed.observations.filter((item) => item.id !== 'obs-canteen-2-test');
beforeTestSeed.posts = beforeTestSeed.posts.filter((post) => post.id !== 'post-canteen-2-test');
beforeTestSeed.timeline = beforeTestSeed.timeline.filter((event) => event.id !== 'tl-canteen-2-test');
const migratedTestSeed = migrateStoredData(beforeTestSeed, seed);
assert.equal(migratedTestSeed.places.filter((place) => place.id === 'place-canteen-2-test').length, 1);
assert.equal(migratedTestSeed.observations.filter((item) => item.id === 'obs-canteen-2-test').length, 1);
assert.deepEqual(migrateStoredData(migratedTestSeed, seed), migratedTestSeed, 'v5 test-data migration must be idempotent');
const oldLandmarks = structuredClone(seed);
oldLandmarks.places[0].name = '图书馆东门';
oldLandmarks.places[0].coordinates.lng = 113.99337;
oldLandmarks.places[0].coordinates.lat = 22.59796;
const updatedLandmarks = migrateStoredData(oldLandmarks, seed);
assert.equal(updatedLandmarks.places[0].name, '工学院');
assert.equal(updatedLandmarks.places[0].coordinates.lng, 113.996072);
console.log('PASS: legacy migration preserves user data and valid coordinates; migration is idempotent.');

// A minimal hook runner exercises the real component with a deliberately delayed SDK.
const slots = [];
let cursor = 0;
let pending = [];
let dirty = false;
const container = { addEventListener() {}, removeEventListener() {} };
globalThis.__mapHooks = {
  useMemo(factory) { return factory(); },
  useRef(initial) {
    const index = cursor++;
    return slots[index] ??= { current: index === 0 ? container : initial };
  },
  useState(initial) {
    const index = cursor++;
    slots[index] ??= { value: typeof initial === 'function' ? initial() : initial };
    return [slots[index].value, (value) => {
      const next = typeof value === 'function' ? value(slots[index].value) : value;
      if (slots[index].value !== next) { slots[index].value = next; dirty = true; }
    }];
  },
  useEffect(callback, deps) {
    const index = cursor++;
    const previous = slots[index];
    if (!previous || deps.some((dep, i) => dep !== previous.deps[i])) {
      pending.push(() => {
        previous?.cleanup?.();
        slots[index] = { deps, cleanup: callback() };
      });
    }
  },
};
const plugins = [{ name: 'hook-mocks', setup(api) {
  api.onResolve({ filter: /^react(?:\/jsx-runtime)?$/ }, (args) => ({ path: args.path, namespace: 'mock' }));
  api.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents:
    'export const {useRef,useState,useEffect,useMemo}=globalThis.__mapHooks; export const jsx=()=>null,jsxs=jsx; export default {createElement:jsx};', loader: 'js' }));
  api.onLoad({ filter: /TempCampusMap\.tsx$/ }, () => ({ contents: 'export const TempCampusMap=()=>null;', loader: 'js' }));
} }];
let script;
const instances = [];
globalThis.window = { setTimeout, clearTimeout, localStorage: { getItem: () => null, setItem() {} } };
globalThis.document = {
  createElement: () => (script = {}), head: { appendChild() {} },
};
const { AmapCampusMap } = await bundle('src/features/journey/components/AmapCampusMap.tsx', plugins);
const props = { markers: seed.places.map((p) => ({ placeId: p.id, name: p.name, status: p.currentStatus, ...p.coordinates })), onSelectPlace() {} };
function render() {
  cursor = 0; dirty = false; AmapCampusMap(props);
  const effects = pending; pending = []; effects.forEach((effect) => effect());
}
function unmount() { slots.forEach((slot) => slot?.cleanup?.()); }
render();
assert.equal(instances.length, 0);
window.AMap = {
  Map: class {
    events = {}; markers = []; fitCount = 0;
    constructor() { instances.push(this); }
    on(event, cb) { this.events[event] = cb; }
    add(marker) { this.markers.push(marker); }
    remove(marker) { this.markers = this.markers.filter((m) => m !== marker); }
    setFitView() { this.fitCount++; }
    setZoomAndCenter() { this.fitCount++; }
    destroy() { this.destroyed = true; this.markers = []; }
  },
  Marker: class { constructor(options) { Object.assign(this, options); } },
  Pixel: class { constructor(x, y) { this.x = x; this.y = y; } },
  plugin(name, ready) { ready(); },
  PlaceSearch: class {
    search(query, done) {
      const place = seed.places.find((p) => AMAP_PLACE_QUERIES[p.id].includes(query));
      done('complete', { info: 'OK', poiList: { pois: [
        { id: 'wrong-nearest', name: '南方科技大学', location: { lng: 113.99685, lat: 22.6036 } },
        { id: place.id, name: query, location: place.coordinates },
      ] } });
    }
  },
};
script.onload();
await Promise.resolve(); await Promise.resolve();
const map = instances[0];
assert.equal(map.markers.length, 0);
map.events.complete();
assert.equal(dirty, true);
render();
assert.equal(map.markers.length, 1, 'user-selected seed point appears while predefined POIs are still resolving');
for (let tick = 0; tick < 20; tick++) await Promise.resolve();
render();
assert.equal(map.markers.length, 6);
assert.equal(map.markers[0].anchor, 'top-center', 'badge center must align with the POI, not the bottom of its label');
assert.equal(map.markers[0].offset.y, -15);
assert.equal(map.fitCount, 2);
props.markers = props.markers.map((marker) => ({ ...marker }));
render();
assert.equal(map.markers.length, 6);
assert.equal(map.fitCount, 2);
props.markers = [...props.markers, { placeId: 'custom-10', name: '10栋 <测试>', status: 'pending', x: 50, y: 50, lng: 113.997, lat: 22.6 }];
render();
assert.equal(map.markers.length, 7, 'user-selected places must appear without a predefined POI query');
assert.ok(map.markers.at(-1).content.includes('10栋 &lt;测试&gt;'));
props.markers = props.markers.map((marker, index) => ({ ...marker, hidden: index !== 0,
  showInspection: false, visibleFacilities: ['accessible_restroom', 'elevator'] }));
render();
assert.equal(map.markers.length, 1);
assert.ok(map.markers[0].content.includes('WC'));
assert.ok(map.markers[0].content.includes('无障碍电梯'));
props.markers = props.markers.map((marker) => ({ ...marker, hidden: true }));
render();
assert.equal(map.markers.length, 0);
unmount();
assert.equal(map.destroyed, true);
dirty = false;
map.events.complete();
assert.equal(dirty, false);
console.log('PASS: delayed SDK creates six markers on readiness; updates preserve markers and viewport; late callbacks are ignored.');
delete globalThis.__mapHooks;
