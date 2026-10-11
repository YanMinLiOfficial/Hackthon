import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { build } from 'esbuild';
const result = await build({entryPoints:['server/localWhisper.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {localWhisperPlugin} = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
async function withPlugin(plugin, run) {
  let handler;
  plugin.configureServer({middlewares:{use(_route,fn){handler=fn;}}});
  const server = createServer(handler);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve=>server.close(resolve)); }
}
await withPlugin(localWhisperPlugin('/nonexistent/asr-python','/nonexistent/asr-model'),async url=>{
  assert.equal((await fetch(url)).status,405);
  assert.equal((await fetch(url,{method:'POST'})).status,503);
});
await withPlugin(localWhisperPlugin(),async url=>{
  const wav=Buffer.alloc(44+16000*2);
  wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);
  wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);
  wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);
  wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
  assert.equal((await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain'},body:'not audio'})).status,415);
  assert.equal((await fetch(url,{method:'POST',headers:{'Content-Type':'audio/wav'}})).status,400);
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'audio/wav'},body:wav});
  assert.equal(response.status,200);
  const answer=await response.json();
  assert.equal(answer.engine,'local-faster-whisper');
  assert.equal(answer.text,'');
});
console.log('PASS: local ASR method/config/MIME/empty-input checks and real offline silent WAV transcription.');
