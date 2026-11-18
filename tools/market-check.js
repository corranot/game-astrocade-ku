#!/usr/bin/env node
// Market check: one snapshot of what is fast on Astrocade right now, compared with the previous snapshot.
// Sources (all public, read as a guest): the astrotopper leaderboard, and the Astrocade home page's own
// requests (experiment flags, the rows it loads). It makes no feed requests of its own.
// Usage: node tools/market-check.js            -> writes production/market/<UTC time>/ and prints the report
//        node tools/market-check.js --selftest -> checks the number parser and the diff, no network
// Account plays: save the list_my_games result as my-games.json in the new folder, then run with --report.
//        node tools/market-check.js --report   -> prints the report for the newest folder again
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'production', 'market');
const FEED_FLAG = /feed|gallery|beam|rank|recsys|picks|trending|cold|theme|affinity|playlist|discovery|quality|fresh/i;

/** "+1.7M" / "867K" / "9,449" -> number; anything else -> 0. */
function num(s) {
  const m = String(s).replace(/[+,\s]/g, '').match(/^([\d.]+)([KMB]?)$/i);
  return m ? Math.round(parseFloat(m[1]) * ({ K: 1e3, M: 1e6, B: 1e9 }[m[2].toUpperCase()] || 1)) : 0;
}

/** Keys added, removed or changed between two flat objects (values compared as JSON). */
function diff(before, after) {
  const out = [];
  for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const a = JSON.stringify(before[k]), b = JSON.stringify(after[k]);
    if (a !== b) out.push({ key: k, before: before[k], after: after[k] });
  }
  return out;
}

const read = (dir, f) => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { return null; } };
const folders = () => (fs.existsSync(ROOT) ? fs.readdirSync(ROOT).filter((d) => /^\d{4}-/.test(d)).sort() : []);

