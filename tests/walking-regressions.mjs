import assert from 'node:assert/strict';
import { build } from 'esbuild';
const bundle = await build({ entryPoints: ['src/features/journey/walking.ts'], bundle: true, write: false, format: 'esm' });
const { parseWalkingRoute, searchWalkingRoute, distanceToWalkingPath } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const fixture = { routes: [{ distance: 580, time: 420, steps: [
  { instruction: '沿道路直行', path: [{ lng: 113, lat: 22 }, { lng: 113.001, lat: 22.001 }] },
  { instruction: '向左转', path: [{ getLng: () => 113.001, getLat: () => 22.001 }, [113.002, 22.001], [113.002, 22.002]] },
] }] };
const route = parseWalkingRoute(fixture);
assert.equal(route.path.length, 4, 'keeps intermediate road geometry, not just endpoint line');
assert.equal(route.distance, 580);
assert.equal(route.duration, 420);
assert.deepEqual(route.instructions, ['沿道路直行', '向左转']);
assert.throws(() => parseWalkingRoute({ routes: [] }));
assert.throws(() => parseWalkingRoute({ routes: [{ distance: 1, time: 1, steps: [{ path: [] }] }] }));
assert.throws(() => parseWalkingRoute({ routes: [{ distance: 1, time: 1, steps: [{ path: [[NaN, 22], [113, 22]] }] }] }));
assert.equal(distanceToWalkingPath(113.001, 22.001, route.path), 0);
assert.ok(distanceToWalkingPath(114, 23, route.path) > 100);
assert.equal(distanceToWalkingPath(NaN, 22, route.path), Infinity);
const sdk = { plugin(name, done) { assert.equal(name, 'AMap.Walking'); done(); }, Walking: class {
  search(from, to, done) { assert.deepEqual(from, [113, 22]); assert.deepEqual(to, [113.002, 22.002]); done('complete', fixture); }
} };
assert.deepEqual(await searchWalkingRoute(sdk, [113, 22], [113.002, 22.002], new AbortController().signal), route);
await assert.rejects(searchWalkingRoute({ plugin(n, done) { done(); }, Walking: class { search(a, b, done) { done('error', { info: 'INVALID_USER_KEY' }); } } }, [113, 22], [114, 23], new AbortController().signal));
const controller = new AbortController();
let late;
const pending = searchWalkingRoute({ plugin(n, done) { done(); }, Walking: class { search(a, b, done) { late = done; } } }, [113, 22], [114, 23], controller.signal);
controller.abort();
await assert.rejects(pending, /取消/);
late('complete', fixture);
console.log('PASS: full road geometry, real distance/time, invalid/no route rejection, nearby records, SDK integration and cancelled late responses');
