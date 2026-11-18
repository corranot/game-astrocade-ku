// Builds one self-contained HTML file of a module game for trying on a phone outside Astrocade.
// Usage: node bundle.js <game folder> <output html>
const fs = require('fs'), path = require('path');
const [dir, out] = process.argv.slice(2);
// The module list is this game's; change it for a game with other files.
const strip = (f) => fs.readFileSync(path.join(dir, f), 'utf8').replace(/import[\s\S]*?from '[^']+';/g, '').replace(/^export /gm, '');
const cfg = fs.readFileSync(path.join(dir, 'game_config.json'), 'utf8');
const host = `window.gameConfig = ${cfg};
window.lib = { showGameParameters() {}, log() {}, haptics: { play() { try { navigator.vibrate && navigator.vibrate(12); } catch (e) {} }, start() {}, stop() {} },
  async getUserGameState() { try { return { state: JSON.parse(localStorage.getItem('dia') || 'null') }; } catch (e) { return {}; } },
  async saveUserGameState(s) { try { localStorage.setItem('dia', JSON.stringify(s)); } catch (e) {} } };`;
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8')
  .replace(/<!-- PROTOTYPE[^>]*-->\n/, '')
  .replace(/<script type="module" src="\.\/game\.js"><\/script>/, `<script>${host}\n(function(){\n${strip('art.js')}\n${strip('levels.js')}\n${strip('game.js')}\nrun('play');\n})();</script>`);
fs.writeFileSync(out, html); console.log(out, html.length, 'bytes');
