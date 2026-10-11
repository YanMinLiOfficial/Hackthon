import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({ entryPoints: ['src/app/config/map.ts'], bundle: true, write: false, format: 'esm', platform: 'node' });
const { CAMPUS_SEARCH, distanceFromCampus } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
assert.equal(CAMPUS_SEARCH.city, '深圳');
assert.equal(distanceFromCampus(...CAMPUS_SEARCH.center), 0);
assert.ok(distanceFromCampus(113.995444, 22.600202) < 100, '校园工学院附近可保留');
assert.ok(distanceFromCampus(116.4, 39.9) > CAMPUS_SEARCH.radiusMeters, '北京同名门店不得进入校园结果');
assert.ok(distanceFromCampus(114.06, 22.54) > CAMPUS_SEARCH.radiusMeters, '深圳市内但远离校园的门店也应过滤');
console.log('PASS: campus search accepts nearby coordinates and excludes Beijing and distant Shenzhen POIs.');
