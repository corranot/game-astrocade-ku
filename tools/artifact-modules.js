// Builds an artifact page for a game made of ES modules (index.html loading ./game.js), so the owner can try it
// on a phone outside Astrocade. The page keeps index.html's style and #app, stands in for the Astrocade host
// (config inlined, save in this browser only) and imports ./game.js, which the artifact serves next to the page.
// Usage: node tools/artifact-modules.js <game folder> <output page.html>
// Then publish the page with `files` mapping each module (game.js and what it imports) to the game folder.
const fs = require('fs'), path = require('path');
const [dir, out] = process.argv.slice(2);
if (!dir || !out) { console.error('usage: node tools/artifact-modules.js <game folder> <output page.html>'); process.exit(1); }

const page = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const title = (page.match(/<title>([^<]*)<\/title>/) || [, 'Game'])[1];
const style = (page.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1];
const importMap = (page.match(/<script type="importmap">[\s\S]*?<\/script>/) || [''])[0]; // bare imports such as 'three'
const libLoader = (page.match(/<script type="module" data-lib>[\s\S]*?<\/script>/) || [''])[0]; // puts libraries on window
// web fonts: artifacts load stylesheets only from Google Fonts, so data-font links become one Google Fonts link
const fontFamilies = [...page.matchAll(/<link[^>]*data-font[^>]*@fontsource\/([a-z0-9-]+)@/g)].map((m) => m[1]);
const fontLink = fontFamilies.length ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${[...new Set(fontFamilies)].map((f) => 'family=' + f.split('-').map((w) => /^\d+$/.test(w) ? w : w[0].toUpperCase() + w.slice(1)).join('+') + ':wght@600;800').join('&')}&display=swap">` : '';
if (page.includes('data-font') && !fontLink) { console.error('index.html has data-font links this tool could not read'); process.exit(1); }
// a page that uses an import map or a library loader must have them copied, or the artifact waits forever
if (!style) { console.error('index.html has no <style> block'); process.exit(1); }
if (page.includes('importmap') && !importMap) { console.error('index.html has an import map this tool could not read (expects <script type="importmap">)'); process.exit(1); }
if (page.includes('data-lib') && !libLoader) { console.error('index.html has a data-lib loader this tool could not read (expects <script type="module" data-lib>)'); process.exit(1); }
const cfg = JSON.parse(fs.readFileSync(path.join(dir, 'game_config.json'), 'utf8'));
delete cfg.persistent_storage_config; // the host keeps this key out of window.gameConfig
const key = 'save-' + path.basename(path.resolve(dir));
// images and sounds the game folder keeps a copy of (e.g. icons.webp for asset 'icons'): served next to the page,
// because an artifact cannot load them from the Astrocade CDN. Publish them with the modules.
const localAssets = Object.fromEntries(fs.readdirSync(dir).filter((f) => /\.(webp|png|jpg|mp3|ogg)$/.test(f)).map((f) => [f.replace(/\.[^.]+$/, ''), { url: './' + f, type: /\.(mp3|ogg)$/.test(f) ? 'audio' : 'image' }]));

const html = `<title>${title}</title>
${fontLink}
<style>${style}</style>
<div id="app"></div>
${importMap}
${libLoader}
<script>
window.gameConfig = ${JSON.stringify(cfg)};
window.lib = { showGameParameters() {}, log() {}, getAsset(id) { return ${JSON.stringify(localAssets)}[id]; },
  shouldUseTouchControls() { return matchMedia('(pointer: coarse)').matches || !matchMedia('(hover: hover)').matches; },
  haptics: { play() { try { if (navigator.userActivation && navigator.userActivation.hasBeenActive && navigator.vibrate) navigator.vibrate(15); } catch (e) {} }, start() {}, stop() {} },
  async getUserGameState() { try { return { state: JSON.parse(localStorage.getItem('${key}') || 'null') }; } catch (e) { return {}; } },
  async saveUserGameState(s) { try { localStorage.setItem('${key}', JSON.stringify(s)); } catch (e) {} },
  async addPlayerScoreToLeaderboard() { return {}; }, async getTopNEntriesFromLeaderboard() { return {}; } };
</script>
<script type="module">
import './game.js';
window.run('play');
</script>
`;
fs.writeFileSync(out, html);
console.log('wrote', out);
