import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({ entryPoints: ['src/features/journey/publishValidation.ts'], bundle: true, write: false, format: 'esm', platform: 'node' });
const { validatePublish } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const now = Date.parse('2026-10-11T07:00:00Z');
const input = { isFacility: true, photo: '/sample.png', hasPlace: true, newPlaceName: '', hasCoordinates: true, locationDirty: false, title: '', description: '盲道被纸箱和路锥阻挡，需要现场清理。', capturedAt: '2026-10-11T06:00:00Z', hasAnalysis: true, confirmed: false };

const originalCase = validatePublish(input, 3, now);
assert.equal(originalCase.step, 3, '已确认位置但未完成人工检查，应停留在最终确认步骤');
assert.match(originalCase.message, /人工检查/);
assert.doesNotMatch(originalCase.message, /请选择已有地点/);
assert.equal(validatePublish(input, 2, now), null, '位置确认后可进入最终步骤，无需提前人工检查');
assert.equal(validatePublish({ ...input, confirmed: true }, 3, now), null);
assert.equal(validatePublish({ ...input, locationDirty: true, confirmed: true }, 3, now).step, 2, '调整过坐标必须再次确认');
assert.match(validatePublish({ ...input, hasAnalysis: false }, 3, now).message, /运行 AI/);
assert.match(validatePublish({ ...input, hasPlace: false, newPlaceName: '' }, 2, now).message, /地点名称/);
assert.equal(validatePublish({ ...input, hasPlace: false, newPlaceName: '新地点', confirmed: true }, 3, now), null);
assert.equal(validatePublish({ ...input, photo: '' }, 1, now).step, 1);
assert.equal(validatePublish({ ...input, isFacility: false, photo: '', title: '无障碍出行经验', hasAnalysis: false }, 3, now), null, '普通分享不依赖地图或 AI 分析');
console.log('PASS: publishing steps distinguish location, analysis and final review; changed coordinates require reconfirmation.');
