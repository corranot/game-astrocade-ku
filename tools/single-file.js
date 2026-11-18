// Builds one self-contained page of a module game, in the form an artifact is published from
// (no doctype, html, head or body tags), so the owner can try the game on a phone outside Astrocade.
// Each module keeps its own scope, as it would in the browser, and the result is parsed before it is written.
// Usage: node tools/single-file.js <game folder> <output html> [module files in load order]
const fs = require('fs'), path = require('path'), vm = require('vm');
const [dir, out, ...mods] = process.argv.slice(2);
const files = mods.length ? mods : ['art.js', 'levels.js', 'game.js'];

/** One module as a function scope: its imports read from the shared table, its exports are added to it. */
function wrap(f) {
  let src = fs.readFileSync(path.join(dir, f), 'utf8');
  const names = [];
  src = src.replace(/import\s*\{([\s\S]*?)\}\s*from\s*'[^']+';/g, (_, list) => `const {${list}} = __m;`);
  src = src.replace(/^export\s+(function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm, (_, kind, name) => { names.push(name); return `${kind} ${name}`; });
  src = src.replace(/^export\s+const\s+/gm, 'const '); // a list like "export const A = 1, B = 2" adds its other names below
  for (const m of src.matchAll(/^const\s+([A-Z][A-Z0-9_]*\s*=[^;]*);/gm)) for (const part of m[1].split(/,\s*(?=[A-Z][A-Z0-9_]*\s*=)/)) { const n = part.split('=')[0].trim(); if (!names.includes(n) && /^[A-Z][A-Z0-9_]*$/.test(n)) names.push(n); }
  return `// ---- ${f}\n(() => {\n${src}\nObject.assign(__m, { ${names.join(', ')} });\n})();`;
}

const page = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const title = (page.match(/<title>([^<]*)<\/title>/) || [, 'Game'])[1], bg = (page.match(/background:(#[0-9a-fA-F]{3,8})/) || [, '#3EC5FF'])[1];
const key = 'save-' + path.basename(path.resolve(dir));
// stands in for the Astrocade host: config from the file, save in this browser only
const host = `window.gameConfig = ${fs.readFileSync(path.join(dir, 'game_config.json'), 'utf8')};
window.lib = { showGameParameters() {}, log() {}, haptics: { play() { try { navigator.vibrate && navigator.vibrate(12); } catch (e) {} }, start() {}, stop() {} },
  async getUserGameState() { try { return { state: JSON.parse(localStorage.getItem('${key}') || 'null') }; } catch (e) { return {}; } },
  async saveUserGameState(s) { try { localStorage.setItem('${key}', JSON.stringify(s)); } catch (e) {} },
  async addPlayerScoreToLeaderboard() {}, async getTopNEntriesFromLeaderboard() { return {}; } };`;
const script = `${host}\nconst __m = {};\n${files.map(wrap).join('\n')}\nrun('play');`;
new vm.Script(script, { filename: out }); // throws on a syntax error, so a broken page is never written
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
${script}
</script>
`);
console.log(out, fs.statSync(out).size, 'bytes');
