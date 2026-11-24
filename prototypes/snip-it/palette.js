// PROTOTYPE - NOT FOR PRODUCTION
// Snip It level-writing helpers shared by the world packs (w_*.js): rope colours and short forms for the parts of
// a level. The stage is 6.4 wide (x -3.2..3.2), the floor is y = 0, ceiling hooks hang at y = 8.7.

export const RED = 0xff4d5e, BLUE = 0x2f9bff, YELLOW = 0xffc61a, GREEN = 0x3fcf6a, PURPLE = 0xa86bff;
/** x of three ropes side by side, and of four. */
export const X3 = [-2.0, 0, 2.0], X4 = [-2.4, -0.8, 0.8, 2.4];
/** A rope from a ceiling hook at x (or from a floor peg when y is given low). */
export const rope = (x, color, y = 8.7) => ({ ax: x, ay: y, color });
/** A roped thing: model, centre, radius; extra: { m, rest, lift, color }. */
export const thing = (model, x, y, r = 0.46, extra = {}) => ({ model, x, y, r, m: 0.9, ...extra });
/** Where a cut thing lands: centre and how close counts. */
export const at = (x, y, r = 0.6) => ({ x, y, r });
