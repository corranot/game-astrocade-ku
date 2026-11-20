// PROTOTYPE - NOT FOR PRODUCTION
// Unit tests of the soap rules (GDD §4, §5) on fixed masks. Run: node soap.test.mjs
import { makeSoap, carve, trimRows, takeIslands, shapeScore, sparkleScore, verdict, edgeCells, meanRough, sponge, encodeMask, decodeMask, carvedShare, signedDistance } from './soap.js';

let failed = 0;
const ok = (c, what) => { console.log((c ? '  ok  ' : '  FAIL ') + what); if (!c) failed++; };
const near = (a, b, e = 1e-3) => Math.abs(a - b) < e;
const K = { protect: 3, core: 8, tol: 10, bevel: 6, depth: 20, margin: 16, shadowX: 6, shadowY: 6 };
const W = 100, H = 100;
/** A full bar and a square template from lo to hi (inclusive). */
function square(lo, hi) {
  const bar = new Uint8Array(W * H).fill(1), t = new Uint8Array(W * H);
  for (let y = lo; y <= hi; y++) for (let x = lo; x <= hi; x++) t[y * W + x] = 1;
  return makeSoap(W, H, bar, t, K);
}

console.log('signed distance');
{ const S = square(30, 69); ok(S.sd[50 * W + 50] > 15 && S.sd[0] < -25, 'positive inside, negative outside'); ok(near(S.sd[50 * W + 30], 0.5, 0.01) && near(S.sd[50 * W + 29], -0.5, 0.01), '±0.5 on the line'); }

console.log('shape score (§4)');
{
  const S = square(30, 69); // 1,600 template cells, 8,400 outside cells
  for (let i = 0; i < W * H; i++) if (!S.t[i]) S.m[i] = 0; // perfectly carved
  ok(near(shapeScore(S).shape, 1), 'perfect carve = 1');
  for (let y = 30; y < 34; y++) for (let x = 30; x < 70; x++) S.m[y * W + x] = 0; // 160 template cells lost
  ok(near(shapeScore(S).cover, 0.9), 'cover = kept / template (0.9)');
  let left = 0; for (let y = 0; y < 15 && left < 168; y++) for (let x = 0; x < W && left < 168; x++) { S.m[y * W + x] = 1; left++; } // 168 cells beyond the band
  const s = shapeScore(S);
  ok(near(s.excess, 168 / 8400) && near(s.shape, 0.9 - 1.5 * 0.02), 'shape = cover − 1.5 × excess (0.87)');
  for (let x = 30; x < 70; x++) S.m[25 * W + x] = 1; // inside the tolerance band: not counted
  ok(near(shapeScore(S).excess, 168 / 8400), 'soap within the tolerance band is not excess');
}

console.log('sparkle, total, stars (GDD worked example)');
{
  const sp = sparkleScore(14, 1, 18);
  ok(near(sp, 0.667, 0.001), 'sparkle(14 specks, 1 gem) = 0.667');
  const v = verdict(0.875, 0.94, sp); ok(near(v.v, 0.849, 0.001) && v.stars === 2, 'v = 0.849 → 2 stars');
  const v2 = verdict(0.875, 0.94, sparkleScore(14, 2, 18)); ok(near(v2.v, 0.889, 0.001) && v2.stars === 3, 'one more gem → 0.889 → 3 stars');
  ok(sparkleScore(100, 9, 18) === 1, 'sparkle caps at 1');
  ok(verdict(0, 0, 0).stars === 1, 'never fewer than 1 star (no fail)');
}

console.log('knife rules (§3.3, §5)');
{
  const S = square(30, 69);
  const a = carve(S, 5, 5, 25, 5, 8, false);
  ok(a.removed > 0 && a.outside === a.removed, 'outside the line comes off');
  ok(carvedShare(S) > 0 && carvedShare(S) < 1, 'carved share counts outside cells');
  const deep = S.m.filter((v, i) => S.sd[i] > K.core).length;
  for (let j = 0; j < 40; j++) carve(S, 30, 30 + j, 69, 69 - j, 16, true); // wild fast slashes across the shape
  ok(S.m.filter((v, i) => v && S.sd[i] > K.core).length === deep, 'the core can never be carved');
  const S2 = square(30, 69), slow = carve(S2, 45, 50, 55, 50, 8, false);
  ok(slow.removed === 0 && slow.skid > 0, 'a slow stroke inside the line only skids');
  const fast = carve(S2, 40, 36, 60, 36, 8, true);
  ok(fast.nick > 0 && S2.nicks === 1, 'a fast slip inside nicks (oops)');
  ok(shapeScore(S2).cover < 1, 'a nick lowers Shape');
}

console.log('islands fall off as chunks');
{
  const S = square(30, 69);
  for (let y = 0; y < H; y += 3) carve(S, 15, y, 15, y + 3, 4, false); // a groove from top to bottom, left of the shape
  const isl = takeIslands(S);
  ok(isl.length >= 1 && isl[0].x1 < 15, 'the left strip is cut loose');
  ok(isl[0].cells.every((i) => S.m[i] === 0), 'its cells leave the soap');
  ok(S.m[50 * W + 50] === 1, 'the body stays');
  ok(takeIslands(S).length === 0, 'nothing more falls');
}

console.log('auto-trim, smoothing');
{
  const S = square(30, 69);
  trimRows(S, 0, H - 1);
  ok(carvedShare(S) === 1 && shapeScore(S).shape === 1, 'trim removes everything outside');
  const e = edgeCells(S);
  ok(e.length > 0 && near(meanRough(S, e), 1, 0.05), 'trimmed edges are rough');
  for (let k = 0; k < 400; k++) sponge(S, 30 + (k * 7) % 40, k % 2 ? 31 : 68, 6, 2.2, 0.05), sponge(S, k % 2 ? 31 : 68, 30 + (k * 7) % 40, 6, 2.2, 0.05);
  ok(meanRough(S, e) < 0.1, 'sponging smooths the edges');
}

console.log('compact save');
{
  const S = square(30, 69); trimRows(S, 0, H - 1);
  const code = encodeMask(S, 20, 20), m = decodeMask(code, W, H, 20, 20);
  let same = 0; for (let i = 0; i < m.length; i++) same += m[i] === S.m[i];
  ok(same / m.length > 0.97, 'round trip keeps the shape (' + (same / m.length * 100).toFixed(1) + '%)');
  ok(decodeMask('zz,zz,zz', W, H, 20, 20) === null && decodeMask(42, W, H) === null, 'a bad string is refused');
}
{ const t = new Uint8Array(9); t[4] = 1; const sd = signedDistance(t, 3, 3); ok(sd[4] > 0 && sd[0] < 0, 'tiny template'); }

console.log(failed ? `\n${failed} FAILED` : '\nall soap rules pass');
process.exit(failed ? 1 : 0);
