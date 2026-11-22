// Unit tests for the build pipeline tools that need no browser: sprite packing and recipe hashes
// (tools/kit/bake.js), the asset lock (tools/assets.js) and dev-block stripping (tools/astrocade-upload-set.sh).
// The browser half (bake and --check on a real page) runs in CI as `node tools/bake.js tools/fixtures/bake-demo --check`.
// Usage: node --test tools/pipeline.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import http from 'node:http';
import { pack, recipeKey } from './kit/bake.js';

const require = createRequire(import.meta.url);
const assets = require('./assets.js');
const here = path.dirname(new URL(import.meta.url).pathname);
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pipe-'));

test('pack places every item inside the sheet, padded, with no overlap', () => {
  const items = [{ name: 'a', w: 96, h: 96 }, { name: 'b', w: 300, h: 40 }, { name: 'c', w: 1000, h: 500 }, { name: 'd', w: 1500, h: 20 }, { name: 'e', w: 8, h: 8 }];
  const P = pack(items, 2048, 4096, 4);
  const boxes = items.map((it) => ({ ...P.at[it.name], name: it.name }));
  for (const b of boxes) {
    assert.ok(b.x >= 4 && b.y >= 4, `${b.name} keeps its pad`);
    assert.ok(b.x + b.w + 4 <= P.width && b.y + b.h + 4 <= P.height, `${b.name} inside`);
  }
  for (const a of boxes) for (const b of boxes) if (a !== b) {
    const apart = a.x + a.w + 8 <= b.x || b.x + b.w + 8 <= a.x || a.y + a.h + 8 <= b.y || b.y + b.h + 8 <= a.y;
    assert.ok(apart, `${a.name} and ${b.name} overlap or share a gutter`);
  }
  assert.deepEqual(pack(items.slice().reverse(), 2048, 4096, 4), P, 'same layout whatever the order');
});

test('pack refuses what cannot fit', () => {
  assert.throws(() => pack([{ name: 'wide', w: 2100, h: 10 }]), /wider than the sheet/);
  assert.throws(() => pack(Array.from({ length: 9 }, (_, i) => ({ name: 'p' + i, w: 2000, h: 500 }))), /sheet holds/);
});

test('recipeKey is name, size and options only: a bundler rewriting the draw code cannot change it', () => {
  const k = recipeKey('coin', 96, 96, {});
  assert.equal(recipeKey('coin', 96, 96, {}), k);
  assert.equal(recipeKey('coin', 96, 96, undefined), k);
  assert.notEqual(recipeKey('coin', 96, 97, {}), k);
  assert.notEqual(recipeKey('coin', 96, 96, { scale: 2 }), k);
  assert.notEqual(recipeKey('coin', 96, 96, { v: 2 }), k);
  assert.notEqual(recipeKey('star', 96, 96, {}), k);
});

test('assets: NEW, then recorded (lock + asset_map), then CHANGED when the bytes change', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'icons.webp'), 'one');
  fs.writeFileSync(path.join(d, 'asset_map.json'), JSON.stringify({ music: { url: 'https://cdn/x.mp3', type: 'audio' } }));
  assert.equal(assets.status(d)[0].state, 'NEW');
  assets.record(d, 'icons.webp', 'https://cdn/icons.webp');
  assert.equal(assets.status(d)[0].state, 'ok');
  const map = JSON.parse(fs.readFileSync(path.join(d, 'asset_map.json'), 'utf8'));
  assert.deepEqual(map.icons, { url: 'https://cdn/icons.webp', type: 'image' });
  assert.equal(map.music.url, 'https://cdn/x.mp3', 'other entries kept');
  fs.writeFileSync(path.join(d, 'icons.webp'), 'two');
  assert.equal(assets.status(d)[0].state, 'CHANGED');
  assert.throws(() => assets.record(d, 'icons.webp', 'http://cdn/insecure'), /https/);
  assert.throws(() => assets.record(d, 'notes.txt', 'https://cdn/n'), /not a media file/);
});

test('assets: image sizes come from the header, and a preview is locked but kept out of asset_map', () => {
  const png = (w, h) => { const b = Buffer.alloc(33); b.writeUInt32BE(0x89504e47, 0); b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20); return b; };
  assert.deepEqual(assets.imageSize(png(615, 1024)), [615, 1024]);
  const webpX = Buffer.alloc(30); webpX.write('RIFF', 0); webpX.write('WEBP', 8); webpX.write('VP8X', 12); webpX.writeUIntLE(906, 24, 3); webpX.writeUIntLE(1508, 27, 3);
  assert.deepEqual(assets.imageSize(webpX), [907, 1509]);
  assert.equal(assets.imageSize(Buffer.from('not an image at all, just text')), null);
  const d = tmp();
  fs.writeFileSync(path.join(d, 'bg.png'), png(683, 1024));
  fs.writeFileSync(path.join(d, 'asset_map.json'), JSON.stringify({ bg: { url: 'https://cdn/bg-full.webp', type: 'image' } }));
  assets.record(d, 'bg.png', 'https://cdn/bg-full.webp', 'bg', true);
  assert.equal(assets.status(d)[0].state, 'preview');
  assert.equal(JSON.parse(fs.readFileSync(path.join(d, 'asset_map.json'), 'utf8')).bg.url, 'https://cdn/bg-full.webp');
  fs.writeFileSync(path.join(d, 'thumb.png'), png(64, 64));
  assets.record(d, 'thumb.png', 'https://cdn/thumb-full.webp', 'thumb', true);
  assert.equal(JSON.parse(fs.readFileSync(path.join(d, 'asset_map.json'), 'utf8')).thumb, undefined, 'a preview adds nothing to asset_map');
});

