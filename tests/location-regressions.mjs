import assert from 'node:assert/strict';
import { build } from 'esbuild';

let slots = [], cursor = 0;
globalThis.__locationHooks = {
  useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
    return [slots[index], (value) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
  },
  useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
  useEffect() {}, useMemo(fn) { return fn(); },
};
const plugins = [{ name: 'location-hooks', setup(api) {
  api.onResolve({ filter: /^react(?:\/jsx-runtime)?$/ }, (args) => ({ path: args.path, namespace: 'mock' }));
  api.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents:
    'export const {useState,useRef,useEffect,useMemo}=globalThis.__locationHooks; export const jsx=(type,props)=>({type,props}),jsxs=jsx,Fragment="fragment"; export default {createElement:jsx};', loader: 'js' }));
  api.onResolve({ filter: /^react-router-dom$/ }, () => ({ path: 'router', namespace: 'router-mock' }));
  api.onLoad({ filter: /.*/, namespace: 'router-mock' }, () => ({ contents:
    "export const Link='a'; export const useSearchParams=()=>[new URLSearchParams()];", loader: 'js' }));
  api.onLoad({ filter: /\/store\/index\.ts$/ }, () => ({ contents: 'export const useAppStore=()=>globalThis.__locationStore;', loader: 'js' }));
} }];
async function bundle(entry) {
  const result = await build({ entryPoints: [entry], bundle: true, write: false, format: 'esm', jsx: 'automatic',
    loader: { '.svg': 'dataurl', '.png': 'dataurl', '.css': 'empty' }, define: { 'import.meta.env': '{}' }, plugins });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
function elements(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(elements);
  return [node, ...elements(node.props?.children)];
}
const { ObservationLocationPicker, isValidObservationLocation } = await bundle('src/features/journey/components/ObservationLocationPicker.tsx');
assert.equal(isValidObservationLocation(NaN, 22.6), false);
assert.equal(isValidObservationLocation(181, 22.6), false);
assert.equal(isValidObservationLocation(113.99, -91), false);
const coordinates = { x: 30, y: 26, lng: 113.996072, lat: 22.60051 };
const before = structuredClone(coordinates);
let chosen;
function picker() { cursor = 0; return elements(ObservationLocationPicker({ coordinates, onConfirm: (value) => { chosen = value; } })); }
let tree = picker();
tree.find((e) => e.type === 'input' && e.props.max === '180').props.onChange({ target: { value: '113.996205' } });
tree = picker();
tree.find((e) => e.type === 'button').props.onClick();
assert.equal(chosen.lng, 113.996205);
assert.deepEqual(coordinates, before);
tree.find((e) => e.type === 'input' && e.props.max === '180').props.onChange({ target: { value: '' } });
tree = picker();
assert.equal(tree.find((e) => e.type === 'button').props.disabled, true);
chosen = undefined;
tree.find((e) => e.type === 'button').props.onClick();
assert.equal(chosen, undefined);

slots = [];
const other = { id: 'other', name: '另一地点', coordinates: { x: 70, y: 50, lng: 113.999, lat: 22.601 } };
const place = { id: 'first', name: '工学院', coordinates };
let published;
globalThis.__locationStore = {
  places: [place, other], currentUser: { name: '测试志愿者' },
  getPlace: (id) => [place, other].find((p) => p.id === id),
  publishObservation: (input) => { published = input; return { placeId: input.placeId }; },
};
globalThis.window = { localStorage: { setItem() {}, removeItem() {} } };
const { PublishPage } = await bundle('src/features/journey/pages/PublishPage.tsx');
function page() { cursor = 0; return elements(PublishPage()); }
tree = page();
tree.find((e) => e.type === 'details').props.onToggle({ currentTarget: { open: true } });
tree = page();
tree.find((e) => e.type === ObservationLocationPicker || e.type?.name === 'ObservationLocationPicker').props.onConfirm({ ...coordinates, lng: 113.996205 });
tree = page();
tree.find((e) => e.type === 'form').props.onSubmit({ preventDefault() {} });
tree = page();
tree.find((e) => e.type === 'form').props.onSubmit({ preventDefault() {} });
tree = page();
elements(tree.find((e) => e.type === 'label' && e.props.className === 'publish-confirm')).find((e) => e.type === 'input').props.onChange({ target: { checked: true } });
tree = page();
tree.find((e) => e.type === 'form').props.onSubmit({ preventDefault() {} });
assert.equal(published.coordinates.lng, 113.996205);
assert.deepEqual(place.coordinates, before, 'publishing an observation must not move its public place');

// A new mounted form must clear a chosen point when its associated place changes.
slots = [];
tree = page();
tree.find((e) => e.type === 'details').props.onToggle({ currentTarget: { open: true } });
tree = page();
tree.find((e) => e.type?.name === 'ObservationLocationPicker').props.onConfirm({ ...coordinates, lng: 113.996205 });
tree = page();
tree.find((e) => e.type === 'select' && e.props.value === 'first').props.onChange({ target: { value: 'other' } });
tree = page();
assert.deepEqual(tree.find((e) => e.type?.name === 'ObservationLocationPicker').props.coordinates, other.coordinates);
const { resolveObservationPlace } = await bundle('src/store/observationPlaces.ts');
const newInput = { placeId: '', newPlace: { name: '10 栋南侧入口', amapPoiId: 'poi-10' }, coordinates: { ...coordinates, lng: 113.997 } };
const newPlace = resolveObservationPlace([place], newInput, 'new-10');
assert.equal(newPlace.name, '10 栋南侧入口');
assert.equal(newPlace.currentStatus, 'pending');
assert.equal(resolveObservationPlace([place, newPlace], newInput, 'should-not-create'), newPlace);
assert.equal(resolveObservationPlace([place, newPlace], { ...newInput, newPlace: { name: '10栋南侧入口' } }, 'duplicate'), newPlace);
assert.equal(resolveObservationPlace([place, newPlace], { ...newInput, coordinates: { ...coordinates, lng: 114.1 }, newPlace: { name: '10 栋南侧入口' } }, 'another-campus').id, 'another-campus');
assert.throws(() => resolveObservationPlace([], { ...newInput, coordinates: { ...coordinates, lat: NaN } }, 'invalid'));
assert.deepEqual(place.coordinates, before);

slots = [];
tree = page();
tree.find((e) => e.type === 'select' && e.props.value === 'first').props.onChange({ target: { value: '' } });
tree = page();
const nameInput = tree.find((e) => e.type === 'input' && e.props.maxLength === 80);
nameInput.props.onChange({ target: { value: '10 栋南侧入口' } });
tree = page();
tree.find((e) => e.type?.name === 'ObservationLocationPicker').props.onConfirm(newInput.coordinates);
tree = page();
tree.find((e) => e.type === 'form').props.onSubmit({ preventDefault() {} });
tree = page();
tree.find((e) => e.type === 'form').props.onSubmit({ preventDefault() {} });
tree = page();
elements(tree.find((e) => e.type === 'label' && e.props.className === 'publish-confirm')).find((e) => e.type === 'input').props.onChange({ target: { checked: true } });
tree = page();
tree.find((e) => e.type === 'form').props.onSubmit({ preventDefault() {} });
assert.equal(published.newPlace.name, '10 栋南侧入口');
assert.equal(published.coordinates.lng, 113.997);
console.log('PASS: arbitrary named places, POI/name-distance reuse, invalid coordinates, and new-place publishing.');
console.log('PASS: manual selection validation, observation submission, public-coordinate isolation, and place-change reset.');
delete globalThis.__locationHooks;
delete globalThis.__locationStore;
