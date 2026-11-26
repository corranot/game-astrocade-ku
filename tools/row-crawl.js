#!/usr/bin/env node
// Row crawl: reads every Astrocade home row in full, as a guest, at a polite rate (one request per 0.8 s).
// Endpoint (SEEN in the web app, 2026-11-26): POST astrocade-api-prod.com/v4/feed?filter=gallery&category=<row>
// with a base64 JSON paginationToken {category, offset, algorithm_metadata:{seed}} and guest headers.
// Usage: node tools/row-crawl.js <outFile.json> [row ...]   (default: the special rows and all themes)
//        node tools/row-crawl.js --selftest                 (checks the token round trip, no network)
const fs = require('fs');
const crypto = require('crypto');

const ROWS = ['recommended_for_you', 'trending', 'top_picks', 'action', 'adventure', 'arcade', 'cooking', 'farm',
  'horror', 'meme', 'platformer', 'puzzle', 'rhythm', 'simulation', 'sports', 'survival', 'tactics', 'zen',
  'incremental', 'creative', 'educational', 'merge', 'chat', 'toys'];
const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64');
const dec = (s) => JSON.parse(Buffer.from(s, 'base64').toString());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** One page of one row. The guest id doubles as the authorization header, as the web app does. */
async function page(guest, cat, tok) {
  await sleep(800);
  const u = `https://astrocade-api-prod.com/v4/feed?filter=gallery&compactToken=1&categoryPageSize=50&category=${cat}&paginationToken=${encodeURIComponent(enc(tok))}`;
  const r = await fetch(u, { method: 'POST', body: JSON.stringify({ version: 1, sentAt: Date.now(), history: [] }), headers: {
    'x-guest-id': guest, authorization: guest, 'client-device-language': 'en', 'user-country': 'US', 'user-timezone': 'UTC',
    'user-day-n': '0', 'x-app-platform': 'web', 'content-type': 'application/json', origin: 'https://www.astrocade.com' } });
  return r.json();
}

/** All games of one row, in served order. */
async function row(guest, cat) {
  const ids = [], games = {};
  let tok = { category: cat, offset: 0, algorithm_metadata: { seed: 12345 } }, label;
  for (let i = 0; i < 60; i++) {
    const j = await page(guest, cat, tok);
    if (!j.games) break; // an unknown or empty row answers with the whole gallery instead
    label = label || j.label;
    for (const g of j.games) if (!games[g.gameId]) { ids.push(g.gameId); games[g.gameId] = g; }
    if (!j.hasMore || !j.games.length || !j.paginationToken) break;
    tok = dec(j.paginationToken);
  }
  return { label, ids, games };
}

if (process.argv[2] === '--selftest') {
  const t = { category: 'top_picks', offset: 20, algorithm_metadata: { seed: 1 } };
  if (JSON.stringify(dec(enc(t))) !== JSON.stringify(t)) throw new Error('token round trip failed');
  console.log('selftest ok');
} else if (require.main === module) {
  (async () => {
    const out = process.argv[2] || 'rows.json', cats = process.argv.slice(3).length ? process.argv.slice(3) : ROWS;
    const guest = 'guest-' + crypto.randomUUID(), res = {};
    for (const c of cats) { res[c] = await row(guest, c); console.log(c, res[c].label, res[c].ids.length); }
    fs.writeFileSync(out, JSON.stringify(res));
  })();
}
module.exports = { row, enc, dec };
