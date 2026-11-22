// Which local media files of a game still need uploading to Astrocade, so only changed files go up.
// The game folder's assets.lock.json remembers, per file, the sha256 that was uploaded, its asset id and URL.
//   node tools/assets.js <game>                       lists every media file: NEW, CHANGED, ok or preview (exit 1
//                                                     if any is NEW/CHANGED, so a ship step can stop on it)
//   node tools/assets.js <game> --record <file> <url> [id] [--preview]
//                                                     after begin_upload + PUT + upload_asset: stores the hash and
//                                                     URL in the lock and the entry in asset_map.json (id defaults
//                                                     to the file name without extension). --preview: the file is a
//                                                     shrunk copy of that uploaded image, kept for artifact pages;
//                                                     only the lock is written
//   node tools/assets.js <game> --adopt               for files uploaded before the lock: records those the CDN
//                                                     already serves byte for byte, and names likely previews
// Prints observations only; it never uploads (uploads go through the Astrocade MCP tools).
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const MEDIA = { '.webp': 'image', '.png': 'image', '.jpg': 'image', '.jpeg': 'image', '.mp3': 'audio', '.ogg': 'audio', '.wav': 'audio', '.glb': 'model_3d' };

const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
/** A missing file reads as `d`; a file that is not valid JSON throws, so nothing rewrites it from scratch. */
const readJson = (f, d) => {
  let t; try { t = fs.readFileSync(f, 'utf8'); } catch (e) { if (e.code === 'ENOENT') return d; throw e; }
  try { return JSON.parse(t); } catch (e) { throw new Error(`${f} is not valid JSON (${e.message}); fix it before recording`); }
};
const writeJson = (f, v) => fs.writeFileSync(f, JSON.stringify(v, null, 2) + '\n');

/** Media files directly in the game folder (evidence and test output live elsewhere), with their status. */
function status(dir) {
  const lock = readJson(path.join(dir, 'assets.lock.json'), {});
  return fs.readdirSync(dir).filter((n) => MEDIA[path.extname(n).toLowerCase()]).sort().map((n) => {
    const h = sha(path.join(dir, n)), l = lock[n];
    return { file: n, size: fs.statSync(path.join(dir, n)).size, state: !l ? 'NEW' : l.sha256 !== h ? 'CHANGED' : l.preview ? 'preview' : 'ok', id: l ? l.id : path.parse(n).name, url: l && l.url };
  });
}

/**
 * Records one uploaded file: lock entry (hash, id, url) and the asset_map.json entry the game reads.
 * A preview (a shrunk local copy of an uploaded image) is only locked: asset_map keeps the full-size entry.
 */
function record(dir, file, url, id, preview = false) {
  const p = path.join(dir, file), type = MEDIA[path.extname(file).toLowerCase()];
  if (!fs.existsSync(p) || !type) throw new Error(`${file}: not a media file in ${dir}`);
  if (!/^https:\/\//.test(url)) throw new Error(`${url}: expected the https URL upload_asset returned`);
  id = id || path.parse(file).name;
  const lockF = path.join(dir, 'assets.lock.json'), mapF = path.join(dir, 'asset_map.json');
  const lock = readJson(lockF, {}), map = readJson(mapF, {});
  lock[file] = preview ? { sha256: sha(p), id, url, preview: true } : { sha256: sha(p), id, url };
  writeJson(lockF, lock);
  if (!preview) { map[id] = Object.assign({}, map[id], { url, type }); writeJson(mapF, map); }
  return { id, url, type };
}

/** Width and height of a WebP or PNG from its header, or null (enough to tell a shrunk preview copy). */
function imageSize(b) {
  if (!b || b.length < 30) return null;
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const k = b.toString('ascii', 12, 16);
    if (k === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
    if (k === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    if (k === 'VP8L') { const v = b.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)]; }
  }
  if (b.readUInt32BE(0) === 0x89504e47) return [b.readUInt32BE(16), b.readUInt32BE(20)];
  return null;
}

/**
 * For files uploaded before the lock existed. A NEW file whose asset_map entry serves the same bytes is recorded
 * as uploaded. A smaller image with the same shape is only named as a likely preview: whether it is a shrunk copy
 * or new art needs a look, then `--record <file> <url> <id> --preview`. Anything else stays NEW.
 */
async function adopt(dir) {
  const map = readJson(path.join(dir, 'asset_map.json'), {}), out = [];
  for (const r of status(dir).filter((x) => x.state === 'NEW')) {
    const e = map[r.id];
    if (!e || !e.url) { out.push(`${r.file}: no asset '${r.id}' in asset_map.json, upload it`); continue; }
    try {
      const res = await fetch(e.url);
      if (!res.ok) { out.push(`${r.file}: '${r.id}' answered ${res.status}, upload it`); continue; }
      const buf = Buffer.from(await res.arrayBuffer()), local = fs.readFileSync(path.join(dir, r.file));
      if (crypto.createHash('sha256').update(buf).digest('hex') === sha(path.join(dir, r.file))) { record(dir, r.file, e.url, r.id); out.push(`${r.file}: same bytes as '${r.id}', recorded`); continue; }
      const a = imageSize(local), c = imageSize(buf);
      const smaller = a && c && a[0] <= c[0] && a[1] <= c[1] && (a[0] < c[0] || a[1] < c[1]) && Math.abs(a[0] / a[1] - c[0] / c[1]) < 0.01;
      if (smaller) out.push(`${r.file}: ${a.join('x')}, same shape as '${r.id}' (${c.join('x')}); if it is a shrunk copy (look at both): --record ${r.file} ${e.url} ${r.id} --preview`);
      else out.push(`${r.file}: differs from what '${r.id}' serves${a && c ? ` (${a.join('x')} here, ${c.join('x')} there)` : ''}; upload it if this file is the newer art`);
    } catch (err) { out.push(`${r.file}: could not compare with '${r.id}' (${err.message})`); }
  }
  return out;
}

module.exports = { status, record, adopt, imageSize };

if (require.main === module) {
  const [dir, flag, ...rest] = process.argv.slice(2);
  if (!dir) { console.error('usage: node tools/assets.js <game> [--record <file> <url> [id] [--preview] | --adopt]'); process.exit(2); }
  if (flag === '--record') {
    const preview = rest.includes('--preview'), [file, url, id] = rest.filter((x) => x !== '--preview');
    try { const r = record(dir, file, url, id, preview); console.log(`recorded ${file} as '${r.id}' (${r.type}${preview ? ', preview' : ''})`); process.exit(0); } catch (e) { console.error(e.message); process.exit(1); }
  }
  if (flag === '--adopt') { adopt(dir).then((l) => { console.log(l.join('\n') || 'nothing NEW'); }, (e) => { console.error(e.message); process.exit(1); }); return; }
  const rows = status(dir);
  for (const r of rows) console.log(`${r.state.padEnd(7)} ${r.file} (${r.size} bytes) -> asset '${r.id}'`);
  const todo = rows.filter((r) => r.state === 'NEW' || r.state === 'CHANGED');
  console.log(todo.length ? `${todo.length} to upload: begin_upload (purpose asset) + PUT + upload_asset, then --record each` : `ok: ${rows.length} media files match what was uploaded`);
  process.exit(todo.length ? 1 : 0);
}
