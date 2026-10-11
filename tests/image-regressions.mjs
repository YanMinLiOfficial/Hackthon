import assert from 'node:assert/strict';
import { build } from 'esbuild';

async function bundle(entry) {
  const result = await build({ entryPoints: [entry], bundle: true, write: false,
    format: 'esm', loader: { '.svg': 'dataurl', '.png': 'dataurl' },
    define: { 'import.meta.env': '{}' } });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
const { buildSeedData } = await bundle('src/data/seed.ts');
const { migrateStoredData } = await bundle('src/store/migrate.ts');
const seed = buildSeedData();
const oldNames = {
  'post-facility-ramp': 'photo-ramp-occupied',
  'post-facility-tactile': 'photo-tactile-blocked',
  'post-facility-restroom': 'photo-restroom-ok',
  'post-article-ramp': 'article-ramp-standard',
  'post-article-tactile': 'article-tactile',
  'post-tool-map': 'tool-map-compare',
  'post-tool-elevator': 'tool-elevator-check',
  'post-experience-metro': 'experience-metro',
};
const legacy = structuredClone(seed);
for (const post of legacy.posts) {
  assert.ok(post.images[0].startsWith('data:image/png'));
  // 只有这八个旧帖子曾使用 SVG；后加的种子保持自身 PNG 封面。
  post.images = [oldNames[post.id] ? `/assets/${oldNames[post.id]}-abcd123.svg` : post.images[0], 'data:image/png;base64,USER'];
  post.content = 'User edited content';
}
const migrated = migrateStoredData(legacy, seed);
for (const post of migrated.posts) {
  assert.equal(post.images[0], seed.posts.find((item) => item.id === post.id).images[0]);
  assert.equal(post.images[1], 'data:image/png;base64,USER');
  assert.equal(post.content, 'User edited content');
}
assert.deepEqual(migrateStoredData(migrated, seed), migrated);
const extra = structuredClone(seed);
extra.posts.push({ ...seed.posts[0], id: 'published-test-post', title: 'User title',
  images: ['/src/assets/photo-ramp-occupied.svg', 'blob:user-photo'] });
extra.observations.push({ ...seed.observations[0], id: 'published-test-observation',
  photo: '/assets/photo-ramp-occupied-oldhash.svg' });
const extraMigrated = migrateStoredData(extra, seed);
assert.equal(extraMigrated.posts.at(-1).images[0], seed.posts[0].images[0]);
assert.equal(extraMigrated.posts.at(-1).images[1], 'blob:user-photo');
assert.equal(extraMigrated.posts.at(-1).title, 'User title');
assert.equal(extraMigrated.observations.at(-1).photo, seed.observations[0].photo);
legacy.posts[0].images = ['blob:my-custom-photo'];
assert.equal(migrateStoredData(legacy, seed).posts[0].images[0], 'blob:my-custom-photo');
console.log('PASS: eight PNG covers, legacy SVG migration, user photo/content preservation, idempotence.');
const duplicates = structuredClone(seed);
duplicates.posts.push({ ...seed.posts[0], id: 'post-mv3g9jfp-9iawgp', type: 'experience', observationId: undefined });
duplicates.posts.push({ ...seed.posts[0], id: 'post-mv3g90hb-c7o3ju', observationId: 'test-obs', likedBy: ['u-lin'], comments: [{ id: 'test-comment', content: 'keep' }] });
duplicates.observations.push({ ...seed.observations[0], id: 'test-obs' });
const unique = migrateStoredData(duplicates, seed);
assert.equal(new Set(unique.posts.map((post) => post.images[0])).size, new Set(seed.posts.map((post) => post.images[0])).size + 2);
assert.ok(unique.observations.at(-1).photo === unique.posts.at(-1).images[0]);
assert.deepEqual(unique.posts.at(-1).likedBy, ['u-lin']);
assert.equal(unique.posts.at(-1).comments[0].content, 'keep');
assert.deepEqual(migrateStoredData(unique, seed), unique);
duplicates.posts.at(-1).images = ['blob:user-photo'];
assert.equal(migrateStoredData(duplicates, seed).posts.at(-1).images[0], 'blob:user-photo');
console.log('PASS: ten distinct demo covers, linked observation sync, interaction preservation, custom upload preservation.');
const oldPlaces = structuredClone(seed);
const studentCenter = oldPlaces.places.find((place) => place.id === 'place-student-center');
delete studentCenter.sceneImage;
const elevator = oldPlaces.observations.find((item) => item.id === 'obs-elevator-004');
elevator.photo = '/src/assets/sample-photo-elevator.svg';
const upgradedPlaces = migrateStoredData(oldPlaces, seed);
const upgradedCenter = upgradedPlaces.places.find((place) => place.id === 'place-student-center');
assert.ok(upgradedCenter.sceneImage.startsWith('data:image/png'));
assert.deepEqual(upgradedCenter.observationIds, []);
assert.equal(upgradedPlaces.observations.length, seed.observations.length);
assert.ok(upgradedPlaces.observations.find((item) => item.id === 'obs-elevator-004').photo === seed.observations.find((item) => item.id === 'obs-elevator-004').photo);
studentCenter.sceneImage = 'blob:custom-scene';
elevator.photo = 'data:image/png;base64,USER';
const preservedPlaces = migrateStoredData(oldPlaces, seed);
assert.equal(preservedPlaces.places.find((place) => place.id === 'place-student-center').sceneImage, 'blob:custom-scene');
assert.equal(preservedPlaces.observations.find((item) => item.id === 'obs-elevator-004').photo, 'data:image/png;base64,USER');
console.log('PASS: missing place scene and legacy elevator photo updated without inventing observations or overwriting uploads.');
