/** Pure save/progression helpers. Legacy saves contain 20-level rounds; the current game has 25. */
export function migrateLegacyLevel(level) {
  if (!Number.isInteger(level) || level < 0) return 0;
  // Level 20 is the old first-run chapter-4 finish, so it now leads straight into Snowy Day.
  if (level <= 20) return level;
  const oldRound = Math.floor(level / 20), offset = level % 20;
  return oldRound * 25 + offset;
}
/** The next uncollected stickers in the earliest unfinished six-sticker set. */
export function stickerChoices(collected, count, setSize = 6) {
  for (let start = 0; start < count; start += setSize) {
    const left = [];
    for (let id = start; id < Math.min(count, start + setSize); id++) if (!collected.includes(id)) left.push(id);
    if (left.length) return left;
  }
  return [];
}
