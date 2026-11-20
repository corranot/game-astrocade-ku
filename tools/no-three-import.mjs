// Imports every game module of one folder with no THREE global, as the Astrocade bundle runs them before three.js
// arrives. A module that touches THREE at its top level fails here. Usage: node tools/no-three-import.mjs <game folder>
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = resolve(process.argv[2] || '.');
const mods = readdirSync(dir).filter((f) => f.endsWith('.js') && !/require\(['"]playwright/.test(readFileSync(join(dir, f), 'utf8')));
globalThis.window = globalThis; // game.js registers window.run when imported
const bad = [];
for (const f of mods) {
  try { await import(pathToFileURL(join(dir, f)).href); } catch (e) { if (/THREE is not defined/.test(e.message)) bad.push(`${f}: ${e.message}`); }
}
if (bad.length) { console.log(bad.join('\n')); process.exit(1); }
console.log(`ok: ${mods.length} modules import without THREE (${dir})`);
