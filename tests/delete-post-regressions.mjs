import assert from 'node:assert/strict';
import { build } from 'esbuild';

async function moduleFor(entry) {
  const result = await build({ entryPoints: [entry], bundle: true, write: false, format: 'esm', platform: 'node', plugins: [{ name: 'local-images', setup(plugin) { plugin.onLoad({ filter: /\.png$/ }, ({ path }) => ({ contents: `export default ${JSON.stringify(path)}`, loader: 'js' })); } }] });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
const { deleteOwnedPost } = await moduleFor('src/store/deletePost.ts');
const { migrateStoredData } = await moduleFor('src/store/migrate.ts');
const mine = { id: 'mine', author: { id: 'u-me' }, type: 'facility', images: [], observationId: 'obs-mine' };
const other = { id: 'other', author: { id: 'u-other' }, type: 'facility', images: [], observationId: 'obs-other' };
const text = { id: 'text', author: { id: 'u-me' }, type: 'article', images: [], comments: [{ content: '评论' }], likedBy: ['u-other'] };
const data = { currentUserId: 'u-me', demoUsers: [{ userId: 'u-me', role: 'volunteer' }], preferences: {}, privacySettings: {}, navigation: {}, routes: [], helpRequests: [], redemptions: [{ id: 'keep-redemption' }],
  posts: [mine, other, text],
  observations: [{ id: 'obs-mine', postId: 'mine', placeId: 'place', verificationStatus: 'pending', confirmations: [], description: '', photo: '' }, { id: 'obs-other', postId: 'other', placeId: 'place', verificationStatus: 'community_verified', confirmations: [{ createdAt: '2026-10-11T07:00:00Z' }], description: '', photo: '' }],
  places: [{ id: 'place', name: '地点', coordinates: { x: 50, y: 50, lat: 22.6, lng: 113.99 }, observationIds: ['obs-mine', 'obs-other'], currentStatus: 'pending', lastVerifiedAt: '2026-10-10T07:00:00Z' }],
  timeline: [{ observationId: 'obs-mine' }, { observationId: 'obs-other' }, { message: '独立记录' }],
  pointRecords: [{ relatedObservationId: 'obs-mine', delta: 10 }, { relatedObservationId: 'obs-mine', delta: 5 }, { relatedObservationId: 'obs-other', delta: 5 }, { reason: 'reward_redeemed', delta: -10 }],
};
assert.equal(deleteOwnedPost(data, 'other'), data, '禁止删除他人帖子');
assert.equal(deleteOwnedPost(data, 'missing'), data);
const removed = deleteOwnedPost(data, 'mine');
assert.equal(data.posts.length, 3, '不修改原状态');
assert.deepEqual(removed.posts.map((post) => post.id), ['other', 'text']);
assert.deepEqual(removed.observations.map((obs) => obs.id), ['obs-other']);
assert.equal(removed.timeline.length, 2);
assert.equal(removed.pointRecords.length, 2);
assert.deepEqual(removed.redemptions, data.redemptions);
assert.deepEqual(removed.places[0].observationIds, ['obs-other']);
assert.equal(removed.places[0].currentStatus, 'community_verified');
assert.equal(deleteOwnedPost(removed, 'mine'), removed, '重复删除不再扣分');
const lastRemoved = deleteOwnedPost({ ...removed, currentUserId: 'u-other' }, 'other');
assert.equal(lastRemoved.places.length, 1, '保留地点档案');
assert.equal(lastRemoved.places[0].currentStatus, 'stale', '没有观察不能声称设施正常');
assert.deepEqual(lastRemoved.places[0].observationIds, []);
assert.equal(deleteOwnedPost(data, 'text').observations.length, 2, '普通帖子不影响观察');

const seed = { ...data, places: [{ ...data.places[0], id: 'place-canteen-2-test' }], observations: [{ ...data.observations[0], id: 'obs-canteen-2-test' }], posts: [{ ...mine, id: 'post-canteen-2-test' }], timeline: [{ id: 'tl-canteen-2-test' }] };
const withTombstone = { ...removed, deletedPostIds: ['post-canteen-2-test'] };
const migrated = migrateStoredData(JSON.parse(JSON.stringify(withTombstone)), seed);
assert.ok(!migrated.posts.some((post) => post.id === 'post-canteen-2-test'), '刷新迁移不补回已删除内置测试帖');
assert.ok(!migrated.observations.some((obs) => obs.id === 'obs-canteen-2-test'));
console.log('PASS: ownership, cascading cleanup, points, place aggregation, repeated deletion and refresh tombstones.');