async function capture(dir) {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();

  // 1. astrotopper: fastest games and creators this week
  const page = await (await browser.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
  const table = () => page.evaluate(() => [...document.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText.trim())));
  const topper = {};
  for (const [name, url] of [['gamesWeekly', '?view=games&window=weekly'], ['gamesMonthly', '?view=games&window=monthly'], ['creatorsWeekly', '?window=weekly']]) {
    await page.goto('https://astrotopper.vercel.app/' + url, { waitUntil: 'networkidle', timeout: 60000 });
    topper[name] = await table();
  }
  topper.updated = ((await page.evaluate(() => document.body.innerText)).match(/Updated [^.]+/) || [''])[0];
  fs.writeFileSync(path.join(dir, 'topper.json'), JSON.stringify(topper, null, 1));

  // 2 + 3. Astrocade home page as a guest: its flags and the rows it loads by itself
  const home = await (await browser.newContext()).newPage();
  const flags = {}, rows = {};
  home.on('response', async (r) => {
    try {
      if (/exp-vardata/.test(r.url())) for (const [k, v] of Object.entries(JSON.parse(await r.text()))) flags[k] = v.payload === undefined ? v.value : { value: v.value, payload: v.payload };
      if (/v3\/feed/.test(r.url())) {
        const j = JSON.parse(await r.text());
        const add = (cat, games) => { rows[cat] = (rows[cat] || []).concat(games.map((g) => ({ id: g.gameId, title: g.title, by: g.username, plays: g.plays, published: g.firstPublishedTimestamp, likes: g.likeCount, shares: g.shares }))); };
        if (j.games) add(j.category, j.games);
        if (j.feed_config) for (const [c, v] of Object.entries(j.feed_config.gamesByCategory || {})) add(c, v.games);
      }
    } catch { /* a response that is not JSON is not one we want */ }
  });
  await home.goto('https://www.astrocade.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  for (let i = 0; i < 40 && !(rows.top_picks && rows.trending && Object.keys(flags).length); i++) { await home.waitForTimeout(500); await home.mouse.wheel(0, 600); }
  await home.waitForTimeout(2000);
  fs.writeFileSync(path.join(dir, 'flags.json'), JSON.stringify(flags, null, 1));
  fs.writeFileSync(path.join(dir, 'feed.json'), JSON.stringify(rows, null, 1));
  await browser.close();
}

function report(dir, prev) {
  const L = [], say = (s = '') => L.push(s);
  say(`# Cek pasar ${path.basename(dir)}` + (prev ? ` (dibanding ${path.basename(prev)})` : ' (cek pertama, belum ada pembanding)'));

  const t = read(dir, 'topper.json'), pt = prev && read(prev, 'topper.json');
  if (t) {
    const key = (r) => r[1];
    const old = new Set((pt ? pt.gamesWeekly : []).map(key));
    say(`\n## Game tercepat minggu ini (astrotopper, ${t.updated})`);
    say('Tanda: BARU = belum ada di cek lalu; MUDA = hampir semua plays-nya dari minggu ini.');
    for (const r of t.gamesWeekly.slice(0, 30)) {
      const [title, by] = r[1].replace(/&amp;/g, '&').split('\n');
      const week = num(r[2]), total = num(r[3]);
      const tags = [pt && !old.has(key(r)) ? 'BARU' : '', total && week / total > 0.8 ? 'MUDA' : '', r[4] === 'Remix' ? 'remix' : ''].filter(Boolean).join(', ');
      say(`${r[0].split(/\s/)[0].padStart(3)}. ${title} — ${by || '?'} | ${r[2]} dari ${r[3]}${tags ? ' | ' + tags : ''}`);
    }
    say('\n## Kreator tercepat minggu ini');
    for (const r of t.creatorsWeekly.slice(0, 10)) say(`${r[0].split(/\s/)[0].padStart(3)}. ${r[1]} | ${r[2]} | ${r[4]} game, median ${r[5]}`);
  }

  const f = read(dir, 'flags.json'), pf = prev && read(prev, 'flags.json');
  say('\n## Flag algoritma');
  if (f && pf) {
    const d = diff(pf, f);
    if (!d.length) say('Tidak ada flag yang berubah.');
    for (const x of d.sort((a, b) => FEED_FLAG.test(b.key) - FEED_FLAG.test(a.key))) say(`${FEED_FLAG.test(x.key) ? 'FEED ' : '     '}${x.key}: ${JSON.stringify(x.before)} -> ${JSON.stringify(x.after)}`.slice(0, 400));
  } else if (f) say(`${Object.keys(f).length} flag tersimpan, ${Object.keys(f).filter((k) => FEED_FLAG.test(k)).length} menyangkut feed. Perbandingan mulai cek berikutnya.`);

  const feed = read(dir, 'feed.json'), pfeed = prev && read(prev, 'feed.json');
  for (const [cat, label] of [['top_picks', "Players' Choice"], ['trending', 'Discover More']]) {
    const now = (feed && feed[cat]) || [], was = new Set(((pfeed && pfeed[cat]) || []).map((g) => g.id));
    say(`\n## ${label} (yang dimuat halaman tamu, ${now.length} game; diacak per sesi)`);
    for (const g of now) {
      const age = g.published ? (Date.now() / 1000 - g.published) / 86400 : 0;
      say(`- ${g.title} — ${g.by} | ${g.plays} plays, ${age.toFixed(0)} hari${age ? ', ' + Math.round(g.plays / Math.max(age, 0.5)) + '/hari' : ''}${pfeed && !was.has(g.id) ? ' | BARU' : ''}`);
    }
  }

  const mine = read(dir, 'my-games.json'), pmine = prev && read(prev, 'my-games.json');
  say('\n## Akun sendiri');
  if (mine && pmine) {
    const days = (Date.parse(mine.at) - Date.parse(pmine.at)) / 864e5 || 1;
    const before = Object.fromEntries(pmine.games.map((g) => [g.game_id, g.plays]));
    const rows = mine.games.map((g) => ({ ...g, gain: g.plays - (before[g.game_id] ?? 0), isNew: !(g.game_id in before) })).sort((a, b) => b.gain - a.gain);
    say(`Selang ${days.toFixed(1)} hari. Total +${rows.reduce((s, g) => s + g.gain, 0)}.`);
    for (const g of rows.slice(0, 12)) say(`- ${g.title}: +${g.gain} (${Math.round(g.gain / days)}/hari), total ${g.plays}${g.isNew ? ' | BARU' : ''}`);
  } else if (mine) say(`${mine.games.length} game tersimpan, total ${mine.games.reduce((s, g) => s + g.plays, 0)} plays. Laju per hari mulai cek berikutnya.`);
  else say('my-games.json belum ada di folder ini (simpan hasil list_my_games, lalu --report).');

  const text = L.join('\n') + '\n';
  fs.writeFileSync(path.join(dir, 'report.md'), text);
  return text;
}

function selftest() {
  const assert = require('assert');
  assert.deepStrictEqual(['+1.7M', '867K', '9,449', '—', '12.6M'].map(num), [1700000, 867000, 9449, 0, 12600000]);
  assert.deepStrictEqual(diff({ a: 1, b: 2, c: { x: 1 } }, { a: 1, b: 3, d: 4, c: { x: 1 } }).map((x) => x.key).sort(), ['b', 'd']);
  console.log('selftest ok');
}

(async () => {
  if (process.argv.includes('--selftest')) return selftest();
  let all = folders();
  if (!process.argv.includes('--report')) {
    const dir = path.join(ROOT, new Date().toISOString().slice(0, 16).replace(':', ''));
    fs.mkdirSync(dir, { recursive: true });
    await capture(dir);
    all = folders();
  }
  if (!all.length) throw new Error('no snapshot yet: run without --report first');
  const dir = path.join(ROOT, all[all.length - 1]);
  console.log(report(dir, all.length > 1 ? path.join(ROOT, all[all.length - 2]) : null));
})().catch((e) => { console.error(e); process.exit(1); });
