// Builds one self-contained page of a module game, in the form an artifact is published from
// (no doctype, html, head or body tags), so the owner can try the game on a phone outside Astrocade.
// Usage: node tools/single-file.js <game folder> <output html> [module files in load order]
const fs = require('fs'), path = require('path');
const [dir, out, ...mods] = process.argv.slice(2);
const files = mods.length ? mods : ['art.js', 'levels.js', 'game.js'];
const src = (f) => fs.readFileSync(path.join(dir, f), 'utf8').replace(/import[\s\S]*?from '[^']+';/g, '').replace(/^export /gm, '');
const page = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const title = (page.match(/<title>([^<]*)<\/title>/) || [, 'Game'])[1], bg = (page.match(/background:(#[0-9a-fA-F]{3,8})/) || [, '#3EC5FF'])[1];
const key = 'save-' + path.basename(path.resolve(dir));
// stands in for the Astrocade host: config from the file, save in this browser only
const host = `window.gameConfig = ${fs.readFileSync(path.join(dir, 'game_config.json'), 'utf8')};
window.lib = { showGameParameters() {}, log() {}, haptics: { play() { try { navigator.vibrate && navigator.vibrate(12); } catch (e) {} }, start() {}, stop() {} },
  async getUserGameState() { try { return { state: JSON.parse(localStorage.getItem('${key}') || 'null') }; } catch (e) { return {}; } },
  async saveUserGameState(s) { try { localStorage.setItem('${key}', JSON.stringify(s)); } catch (e) {} },
  async addPlayerScoreToLeaderboard() {}, async getTopNEntriesFromLeaderboard() { return {}; } };`;
fs.writeFileSync(out, `<title>${title}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
/* One screen, one look: the game canvas centred on the game's own background colour. */
:root { --bg: ${bg}; color-scheme: light }
html, body { height: 100% }
body { margin: 0; background: var(--bg); overflow: hidden; box-sizing: border-box; display: flex;
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)) }
canvas { display: block; margin: auto; max-height: 100%; max-width: 100%; aspect-ratio: 9 / 16; touch-action: none; border-radius: 18px }
</style>
<canvas id="game" width="720" height="1280"></canvas>
<script>
${host}
(function () {
${files.map(src).join('\n')}
run('play');
})();
</script>
`);
console.log(out, fs.statSync(out).size, 'bytes');
