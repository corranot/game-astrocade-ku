// Players' Choice draws with random seeds (one fresh guest each). usage: node pc-seeds.js out.json N
const { enc } = require('../../../tools/row-crawl.js');
const crypto = require('crypto'), fs = require('fs');
(async () => {
  const out = process.argv[2], n = +process.argv[3], res = [];
  for (let i = 0; i < n; i++) {
    const guest = 'guest-' + crypto.randomUUID(), seed = crypto.randomInt(1, 2 ** 31);
    const u = `https://astrocade-api-prod.com/v4/feed?filter=gallery&compactToken=1&categoryPageSize=50&category=top_picks&paginationToken=${encodeURIComponent(enc({ category: 'top_picks', offset: 0, algorithm_metadata: { seed } }))}`;
    const r = await fetch(u, { method: 'POST', body: JSON.stringify({ version: 1, sentAt: Date.now(), history: [] }), headers: { 'x-guest-id': guest, authorization: guest, 'content-type': 'application/json', origin: 'https://www.astrocade.com', 'x-app-platform': 'web', 'user-country': 'US', 'user-day-n': '0', 'client-device-language': 'en' } });
    const j = await r.json();
    res.push({ t: new Date().toISOString(), seed, slateId: j.slateId, ids: j.games.map(g => g.gameId), games: Object.fromEntries(j.games.map(g => [g.gameId, g])) });
    await new Promise(r => setTimeout(r, 1000));
  }
  fs.writeFileSync(out, JSON.stringify(res)); console.log('done', res.length);
})();
