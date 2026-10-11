import assert from 'node:assert/strict';
import { build } from 'esbuild';

const identity = (userId, role = 'volunteer') => ({ userId, name: userId, role });
const seed = {
  places: [{ id: 'place', name: 'Test', coordinates: { x: 1, y: 1, lat: 22, lng: 113 }, currentStatus: 'pending', observationIds: ['obs'], lastVerifiedAt: '2026-10-01T00:00:00Z' }],
  posts: [], observations: [{ id: 'obs', placeId: 'place', reporterId: 'author', verificationStatus: 'pending', confirmations: [], disputes: [], remediationUpdates: [] }],
  timeline: [], pointRecords: [], redemptions: [], routes: [],
  demoUsers: [identity('author'), identity('v1'), identity('v2'), identity('v3'), identity('institution', 'institution')],
  currentUserId: 'author', preferences: {}, privacySettings: {}, navigation: {},
};
globalThis.__verificationSeed = seed;
let state;
globalThis.__verificationHooks = {
  createContext: () => ({ Provider: 'provider' }),
  useState: (initial) => {
    state ??= typeof initial === 'function' ? initial() : initial;
    return [state, (updater) => { state = typeof updater === 'function' ? updater(state) : updater; }];
  },
  useMemo: (fn) => fn(), useEffect() {}, useContext() {},
};
globalThis.window = { localStorage: { getItem: () => null } };
const plugins = [{ name: 'store-hooks', setup(api) {
  api.onResolve({ filter: /^react(?:\/jsx-runtime)?$/ }, (args) => ({ path: args.path, namespace: 'mock' }));
  api.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: 'export const {createContext,useState,useMemo,useEffect,useContext}=globalThis.__verificationHooks; export const jsx=(type,props)=>({type,props}),jsxs=jsx;', loader: 'js' }));
  api.onLoad({ filter: /data\/index\.ts$/ }, () => ({ contents: 'export const buildSeedData=()=>structuredClone(globalThis.__verificationSeed);', loader: 'js' }));
} }];
const built = await build({ entryPoints: ['src/store/AppStoreContext.tsx'], bundle: true, write: false, format: 'esm', jsx: 'automatic',
  loader: { '.png': 'dataurl', '.svg': 'dataurl' }, define: { 'import.meta.env': '{}' }, plugins });
const { AppStoreProvider } = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
const store = () => AppStoreProvider({ children: null }).props.value;
assert.equal(store().verifyObservation('obs', 'confirm').ok, false);
store().switchUser('institution');
assert.equal(store().verifyObservation('obs', 'confirm').ok, false);
store().switchUser('v1');
const first = store();
first.verifyObservation('obs', 'confirm');
first.verifyObservation('obs', 'confirm'); // repeated click before a re-render must not duplicate votes/points
assert.equal(state.observations[0].confirmations.length, 1);
assert.equal(state.observations[0].verificationStatus, 'pending');
assert.equal(store().getUserPoints('v1'), 5);
assert.equal(store().verifyObservation('obs', 'dispute').ok, false);
store().switchUser('v2');
store().verifyObservation('obs', 'confirm');
assert.equal(state.observations[0].verificationStatus, 'community_verified');
assert.equal(state.places[0].currentStatus, 'community_verified');
assert.equal(store().getUserPoints('v2'), 5);
assert.equal(state.timeline.filter((event) => event.type === 'status_changed').length, 1);
assert.equal(store().verifyObservation('missing', 'confirm').ok, false);
state = structuredClone(seed); state.currentUserId = 'v3';
store().verifyObservation('obs', 'dispute');
assert.equal(state.observations[0].disputes.length, 1);
assert.equal(state.observations[0].confirmations.length, 0);
assert.equal(store().getUserPoints('v3'), 0);
assert.equal(state.places[0].currentStatus, 'pending');
assert.deepEqual(JSON.parse(JSON.stringify(state)).observations, state.observations);
console.log('PASS: real store rejects author/duplicate/institution; two independent confirmations update status/timeline/points; disputes do not promote or award points.');