test('assets: a broken asset_map is never rewritten from scratch, and short headers read as no size', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'coin.webp'), 'x');
  const broken = '{ "music": { "url": "https://cdn/m.mp3", "type": "audio" }, }';
  fs.writeFileSync(path.join(d, 'asset_map.json'), broken);
  assert.throws(() => assets.record(d, 'coin.webp', 'https://cdn/coin.webp'), /not valid JSON/);
  assert.equal(fs.readFileSync(path.join(d, 'asset_map.json'), 'utf8'), broken);
  for (const b of [Buffer.alloc(0), Buffer.from('RIFF'), Buffer.from('RIFF\0\0\0\0WEBPVP8X')]) assert.equal(assets.imageSize(b), null);
});

test('assets --adopt: records byte-equal files, only names likely previews, survives a 404', async () => {
  const png = (w, h, fill = 0) => { const b = Buffer.alloc(40, fill); b.writeUInt32BE(0x89504e47, 0); b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20); return b; };
  const served = { '/same.png': png(10, 10, 1), '/big.png': png(200, 100, 2) };
  const srv = http.createServer((q, r) => { const b = served[q.url]; r.writeHead(b ? 200 : 404); r.end(b || ''); });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  const u = (p) => `http://127.0.0.1:${srv.address().port}${p}`;
  const d = tmp();
  fs.writeFileSync(path.join(d, 'same.png'), png(10, 10, 1));
  fs.writeFileSync(path.join(d, 'small.png'), png(100, 50, 3));
  fs.writeFileSync(path.join(d, 'gone.png'), png(8, 8));
  fs.writeFileSync(path.join(d, 'asset_map.json'), JSON.stringify({ same: { url: u('/same.png') }, small: { url: u('/big.png') }, gone: { url: u('/missing.png') } }));
  // record() wants https, so adopt records through it only with an https url; the local server is http
  const lines = await assets.adopt(d).finally(() => srv.close());
  assert.ok(lines.some((l) => /gone\.png: 'gone' answered 404/.test(l)), lines.join('\n'));
  assert.ok(lines.some((l) => /small\.png: 100x50, same shape as 'small' \(200x100\).*--preview/.test(l)), lines.join('\n'));
  assert.ok(lines.some((l) => /same\.png: could not compare|same\.png: same bytes/.test(l)), lines.join('\n'));
  const st = Object.fromEntries(assets.status(d).map((r) => [r.file, r.state]));
  assert.equal(st['small.png'], 'NEW', 'a likely preview is not recorded without a look');
  assert.equal(st['gone.png'], 'NEW');
});

test('upload set refuses dev markers that could cut real code', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'index.html'), '<!-- dev:start -->\n<p>debug panel</p>\n<!-- dev:end -->\n<script type="module" src="./game.js"></script>\n');
  const run = (code) => { fs.writeFileSync(path.join(d, 'game.js'), code); const out = tmp(); execFileSync('bash', [path.join(here, 'astrocade-upload-set.sh'), d, out], { stdio: 'pipe' }); return out; };
  const out = run('const a = 1;\r\n  // dev:start\r\nwindow.cheat = 1;\r\n  // dev:end\r\nwindow.run = () => a;\r\n');
  assert.ok(!/cheat/.test(fs.readFileSync(path.join(out, 'game.js'), 'utf8')), 'CRLF and indented markers still strip');
  assert.ok(!/debug panel/.test(fs.readFileSync(path.join(out, 'index.html'), 'utf8')), 'HTML comment markers strip');
  for (const [why, code] of [
    ['same line', 'cheat(); // dev:start one-liner dev:end\nwindow.run = 1;\n// dev:start\nx();\n// dev:end\n'],
    ['reversed', '// dev:end\nwindow.run = 1;\n// dev:start\n'],
    ['in a string', 'const s = "dev:start";\nwindow.run = 1;\nconst e = "dev:end";\n'],
    ['nested', '// dev:start\n// dev:start\nx();\n// dev:end\n// dev:end\n'],
    ['left open', 'window.run = 1;\n// dev:start\nx();\n'],
  ]) assert.throws(() => run(code), /FAIL/, why);
});

test('upload set drops dev blocks and refuses one left open', () => {
  const d = tmp(), out = tmp();
  fs.writeFileSync(path.join(d, 'index.html'), '<script type="module" src="./game.js"></script>\n');
  fs.writeFileSync(path.join(d, 'game.js'), [
    '// PROTOTYPE - NOT FOR PRODUCTION', 'const coins = 1;',
    '// dev:start', 'window.cheat = () => { coins = 10000; };', '// dev:end',
    'window.run = () => coins;', ''].join('\n'));
  execFileSync('bash', [path.join(here, 'astrocade-upload-set.sh'), d, out], { stdio: 'pipe' });
  const shipped = fs.readFileSync(path.join(out, 'game.js'), 'utf8');
  assert.ok(!/cheat|dev:|PROTOTYPE/.test(shipped), shipped);
  assert.match(shipped, /window\.run/);
  fs.writeFileSync(path.join(d, 'game.js'), 'const a = 1;\n// dev:start\nwindow.cheat = 1;\nwindow.run = () => a;\n');
  assert.throws(() => execFileSync('bash', [path.join(here, 'astrocade-upload-set.sh'), d, tmp()], { stdio: "pipe" }), /never closed/);
});
