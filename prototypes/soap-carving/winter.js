/** Pure seasonal unlock rules. Existing shapes stay in their original pool before unlock. */
export function orderShape(n, freeCarve, freeAfter, shapes, randomSlot = () => 0) {
  const winter = shapes.filter((shape) => shape.winter);
  const available = shapes.filter((shape) => !shape.winter || n >= freeAfter);
  // Preserve the existing seeded order-roll cadence even when a winter order is deliberately scheduled.
  const roll = n >= 2 && !freeCarve ? randomSlot(available.length) : 0;
  if (freeCarve && n >= freeAfter && winter.length) return winter[(n - freeAfter) % winter.length].id;
  if (!freeCarve && n >= freeAfter && n < freeAfter + winter.length) return winter[n - freeAfter].id;
  if (freeCarve) return 'free';
  if (n === 0) return 'heart';
  if (n === 1) return 'star';
  return available[(n * 3 + roll) % available.length]?.id || 'heart';
}

/** One guaranteed winter marble on unlock and the second two soaps later. */
export function winterMarble(n, freeAfter = 6) {
  if (n === freeAfter) return 'frost';
  if (n === freeAfter + 2) return 'candy_cane';
  return null;
}

