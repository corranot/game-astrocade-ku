// PROTOTYPE - NOT FOR PRODUCTION
/**
 * The rolled-ice-cream curl, as plain math (no THREE): a lane of the frozen sheet is pushed by the scraper and
 * winds up like a carpet into an Archimedean spiral r(θ) = a + bθ. The first scraped cream is the innermost turn,
 * so the player's drawing really ends up inside the roll. Unit-tested in logic.test.mjs.
 *
 * Lane coordinates: s = distance of a strip of cream from the lane's start edge (0..L), p = how far the scraper
 * has pushed (0..L). Result [d, y]: d = position along the push direction, y = height above the plate.
 */

/** Spiral angle θ at which the arc length from the inner start equals u (a = inner radius, b = growth per radian). */
export function spiralTheta(u, a, b) {
  if (u <= 0) return 0;
  return (-a + Math.sqrt(a * a + 2 * b * u)) / b;
}
/** Outer radius of a roll holding length p of cream. */
export const rollRadius = (p, a, b) => a + b * spiralTheta(p, a, b);

/**
 * Where the cream at distance s sits once the scraper has pushed to p: flat ahead of the scraper, wound behind it.
 * The roll stands on the plate at d = p (touching at its outer end) and the cream peels into it without a kink.
 */
export function rollPoint(s, p, a, b) {
  if (s >= p) return [s, 0];
  const tp = spiralTheta(p, a, b), R = a + b * tp;
  const t = spiralTheta(s, a, b), r = a + b * t, psi = tp - t;
  return [p - r * Math.sin(psi), R - r * Math.cos(psi)];
}

/** Points of the end-cap spiral of a roll of length p: [d, y, s] per sample, n samples from the inside out. */
export function capSpiral(p, a, b, n) {
  const out = [];
  for (let i = 0; i <= n; i++) { const s = (p * i) / n; const [d, y] = rollPoint(s, p, a, b); out.push([d, y, s]); }
  return out;
}
