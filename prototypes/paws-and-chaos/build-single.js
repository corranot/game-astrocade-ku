// PROTOTYPE - NOT FOR PRODUCTION
// Builds one self-contained HTML file of the game: page + config + game.js inlined, Three.js from cdnjs, fonts from
// Google Fonts, and a stand-in host whose save lives in this browser (outside Astrocade).
// Usage: node build-single.js <out.html> [--artifact]   (--artifact leaves out doctype/html/head/body tags)
const fs = require('fs'), path = require('path'), vm = require('vm');
const [out, flag] = process.argv.slice(2);
if (!out) { console.error('usage: node build-single.js <out.html> [--artifact]'); process.exit(1); }
const dir = __dirname;
const page = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const game = fs.readFileSync(path.join(dir, 'game.js'), 'utf8');
const cfg = JSON.parse(fs.readFileSync(path.join(dir, 'game_config.json'), 'utf8'));
delete cfg.persistent_storage_config;
const host = `window.gameConfig = ${JSON.stringify(cfg)};
(function () {
  var KEY = 'paws-and-chaos-save';
  window.lib = { showGameParameters: function () {}, log: function () {},
    getUserGameState: function () { return new Promise(function (ok) { var s = null; try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; } ok({ state: s }); }); },
    saveUserGameState: function (s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private window */ } return Promise.resolve({}); },
    addPlayerScoreToLeaderboard: function () { return Promise.resolve({}); }, getTopNEntriesFromLeaderboard: function () { return Promise.resolve({}); },
    shouldUseTouchControls: function () { return matchMedia('(pointer: coarse)').matches; },
    haptics: { play: function () { try { navigator.vibrate && navigator.vibrate(12); } catch (e) { /* none */ } }, start: function () {}, stop: function () {} } };
})();`;
const code = `${host}\n${game}\nrun('play');`;
new vm.Script(code.replace(/^\s*(import|export)\b.*$/gm, ''), { filename: 'game' }); // a syntax error never gets written
const fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@800&family=Baloo+Bhaijaan+2:wght@800&family=Baloo+Da+2:wght@800&display=swap">';
let html = page
  .replace(/<!-- PROTOTYPE - NOT FOR PRODUCTION -->\n/, '')
  .replace(/(<link rel="stylesheet" data-font[^>]*>\n?)+/, fonts + '\n')
  .replace('<script type="module" src="./game.js"></script>', () => `<script type="module">\n${code.replace(/<\/script/gi, '<\\/script')}\n</script>`);
if (flag === '--artifact') {
  const title = html.match(/<title>[^<]*<\/title>/)[0], style = html.match(/<style>[\s\S]*?<\/style>/)[0];
  const links = (html.match(/<link [^>]*>/g) || []).join('\n');
  const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
  html = `${title}\n${links}\n${style}\n${body}`;
}
fs.writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
