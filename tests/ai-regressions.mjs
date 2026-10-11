import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { build } from 'esbuild';

const built = await build({ entryPoints: ['server/deepseekProxy.ts'], bundle: true, write: false, platform: 'node', format: 'esm' });
const { deepSeekProxyPlugin } = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
const originalFetch = globalThis.fetch;
let upstreamCalls = 0;
globalThis.fetch = async (url, options) => {
  if (url !== 'https://api.deepseek.com/chat/completions') return originalFetch(url, options);
  upstreamCalls++;
  const input = JSON.parse(options.body);
  assert.equal(input.model, 'deepseek-flash');
  assert.equal(input.response_format.type, 'json_object');
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
    summary: '依据提供的演示资料，仍需复核。', details: ['请检查最新记录。'], sourceIds: ['place:known', 'fabricated'],
  }) } }], model: 'deepseek-flash' }), { status: 200 });
};

async function withProxy(key, run) {
  let handler;
  deepSeekProxyPlugin(key, 'deepseek-flash').configureServer({ middlewares: { use(_route, fn) { handler = fn; } } });
  const server = createServer((request, response) => handler(request, response));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}
const request = { question: '入口可通行吗？', sources: [{ id: 'place:known', type: 'place', title: '入口', updatedAt: '', excerpt: '待核验' }] };
try {
  await withProxy('', async (url) => {
    const response = await originalFetch(url, { method: 'POST' });
    assert.equal(response.status, 503);
    assert.equal(upstreamCalls, 0);
  });
  await withProxy('test-only-placeholder', async (url) => {
    assert.equal((await originalFetch(url)).status, 405);
    const response = await originalFetch(url, { method: 'POST', body: JSON.stringify(request) });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.deepEqual(payload.sourceIds, ['place:known']);
    assert.equal(payload.model, 'deepseek-flash');
    assert.equal(JSON.stringify(payload).includes('test-only-placeholder'), false);
    assert.equal((await originalFetch(url, { method: 'POST', body: JSON.stringify({ ...request, question: '' }) })).status, 400);
  });
  console.log('PASS: missing-key fallback, method/input checks, mocked completion and fabricated citation filtering; no real API calls.');
} finally { globalThis.fetch = originalFetch; }
