import assert from 'node:assert/strict';
import { build } from 'esbuild';

const result = await build({ entryPoints: ['src/features/ai/grounding.ts'], bundle: true, write: false,
  format: 'esm', define: { 'import.meta.env': '{}' } });
const { integrateLocalInformation, buildGroundingSources } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const store = {
  places: [{ id: 'p', name: '测试地点', category: '入口', accessibilityFeatures: ['坡道'], currentStatus: 'pending', lastVerifiedAt: '2026-10-01' }],
  observations: [], posts: [], getObservation(id) { return this.observations.find((item) => item.id === id); },
};
const initial = integrateLocalInformation(store);
assert.equal(initial[0].observations.length, 0);
for (let i = 0; i < 5; i++) store.observations.push({ id: `o${i}`, placeId: 'p', createdAt: `2026-10-0${i + 2}`,
  facilityType: 'ramp', issueType: 'occupied', description: `完整观察${i}`, verificationStatus: 'pending',
  confirmations: [], disputes: i === 4 ? [{}] : [], remediationUpdates: i === 4 ? [{createdAt:'2026-10-08',message:'已移走单车',statusAfter:'remediation_pending'}] : [] });
store.posts.push({ id:'post1',placeId:'p',title:'长帖',content:'甲'.repeat(300)+'正文末尾不能丢失',tags:[],createdAt:'2026-10-07' });
store.posts.push({ id:'unlinked',title:'无地点科普',content:'未关联也应纳入',tags:[],createdAt:'2026-10-07' });
const integrated = integrateLocalInformation(store)[0];
assert.equal(integrated.observations.length, 5);
assert.equal(integrated.latest.id, 'o4');
assert.equal(integrated.disputed.length, 1);
assert.equal(integrated.pending.length, 5);
const sources = buildGroundingSources(store);
assert.ok(sources[0].excerpt.includes('完整观察0'));
assert.ok(sources[0].excerpt.includes('已移走单车'));
assert.equal(sources[0].updatedAt, '2026-10-06');
assert.ok(sources.find((source) => source.id === 'post:post1').excerpt.includes('正文末尾不能丢失'));
assert.ok(sources.find((source) => source.id === 'post:unlinked'));
store.observations[4].verificationStatus = 'community_verified';
assert.equal(integrateLocalInformation(store)[0].pending.length, 4);
assert.equal(initial[0].observations.length, 0);
console.log('PASS: automatic aggregation reflects uploads and verification, retains all observations, full posts, disputes and remediation.');
