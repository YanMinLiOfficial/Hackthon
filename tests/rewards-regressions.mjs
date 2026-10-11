import assert from 'node:assert/strict';
import { build } from 'esbuild';

async function bundle(entry) {
  const result = await build({ entryPoints: [entry], bundle: true, write: false, format: 'esm',
    loader: { '.svg': 'dataurl', '.png': 'dataurl' }, define: { 'import.meta.env': '{}' } });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
const { buildSeedData } = await bundle('src/data/seed.ts');
const { applyRewardRedemption, getAvailablePoints } = await bundle('src/store/rewards.ts');
const { selectLeaderboard } = await bundle('src/features/journey/leaderboard.ts');
const { migrateStoredData } = await bundle('src/store/migrate.ts');
const seed = buildSeedData();
const userId = seed.currentUserId;
const balance = getAvailablePoints(seed, userId);
const now = new Date().toISOString();
const redeemed = applyRewardRedemption(seed, 'guide', 'test-order', now);
assert.equal(redeemed.redemptions.length, 1);
assert.equal(getAvailablePoints(redeemed, userId), balance - 10);
assert.deepEqual(selectLeaderboard(redeemed), selectLeaderboard(seed));
assert.equal(seed.redemptions.length, 0, 'original data is not mutated');
assert.equal(applyRewardRedemption(redeemed, 'guide', 'repeat', now), redeemed, 'duplicate clicks are idempotent');
assert.equal(applyRewardRedemption(seed, 'unknown', 'unknown', now), seed);
assert.equal(applyRewardRedemption({ ...seed, pointRecords: [] }, 'guide', 'empty', now).redemptions.length, 0);
const institution = { ...seed, currentUserId: seed.demoUsers.find((user) => user.role === 'institution').userId };
assert.equal(applyRewardRedemption(institution, 'guide', 'institution', now), institution);
const rich = { ...seed, pointRecords: [...seed.pointRecords, { id: 'test-credit', userId, userName: 'test', delta: 100, reason: 'observation_published', detail: 'test', createdAt: now }] };
const hours = applyRewardRedemption(rich, 'hours', 'hours-order', now);
assert.equal(hours.redemptions[0].status, 'review_pending');
assert.equal(getAvailablePoints(hours, userId), getAvailablePoints(rich, userId) - 50);
const legacy = structuredClone(seed);
delete legacy.redemptions;
const migrated = migrateStoredData(legacy, seed);
assert.deepEqual(migrated.redemptions, []);
assert.deepEqual(migrated.pointRecords, seed.pointRecords);
assert.deepEqual(migrateStoredData(JSON.parse(JSON.stringify(hours)), seed).redemptions, hours.redemptions);
assert.equal(getAvailablePoints(migrateStoredData(JSON.parse(JSON.stringify(hours)), seed), userId), getAvailablePoints(hours, userId));
console.log('PASS: redemption, insufficient balance, duplicate clicks, institution restriction, contribution ranking, hours review, legacy migration and persisted balance');
