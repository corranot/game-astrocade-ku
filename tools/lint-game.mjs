#!/usr/bin/env node
// Game lint for mistakes that already happened twice (ASTROCADE.md §0). Pure Node, no dependencies.
//   FAIL shadow   : a class sets `this.X =` while the same class has a method or getter X — the field replaces the
//                   method at construction (SoundEngine `this.step = 0` broke `step()`, pelajaran 51).
//   FAIL deadcall : `=> this.NAME()` with no argument where method NAME(arg) starts with `if (!arg) return` — the call
//                   can never do anything (the BUILD! button that called tryBuild() without a pad, pelajaran 53).
//   WARN hostcfg  : window.gameConfig used as the live config without a copy — a frozen host config makes any write
//                   throw (pelajaran 52). Observation only.
// Usage: node tools/lint-game.mjs <game dir>...   exits 1 on any FAIL.   node tools/lint-game.mjs --self-test
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'with', 'constructor', 'super']);

/** Splits source into class bodies by brace matching (strings and comments are skipped roughly). */
function classes(src) {
  const out = [], re = /\bclass\s+([A-Za-z_$][\w$]*)[^{]*\{/g;
  let m;
  while ((m = re.exec(src))) {
    let depth = 1, i = re.lastIndex, q = null;
    for (; i < src.length && depth; i++) {
      const c = src[i], n = src[i + 1];
      if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
      if (c === '/' && n === '/') { i = src.indexOf('\n', i); if (i < 0) break; continue; }
      if (c === '/' && n === '*') { i = src.indexOf('*/', i + 2) + 1; continue; }
      if (c === '"' || c === "'" || c === '`') { q = c; continue; }
      if (c === '{') depth++; else if (c === '}') depth--;
    }
    const ls = src.lastIndexOf('\n', m.index) + 1, ind = /^[ \t]*/.exec(src.slice(ls))[0];
    out.push({ name: m[1], start: re.lastIndex, body: src.slice(re.lastIndex, i - 1), indent: ind + '  ' });
  }
  return out;
}
const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;

/** Methods and getters declared at the class's own top level: lines indented exactly one step (2 spaces in this
 *  repo) deeper than the `class` line. Object-literal getters inside methods sit deeper and are ignored. */
function members(body, indent) {
  const names = new Map(), re = new RegExp(`^${indent}(?:static\\s+)?(?:async\\s+)?(?:get\\s+|set\\s+)?([A-Za-z_$][\\w$]*)\\s*\\(([^)]*)\\)\\s*\\{`, 'gm');
  let m;
  while ((m = re.exec(body))) if (!KEYWORDS.has(m[1])) names.set(m[1], { params: m[2], at: m.index, end: re.lastIndex });
  return names;
}

export function lintSource(src, file) {
  const findings = [];
  for (const cls of classes(src)) {
    const meth = members(cls.body, cls.indent);
    // shadow: this.X = ... (not ==, not a bind of the same method)
    const re = /this\.([A-Za-z_$][\w$]*)\s*=(?!=)\s*([^;\n]*)/g;
    let m;
    const seen = new Set();
    while ((m = re.exec(cls.body))) {
      const name = m[1];
      if (!meth.has(name) || seen.has(name)) continue;
      if (new RegExp(`^this\\.${name}\\.bind\\(`).test(m[2].trim())) continue;
      seen.add(name);
      findings.push({ level: 'FAIL', rule: 'shadow', file, line: lineOf(src, cls.start + m.index), msg: `${cls.name}: field this.${name} replaces method ${name}()` });
    }
    // deadcall: => this.NAME() where NAME(arg) { if (!arg) return
    const dead = new Set();
    for (const [name, info] of meth) {
      const p = info.params.split(',')[0].trim();
      if (!/^[A-Za-z_$][\w$]*$/.test(p)) continue;
      const head = cls.body.slice(info.end, info.end + 160);
      if (new RegExp(`^\\s*if\\s*\\(\\s*!\\s*${p}\\s*\\)\\s*return\\b`).test(head)) dead.add(name);
    }
    if (dead.size) {
      const call = /=>\s*\{?\s*this\.([A-Za-z_$][\w$]*)\(\s*\)/g;
      while ((m = call.exec(cls.body))) if (dead.has(m[1])) findings.push({ level: 'FAIL', rule: 'deadcall', file, line: lineOf(src, cls.start + m.index), msg: `${cls.name}: this.${m[1]}() is called with no argument but returns at once without one` });
    }
  }
  // hostcfg: the host's object kept as the live config
  const hc = /(?:this\.cfg|cfg)\s*=\s*window\.gameConfig\b|new\s+[A-Z][\w$]*\([^()]*\bwindow\.gameConfig\s*[,)]/g;
  let h;
  while ((h = hc.exec(src))) findings.push({ level: 'WARN', rule: 'hostcfg', file, line: lineOf(src, h.index), msg: 'window.gameConfig used directly as the live config (copy it: a frozen host config makes writes throw)' });
  return findings;
}

/** Game source files: every .js/.mjs except scripts that drive a browser or read files (tests and build tools). */
export function gameFiles(dir) {
  return fs.readdirSync(dir).filter((f) => /\.(m?js)$/.test(f)).map((f) => path.join(dir, f)).filter((f) => {
    const s = fs.readFileSync(f, 'utf8');
    return !/require\(['"](playwright|fs)['"]\)|from ['"]node:/.test(s) && !/\.test\.m?js$/.test(f);
  });
}

function selfTest() {
  const fx = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'lint');
  const want = { 'shadow.js': ['shadow'], 'deadcall.js': ['deadcall'], 'hostcfg.js': ['hostcfg'], 'clean.js': [] };
  let ok = true;
  for (const [f, rules] of Object.entries(want)) {
    const got = lintSource(fs.readFileSync(path.join(fx, f), 'utf8'), f).map((x) => x.rule).sort();
    const pass = JSON.stringify(got) === JSON.stringify([...rules].sort());
    console.log(`${pass ? 'ok  ' : 'FAIL'} lint self-test ${f}: ${got.join(',') || 'clean'}`);
    if (!pass) ok = false;
  }
  return ok;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args[0] === '--self-test') process.exit(selfTest() ? 0 : 1);
  let fail = false;
  for (const dir of args) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;
    for (const f of gameFiles(dir)) for (const x of lintSource(fs.readFileSync(f, 'utf8'), f)) {
      console.log(`${x.level} lint-${x.rule} ${x.file}:${x.line} ${x.msg}`);
      if (x.level === 'FAIL') fail = true;
    }
  }
  process.exit(fail ? 1 : 0);
}
