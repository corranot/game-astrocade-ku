/* Rub It Away level data: the original 60 plain-table scenes remain unchanged; six Snow World scenes extend the campaign to 66. Each definition contains a background, localized prompt/win keys, optional weather, and its target/actors/decoys. */
const BOB = (a, s) => ({ bob: [a, s] });
const T = (id, asset, x, y, w, role, o = {}) => Object.assign({ id, asset, x, y, w, role, erasable: role !== 'actor', ay: 0.5 }, o);
const ACTOR = (asset, after, x, y, w, o = {}) => T('actor', asset, x, y, w, 'actor', Object.assign({ after, main: true, ay: 1, idle: { breathe: [0.022, 2.1], sway: [0.03, 1.1] } }, o));
const GROUND = 1020;

export const LEVELS = [
  {
    n: 1, bg: 'bg_garden', prompt: 'p1', win: 'w1', gloom: true,
    weather: { kind: 'rain', x: 360, y: 520, w: 380, h: 440 },
    things: [
      T('sun', 'sun', 360, 445, 220, 'actor', { show: 'peek', peekScale: 0.9, ar: 0.994, idle: { sway: [0.12, 0.8], breathe: [0.02, 2.2] } }),
      ACTOR('flower_sad', 'flower_happy', 360, 940, 236, { afterW: 262, ar: 0.627, mood: 'sad' }),
      T('cloud', 'cloud', 360, 400, 430, 'target', { ar: 1.34, idle: BOB(6, 1.7), crumb: '#4174d3' }),
    ],
  },
  {
    n: 2, bg: 'bg_garden', prompt: 'p2', win: 'w2',
    things: [
      ACTOR('cat_annoyed', 'cat_sleeping', 360, 900, 470, { ay: 0.5, ar: 1.2, mood: 'sad', afterBreathe: 0.04 }),
      T('mosquito', 'mosquito', 360, 620, 150, 'target', { ar: 1, idle: { orbit: [190, 1.25, 120], jitter: 3 }, crumb: '#622499' }),
    ],
  },
  {
    n: 3, bg: 'bg_garden', prompt: 'p3', win: 'w3',
    things: [
      T('puppy', 'puppy_happy', 360, 900, 170, 'actor', { main: true, show: 'peek', ar: 1, idle: { breathe: [0.025, 2.6], sway: [0.04, 1.4] } }),
      T('bush_l', 'bush', 165, 890, 230, 'decoy', { ar: 1.1, idle: { sway: [0.015, 1.2] }, crumb: '#2d9f25', react: { reveal: { asset: 'frog', w: 170, dy: -70, ar: 1 }, say: 'r_croak', sfx: 'croak', kick: { on: 'self', type: 'wobble' } } }),
      T('bush_m', 'bush', 360, 890, 230, 'target', { ar: 1.1, clue: 'heart', idle: { sway: [0.015, 1.5] }, crumb: '#2d9f25' }),
      T('bush_r', 'bush', 555, 890, 230, 'decoy', { ar: 1.1, idle: { sway: [0.015, 1.8] }, crumb: '#2d9f25', react: { reveal: { asset: 'hedgehog_grumpy', w: 170, dy: -70, ar: 1 }, say: 'r_grumpy', sfx: 'boing', kick: { on: 'self', type: 'shake' } } }),
    ],
  },
  {
    n: 4, bg: 'bg_garden', prompt: 'p4', win: 'w4',
    things: [
      T('branch', 'branch', 330, 360, 500, 'decoy', { ar: 2.4, idle: { sway: [0.01, 0.9] }, crumb: '#995924', react: { say: 'r_creak', sfx: 'boing', kick: { on: 'cage', type: 'swing' } } }),
      ACTOR('bird_sad', 'bird_happy', 330, 770, 150, { ay: 0.5, ar: 1, mood: 'sad', fixMove: { dy: -190 } }),
      T('cage', 'cage', 330, 660, 300, 'target', { ar: 0.85, idle: { sway: [0.02, 1.2] }, crumb: '#c99a2e' }),
      T('cat', 'cat_annoyed', 565, 1010, 230, 'decoy', { ar: 1.2, ay: 1, idle: { breathe: [0.02, 2], sway: [0.02, 1] }, crumb: '#c96d2a', react: { say: 'r_bow', sfx: 'boing', swap: { asset: 'cat_bow', w: 170 }, kick: { on: 'self', type: 'hop' } } }),
    ],
  },
  {
    n: 5, bg: 'bg_garden', prompt: 'p5', win: 'w5', lift: 100,
    weather: { kind: 'steam', x: 330, y: 700, w: 180, h: 80 },
    things: [
      ACTOR('snowman_sad', 'snowman_happy', 330, 940, 300, { ar: 0.78, mood: 'sad' }),
      T('sun_hot', 'sun_hot', 500, 380, 300, 'target', { ar: 1, idle: { sway: [0.1, 1], breathe: [0.03, 3] }, crumb: '#d9541f' }),
      T('snowcloud', 'snowcloud', 170, 470, 250, 'decoy', { ar: 1.3, idle: BOB(7, 1.3), crumb: '#5183d6', react: { say: 'r_brr', sfx: 'boing', kick: { on: 'actor', type: 'shiver' } } }),
      T('broom', 'broom', 610, 940, 110, 'decoy', { ar: 0.3, ay: 1, idle: { sway: [0.03, 1.1] }, crumb: '#b78a2a', react: { say: 'r_achoo', sfx: 'sneeze', kick: { on: 'actor', type: 'hop' } } }),
    ],
  },
  {
    n: 6, bg: 'bg_garden', prompt: 'p6', win: 'w6',
    things: [
      ACTOR('snail', 'snail_win', 150, GROUND, 220, { ar: 1.2, flip: true, idle: { breathe: [0.03, 2.4], sway: [0.02, 1.3] }, fixMove: { dx: 330 } }),
      T('rock', 'rock', 400, GROUND, 230, 'target', { ar: 1.2, ay: 1, idle: { breathe: [0.012, 1.9], sway: [0.008, 1.3] }, crumb: '#aa6a28' }),
      T('rabbit', 'rabbit', 300, 700, 180, 'decoy', { ar: 1.1, idle: { bob: [14, 2.2], breathe: [0.03, 3] }, crumb: '#c9902f', react: { say: 'r_cool', sfx: 'boing', swap: { asset: 'rabbit_shades', w: 130 }, kick: { on: 'self', type: 'hop' } } }),
      T('flag', 'flag', 590, 840, 120, 'decoy', { ar: 0.55, idle: { sway: [0.05, 2.2] }, crumb: '#cb3030', react: { say: 'r_lost', sfx: 'boing', kick: { on: 'actor', type: 'wobble' } } }),
    ],
  },
  {
    n: 7, bg: 'bg_kitchen', prompt: 'p7', win: 'w7',
    weather: { kind: 'steam', x: 360, y: 640, w: 200, h: 80 },
    things: [
      ACTOR('pot_hot', 'pot_ok', 360, 880, 380, { ay: 1, ar: 1, mood: 'sad' }),
      T('flame', 'flame', 360, 960, 230, 'target', { ar: 1, idle: { breathe: [0.06, 7], sway: [0.05, 5] }, crumb: '#d9541f' }),
      T('spoon', 'spoon', 605, 760, 110, 'decoy', { ar: 0.3, idle: { sway: [0.06, 1.5] }, crumb: '#ba772c', react: { say: 'r_oops', sfx: 'boing', kick: { on: 'self', type: 'swing' } } }),
      T('chili', 'chili', 105, 880, 90, 'decoy', { ar: 0.55, idle: { sway: [0.07, 1.9], breathe: [0.03, 2.6] }, crumb: '#cf3d34', react: { say: 'r_eek', sfx: 'boing', kick: { on: 'actor', type: 'hop' } } }),
    ],
  },
  {
    n: 8, bg: 'bg_kitchen', prompt: 'p8', win: 'w8', lift: 130,
    things: [
      T('mouse', 'mouse_cookie', 320, 880, 170, 'actor', { main: true, show: 'peek', ar: 1, idle: { breathe: [0.03, 3], sway: [0.05, 2.2] } }),
      T('cloth', 'tablecloth', 320, 880, 400, 'target', { ar: 0.9, idle: { sway: [0.008, 1.1] }, crumb: '#cf3d34' }),
      T('door', 'cupboard_door', 180, 545, 240, 'decoy', { ar: 0.8, idle: { sway: [0.006, 1.7] }, crumb: '#aa6a28', react: { reveal: { asset: 'spider_wave', w: 150, dy: 90, ar: 0.8 }, say: 'r_hi', sfx: 'boing', kick: { on: 'self', type: 'shake' } } }),
      T('pot', 'flowerpot', 595, 700, 170, 'decoy', { ar: 0.9, ay: 0.5, idle: { sway: [0.012, 1.4] }, crumb: '#b4552a', react: { reveal: { asset: 'worm', w: 150, dy: -60, ar: 1 }, say: 'r_eek', sfx: 'boing', kick: { on: 'self', type: 'wobble' } } }),
    ],
  },
  {
    n: 9, bg: 'bg_kitchen', prompt: 'p9', win: 'w9', lift: 146,
    things: [
      ACTOR('chef_nomask', 'chef_awake', 360, 1000, 330, { ar: 0.7, mood: 'sad' }),
      T('mask', 'sleep_mask', 359, 598, 175, 'target', { ar: 1.6, idle: BOB(3, 1.4), crumb: '#2d6cc2' }),
      T('pillow', 'pillow', 148, 985, 200, 'decoy', { ar: 1.4, idle: { breathe: [0.02, 1.8] }, crumb: '#3371cf', react: { say: 'r_oops', sfx: 'boing', kick: { on: 'actor', type: 'shake' } } }),
      T('zzz', 'zzz', 560, 560, 190, 'decoy', { goneOnFix: true, ar: 1.4, idle: BOB(10, 1.2), crumb: '#2d6cc2', react: { say: 'r_zzz', sfx: 'boing', grow: 1.3 } }),
    ],
  },
  {
    n: 10, bg: 'bg_kitchen', prompt: 'p10', win: 'w10',
    things: [
      T('hose_ok', 'hose_ok', 300, 930, 420, 'actor', { show: 'peek', ar: 1.5, idle: { sway: [0.01, 1.4] } }),
      ACTOR('glass_empty', 'glass_full', 590, 1010, 150, { ar: 0.62, mood: 'sad' }),
      T('hose_knot', 'hose_knot', 300, 930, 420, 'target', { ar: 1.5, idle: { sway: [0.01, 1.1] }, crumb: '#249947' }),
      T('tap', 'tap', 150, 700, 190, 'decoy', { ar: 1.1, idle: { sway: [0.012, 1.6] }, crumb: '#5187d6', react: { say: 'r_drip', sfx: 'boing', kick: { on: 'self', type: 'wobble' } } }),
      T('duck', 'duck', 400, 770, 130, 'decoy', { ar: 1, idle: { bob: [5, 1.7], sway: [0.04, 1.3] }, crumb: '#ebb439', react: { say: 'r_hi', sfx: 'boing', kick: { on: 'self', type: 'hop' } } }),
    ],
  },
  {
    n: 11, bg: 'bg_kitchen', prompt: 'p11', win: 'w11',
    things: [
      T('cake', 'cake', 340, 1030, 300, 'actor', { main: true, show: 'peek', ay: 1, ar: 0.95, idle: { breathe: [0.02, 2.4] } }),
      T('sheet', 'dust_sheet', 340, 1060, 380, 'target', { ar: 0.85, ay: 1, idle: { sway: [0.01, 1.2] }, crumb: '#c9902f' }),
      T('balloon', 'balloon', 100, 620, 150, 'decoy', { ar: 0.62, idle: BOB(14, 1.1), crumb: '#cf3d34', react: { say: 'r_pop', sfx: 'pop', regrow: 'float' } }),
      T('gift', 'gift', 595, 1030, 170, 'decoy', { ar: 1, ay: 1, idle: { breathe: [0.025, 2.1] }, crumb: '#2d6cc2', react: { say: 'r_gift', sfx: 'boing', kick: { on: 'self', type: 'shake' } } }),
    ],
  },
  {
    n: 12, bg: 'bg_pond', prompt: 'p12', win: 'w12',
    weather: { kind: 'snow', x: 360, y: 150, w: 660, h: 60 },
    things: [
      ACTOR('cat_fishing', 'cat_fish', 190, 900, 300, { ay: 1, ar: 0.95, mood: 'sad' }),
      T('ice', 'ice', 470, 930, 340, 'target', { ar: 1.3, idle: { breathe: [0.008, 1.6] }, crumb: '#519cd6' }),
      T('bucket', 'bucket', 610, 770, 140, 'decoy', { ar: 1, ay: 0.5, idle: { sway: [0.03, 1.5] }, crumb: '#cf3d34', react: { say: 'r_oops', sfx: 'boing', kick: { on: 'actor', type: 'hop' } } }),
      T('penguin', 'penguin', 130, 1060, 130, 'decoy', { ar: 0.8, ay: 1, idle: { sway: [0.05, 1.6], breathe: [0.03, 2.2] }, crumb: '#5e2499', react: { say: 'r_cool', sfx: 'boing', kick: { on: 'self', type: 'wobble' } } }),
    ],
  },
  {
    n: 13, bg: 'bg_zoo', prompt: 'p13', win: 'w13',
    things: [
      ACTOR('elephant_thirsty', 'elephant_happy', 195, 1040, 370, { afterW: 392, fixMove: { dx: 45 }, ar: 1, mood: 'sad', idle: { breathe: [0.02, 1.9], sway: [0.015, 1.1] } }),
      T('sparrow', 'sparrow', 185, 700, 90, 'decoy', { goneOnFix: true, ar: 1, idle: { bob: [6, 2.4], sway: [0.05, 2.9] }, crumb: '#b4552a', react: { say: 'r_tweet', sfx: 'boing', regrow: 'float', kick: { on: 'self', type: 'hop' } } }),
      T('sack', 'peanut_sack', 618, 1060, 112, 'decoy', { ar: 0.77, ay: 1, idle: { breathe: [0.02, 2.3] }, crumb: '#c9902f', react: { reveal: { asset: 'mouse', w: 110, dy: -90, ar: 1 }, say: 'r_squeak', sfx: 'boing', kick: { on: 'self', type: 'wobble' } } }),
      T('lid', 'tub_lid', 470, 1050, 220, 'target', { ar: 0.97, ay: 1, idle: { breathe: [0.012, 1.8], sway: [0.01, 1.3] }, crumb: '#aa6a28' }),
    ],
  },
  {
    n: 14, bg: 'bg_zoo', prompt: 'p14', win: 'w14',
    patch: { x: 360, y: 962, w: 650, h: 250, c: ['#5aa4d8', '#2362a9', '#4cbfe6'] },
    things: [
      T('baby', 'penguin_baby', 156, 942, 130, 'actor', { main: true, show: 'peek', ar: 0.8, idle: { breathe: [0.03, 2.4], sway: [0.05, 1.6] } }),
      T('pile_l', 'snow_pile', 156, 930, 200, 'target', { ar: 1.13, clue: 'zzz', idle: { sway: [0.012, 1.3] }, crumb: '#5183d6' }),
      T('pile_m', 'snow_pile', 360, 930, 200, 'decoy', { ar: 1.13, idle: { sway: [0.012, 1.7] }, crumb: '#5183d6', react: { reveal: { asset: 'seal', w: 190, base: true, ar: 1 }, say: 'r_honk', sfx: 'boing', kick: { on: 'self', type: 'shiver' } } }),
      T('pile_r', 'snow_pile', 564, 930, 200, 'decoy', { ar: 1.13, idle: { sway: [0.012, 1.1] }, crumb: '#5183d6', react: { reveal: { asset: 'fish_jump', w: 130, base: true, arc: 150, ar: 1 }, say: 'r_splash', sfx: 'pop', kick: { on: 'self', type: 'hop' } } }),
    ],
  },
  {
    n: 15, bg: 'bg_zoo', prompt: 'p15', win: 'w15',
    things: [
      ACTOR('monkey_sad', 'monkey_happy', 190, 1040, 300, { ar: 0.89, mood: 'sad', idle: { breathe: [0.025, 2.2], sway: [0.025, 1.4] } }),
      T('banana', 'banana', 520, 960, 110, 'actor', { show: 'peek', hideOnFix: true, ar: 0.71, idle: { bob: [5, 1.8], sway: [0.05, 1.5] } }),
      T('vine', 'vine', 340, 600, 100, 'decoy', { ar: 0.46, ay: 0, idle: { sway: [0.04, 1.4] }, crumb: '#2d9f25', react: { say: 'r_oops', sfx: 'boing', grow: 1.25, kick: { on: 'self', type: 'swing' } } }),
      T('parrot', 'parrot', 600, 640, 140, 'decoy', { ar: 0.9, idle: { bob: [6, 2], sway: [0.04, 1.8] }, crumb: '#cf3d34', react: { say: 'r_squawk', sfx: 'boing', kick: { on: 'self', type: 'spin' } } }),
      T('box', 'glass_box', 520, 960, 250, 'target', { ar: 1.03, idle: { breathe: [0.012, 1.7] }, crumb: '#3d8fd2' }),
    ],
  },
  {
    n: 16, bg: 'bg_zoo', prompt: 'p16', win: 'w16',
    patch: { x: 360, y: 955, w: 600, h: 290, c: ['#2f93da', '#1a5c9e', '#4cbfe6'], lip: [225, 495, 975] },
    things: [
      ACTOR('turtle_trapped', 'turtle_free', 360, 880, 300, { ar: 0.91, ay: 0.5, mood: 'sad', idle: { breathe: [0.025, 2.3], bob: [5, 1.5] }, fixMove: { dy: 40 } }),
      T('crab', 'crab', 122, 1040, 130, 'decoy', { ar: 1.16, ay: 1, idle: { sway: [0.06, 2.6], bob: [4, 3] }, crumb: '#cf3d34', react: { say: 'r_snap', sfx: 'boing', kick: { on: 'self', type: 'hop' } } }),
      T('weed', 'seaweed', 590, 1048, 120, 'decoy', { ar: 0.61, ay: 1, idle: { sway: [0.07, 1.6] }, crumb: '#2d9f25', react: { say: 'r_creak', sfx: 'boing', grow: 1.35, kick: { on: 'self', type: 'wobble' } } }),
      T('net', 'net', 360, 880, 360, 'target', { ar: 1.07, idle: { sway: [0.012, 1.2], breathe: [0.01, 1.5] }, crumb: '#aa6a28' }),
    ],
  },
  {
    n: 17, bg: 'bg_zoo', prompt: 'p17', win: 'w17',
    things: [
      T('duckling', 'duckling', 580, 930, 120, 'actor', { main: true, show: 'peek', ar: 0.69, idle: { breathe: [0.03, 2.6], sway: [0.05, 1.4] } }),
      T('reeds_l', 'reeds', 140, 930, 190, 'decoy', { ar: 0.76, idle: { sway: [0.015, 1.2] }, crumb: '#2d9f25', react: { reveal: { asset: 'croc_eyes', w: 190, dy: -20, ar: 1.5 }, say: 'r_blink', sfx: 'boing', kick: { on: 'self', type: 'wobble' } } }),
      T('reeds_m', 'reeds', 360, 930, 190, 'decoy', { ar: 0.76, idle: { sway: [0.015, 1.6] }, crumb: '#2d9f25', react: { reveal: { asset: 'frog', w: 170, dy: -70, ar: 1 }, say: 'r_croak', sfx: 'croak', kick: { on: 'self', type: 'shake' } } }),
      T('reeds_r', 'reeds', 580, 930, 190, 'target', { ar: 0.76, clue: 'heart', idle: { sway: [0.015, 1.9] }, crumb: '#2d9f25' }),
    ],
  },
  {
    n: 18, bg: 'bg_zoo', prompt: 'p18', win: 'w18',
    things: [
      ACTOR('zebra_muddy', 'zebra_clean', 330, 1040, 400, { ar: 0.93, mood: 'sad', idle: { breathe: [0.02, 2.1], sway: [0.012, 1.3] } }),
      T('bucket', 'paint_bucket', 615, 1050, 120, 'decoy', { ar: 0.73, ay: 1, idle: { sway: [0.03, 1.5] }, crumb: '#ebb439', react: { say: 'r_splat', sfx: 'boing', kick: { on: 'self', type: 'tip' } } }),
      T('fly', 'fly', 470, 560, 100, 'decoy', { goneOnFix: true, ar: 1, idle: { orbit: [90, 2.1, 50], jitter: 3 }, crumb: '#622499', react: { say: 'r_buzz', sfx: 'boing', swap: { asset: 'fly', w: 80, n: 3, gap: 76 }, regrow: 'float' } }),
      T('mud', 'mud_splat', 330, 850, 280, 'target', { ar: 0.93, idle: { breathe: [0.015, 1.7], sway: [0.01, 1.2] }, crumb: '#a5601a' }),
    ],
  },
  {
    n: 19, bg: 'bg_town', prompt: 'p19', win: 'w19',
    things: [
      ACTOR('bus_side', 'bus_side', 222, 1045, 366, { ar: 2.1, mood: 'sad', idle: { breathe: [0.012, 2.6] }, fixMove: { dx: 760 } }),
      T('cone', 'cone', 92, 1112, 108, 'decoy', { ar: 0.84, ay: 1, idle: { sway: [0.03, 1.6] }, crumb: '#e8743b', react: { reveal: { asset: 'cones_three', w: 250, dx: 95, dy: -30, ar: 1.68 }, say: 'r_triple', sfx: 'boing', kick: { on: 'self', type: 'hop' } } }),
      T('pigeon', 'pigeon', 596, 752, 120, 'decoy', { ar: 0.82, idle: { bob: [5, 2.2], sway: [0.04, 2.8] }, crumb: '#8a2fc4', react: { reveal: { asset: 'pigeon', w: 100, dy: 0, ar: 0.82, to: { x: 200, y: 813 } }, say: 'r_coo', sfx: 'boing', kick: { on: 'actor', type: 'wobble' } } }),
      T('barrier', 'barrier', 542, 1045, 270, 'target', { ar: 1.62, ay: 1, idle: { sway: [0.008, 1.5], breathe: [0.01, 1.8] }, crumb: '#cf3d34' }),
    ],
  },
  {
    n: 20, bg: 'bg_town', prompt: 'p20', win: 'w20', night: true, lift: 100,
    things: [
      ACTOR('rooster_asleep', 'rooster', 220, 950, 230, { afterW: 235, ar: 0.72, mood: 'sad', idle: { breathe: [0.025, 2.2], sway: [0.02, 1.2] } }),
      T('sun', 'sun', 520, 500, 230, 'actor', { show: 'fix', ar: 0.994, idle: { sway: [0.1, 0.9], breathe: [0.02, 2.2] }, fixMove: { dy: -40 } }),
      T('owl', 'owl', 150, 560, 130, 'decoy', { ar: 0.69, idle: { sway: [0.04, 1.5], breathe: [0.03, 2.4] }, crumb: '#aa6a28', react: { say: 'r_hoot', sfx: 'boing', kick: { on: 'self', type: 'spin' } } }),
      T('star', 'star', 560, 700, 130, 'decoy', { ar: 1, idle: { bob: [8, 1.6], sway: [0.1, 1.2] }, crumb: '#ebb439', react: { reveal: { asset: 'stars_three', w: 360, dx: -70, dy: -10, ar: 1.86 }, say: 'r_twinkle', sfx: 'pop', kick: { on: 'self', type: 'wobble' } } }),
      T('moon', 'moon', 330, 420, 260, 'target', { ar: 0.9, idle: BOB(8, 1.3), crumb: '#ebb439' }),
    ],
  },
  {
    n: 21, bg: 'bg_town', prompt: 'p21', win: 'w21', toss: { from: 'actor', to: 'mailbox', at: 1.0, dur: 0.7 },
    things: [
      T('gate', 'gate', 340, 1040, 300, 'actor', { ar: 0.88, ay: 1, still: true, swing: true, idle: { sway: [0.006, 1.4] } }),
      T('mailbox', 'mailbox', 620, 1040, 104, 'actor', { ar: 0.61, ay: 1, still: true, idle: { sway: [0.02, 1.8] } }),
      T('dog', 'dog', 230, 1090, 150, 'decoy', { ar: 1, ay: 1, idle: { breathe: [0.03, 2.2], sway: [0.03, 1.6] }, crumb: '#aa6a28', react: { reveal: { asset: 'bone', w: 90, dy: -20, ar: 1.4 }, say: 'r_woof', sfx: 'boing', kick: { on: 'self', type: 'hop' } } }),
      T('hedge', 'hedge', 578, 760, 190, 'decoy', { ar: 1.02, idle: { sway: [0.012, 1.3] }, crumb: '#2d9f25', react: { say: 'r_bloom', sfx: 'pop', swap: { asset: 'hedge_flower', w: 200 }, kick: { on: 'self', type: 'wobble' } } }),
      ACTOR('postman', 'postman', 158, 1040, 200, { ar: 0.6, mood: 'sad', idle: { breathe: [0.025, 2], sway: [0.02, 1.3] }, fixMove: { dx: 310 } }),
      T('lock', 'padlock', 340, 900, 130, 'target', { ar: 0.73, idle: { sway: [0.06, 2], bob: [3, 2.4] }, crumb: '#c99a2e' }),
    ],
  },
  {
    n: 22, bg: 'bg_town', prompt: 'p22', win: 'w22',
    things: [
      ACTOR('painter_sad', 'painter_happy', 190, 1040, 230, { ar: 0.65, mood: 'sad', idle: { breathe: [0.025, 2.1], sway: [0.025, 1.3] } }),
      T('window', 'window', 560, 520, 190, 'decoy', { ar: 0.9, idle: { sway: [0.005, 1.5] }, crumb: '#3d8fd2', react: { say: 'r_hi', sfx: 'boing', swap: { asset: 'granny_window', w: 230 }, kick: { on: 'self', type: 'swing' } } }),
      T('poster', 'poster', 150, 560, 170, 'decoy', { ar: 0.8, idle: { sway: [0.02, 1.6] }, crumb: '#cf3d34', react: { say: 'r_tada', sfx: 'pop', swap: { asset: 'poster_new', w: 170 }, kick: { on: 'self', type: 'shake' } } }),
      T('scribble', 'scribble', 440, 880, 300, 'target', { ar: 1, idle: { sway: [0.012, 1.4], breathe: [0.02, 2] }, crumb: '#622499' }),
    ],
  },
  {
    n: 23, bg: 'bg_town', prompt: 'p23', win: 'w23',
    things: [
      ACTOR('child_sad', 'child_happy', 190, 1040, 230, { afterW: 204, afterDelay: 0.85, ar: 0.66, mood: 'sad', idle: { breathe: [0.025, 2.2], sway: [0.02, 1.2] } }),
      T('cone_fall', 'icecream', 100, 676, 62, 'actor', { show: 'fix', fall: { dx: 200, dy: -116, dur: 0.85 }, ar: 0.55 }),
      T('parasol', 'parasol', 570, 940, 210, 'decoy', { ar: 1, ay: 0.7, idle: { sway: [0.03, 1.5] }, crumb: '#cf3d34', react: { say: 'r_whee', sfx: 'boing', kick: { on: 'self', type: 'spin' } } }),
      T('hotsun', 'sun_hot', 580, 420, 220, 'decoy', { ar: 0.95, idle: { sway: [0.1, 1], breathe: [0.03, 3] }, crumb: '#d9541f', react: { drip: { on: 'gull' }, say: 'r_drip', sfx: 'boing', kick: { on: 'actor', type: 'shiver' } } }),
      T('gull', 'gull_cone', 300, 560, 260, 'target', { ar: 1.1, idle: { orbit: [60, 1.1, 30], sway: [0.04, 2] }, crumb: '#3d8fd2' }),
    ],
  },
  {
    n: 24, bg: 'bg_town', prompt: 'p24', win: 'w24', lift: 200,
    things: [
      T('stage', 'stage', 360, 1020, 480, 'actor', { main: true, show: 'peek', ay: 1, ar: 1.2, idle: { breathe: [0.01, 2.2] } }),
      T('band', 'band', 360, 960, 300, 'actor', { show: 'fix', ay: 1, ar: 1.3, idle: { bob: [6, 3], sway: [0.03, 2.6] } }),
      T('fire', 'firework', 360, 600, 300, 'actor', { show: 'fix', ar: 1, idle: { breathe: [0.06, 3.2], sway: [0.05, 1.7] } }),
      T('ladder', 'ladder', 110, 980, 120, 'decoy', { ar: 0.45, ay: 1, idle: { sway: [0.02, 1.9] }, crumb: '#b78a2a', react: { say: 'r_creak', sfx: 'boing', kick: { on: 'self', type: 'wobble' } } }),
      T('drum', 'drum', 610, 1040, 150, 'decoy', { ar: 1, ay: 1, idle: { breathe: [0.03, 1.4] }, crumb: '#cf3d34', react: { say: 'r_boom', sfx: 'pop', kick: { on: 'self', type: 'shake' } } }),
      T('tarp', 'tarp', 360, 1030, 500, 'target', { ar: 1.2, ay: 1, idle: { sway: [0.006, 1.2], breathe: [0.01, 1.5] }, crumb: '#3d8fd2' }),
    ],
  },
  {
    n: 25, keep: true, bg: 'bg_space', prompt: 'p25', win: 'w25',
    things: [
      ACTOR('rocket_sad', 'rocket_happy', 360, 1040, 250, { ar: 0.626, mood: 'sad', afterW: 250, fixMove: { dy: -325 } }),
      T('flame', 'rocket_flame', 360, 1030, 100, 'actor', { show: 'fix', ay: 0, ar: 0.491, fixMove: { dy: -340 }, idle: { breathe: [0.08, 7], sway: [0.04, 5] } }),
      T('fuel', 'fuel_can', 110, 1060, 130, 'decoy', { ar: 0.765, ay: 1, idle: { sway: [0.02, 1.6] }, crumb: '#d9341f', react: { say: 'r_glug', sfx: 'boing', kick: { on: 'self', type: 'tip' } } }),
      T('alien', 'alien_wave', 590, 1060, 130, 'decoy', { ar: 0.839, ay: 1, idle: { breathe: [0.03, 2.2], sway: [0.03, 1.5] }, crumb: '#2d9f25', react: { say: 'r_hi', sfx: 'boing', swap: { asset: 'alien_flag', w: 140 }, regrow: 'float', kick: { on: 'self', type: 'hop' } } }),
      T('chain', 'chain', 360, 985, 220, 'target', { ar: 1.286, idle: { sway: [0.02, 1.3], breathe: [0.012, 1.7] }, crumb: '#6a3fd0' }),
    ],
  },
  {
    n: 26, keep: true, bg: 'bg_space', prompt: 'p26', win: 'w26',
    things: [
      ACTOR('astro_goo', 'astro_happy', 330, 1050, 250, { ar: 0.653, mood: 'sad', afterW: 253 }),
      T('rock', 'moon_rock', 115, 1070, 150, 'decoy', { ar: 1.044, ay: 1, idle: { breathe: [0.012, 1.9] }, crumb: '#6a3fd0', react: { reveal: { asset: 'alien_peek', w: 120, dy: -85, ar: 0.915 }, say: 'r_peek', sfx: 'boing', kick: { on: 'self', type: 'hop' } } }),
      T('flag', 'space_flag', 610, 1060, 110, 'decoy', { ar: 0.783, ay: 1, idle: { sway: [0.03, 1.4] }, crumb: '#cf3030', react: { say: 'r_whee', sfx: 'boing', kick: { on: 'self', type: 'spin' } } }),
      T('goo', 'goo', 330, 765, 175, 'target', { ar: 0.879, idle: { breathe: [0.02, 1.8], sway: [0.015, 1.2] }, crumb: '#2d9f25' }),
    ],
  },
  {
    n: 27, keep: true, bg: 'bg_space', prompt: 'p27', win: 'w27',
    things: [
      T('baby', 'alien_baby', 360, 990, 110, 'actor', { main: true, show: 'peek', ar: 0.597, idle: { breathe: [0.03, 2.4], sway: [0.05, 1.6] } }),
      T('crater_l', 'crater', 120, 990, 170, 'decoy', { ar: 1.005, idle: { sway: [0.012, 1.3] }, crumb: '#6a3fd0', react: { reveal: { asset: 'space_worm', w: 130, dy: -75, ar: 0.928 }, say: 'r_pop', sfx: 'pop', kick: { on: 'self', type: 'wobble' } } }),
      T('crater_m', 'crater', 360, 990, 170, 'target', { ar: 1.005, clue: 'zzz', idle: { sway: [0.012, 1.7] }, crumb: '#6a3fd0' }),
      T('crater_r', 'crater', 600, 990, 170, 'decoy', { ar: 1.005, idle: { sway: [0.012, 1.1] }, crumb: '#6a3fd0', react: { reveal: { asset: 'robot_small', w: 120, dy: -85, ar: 0.703 }, say: 'r_beep', sfx: 'boing', kick: { on: 'self', type: 'shake' } } }),
    ],
  },
  {
    n: 28, keep: true, bg: 'bg_space', prompt: 'p28', win: 'w28',
    things: [
      T('comet', 'comet', 130, 470, 140, 'decoy', { ar: 0.895, idle: { bob: [10, 1.3], sway: [0.04, 1.8] }, crumb: '#e8743b', react: { say: 'r_zoom', sfx: 'boing', kick: { on: 'self', type: 'spin' } } }),
      T('scope', 'telescope', 590, 1060, 150, 'decoy', { ar: 0.685, ay: 1, idle: { sway: [0.012, 1.5] }, crumb: '#3d6fd2', react: { say: 'r_whee', sfx: 'boing', kick: { on: 'self', type: 'swing' } } }),
      T('jar', 'jar', 360, 900, 230, 'target', { ar: 0.648, idle: { sway: [0.012, 1.4], breathe: [0.01, 1.6] }, crumb: '#3d8fd2' }),
      ACTOR('star_sad', 'star_happy', 360, 930, 150, { ay: 0.5, ar: 1.06, mood: 'sad', afterW: 147, fixMove: { dy: -300 } }),
    ],
  },
  {
    n: 29, keep: true, bg: 'bg_space', prompt: 'p29', win: 'w29',
    things: [
      ACTOR('robot_sad', 'robot_happy', 360, 1050, 220, { ar: 0.586, mood: 'sad', afterW: 247 }),
      T('battery', 'battery', 115, 1060, 90, 'decoy', { ar: 0.476, ay: 1, idle: { sway: [0.02, 1.7] }, crumb: '#2d9f25', react: { say: 'r_zap', sfx: 'pop', swap: { asset: 'battery_two', w: 130 }, kick: { on: 'self', type: 'hop' } } }),
      T('wrench', 'wrench', 610, 1060, 85, 'decoy', { ar: 0.467, ay: 1, idle: { sway: [0.03, 1.5] }, crumb: '#3d8fd2', react: { say: 'r_clang', sfx: 'boing', kick: { on: 'self', type: 'wobble' } } }),
      T('magnet', 'magnet', 360, 700, 190, 'target', { ar: 0.99, idle: { sway: [0.03, 2], bob: [4, 2.4] }, crumb: '#d93030' }),
    ],
  },
  {
    n: 30, keep: true, bg: 'bg_space', prompt: 'p30', win: 'w30',
    things: [
      T('pad', 'landing_pad', 360, 1060, 380, 'actor', { ar: 2.387, ay: 1 }),
      ACTOR('ufo_sad', 'ufo_happy', 360, 560, 250, { ay: 0.5, ar: 1.456, mood: 'sad', afterW: 250, fixMove: { dy: 280 }, idle: { bob: [8, 1.6], breathe: [0.02, 2.1], sway: [0.03, 1.1] } }),
      T('sat', 'satellite', 128, 610, 170, 'decoy', { ar: 1.514, idle: { bob: [8, 1.4], sway: [0.05, 1.6] }, crumb: '#3d8fd2', react: { say: 'r_beep', sfx: 'boing', kick: { on: 'self', type: 'shake' } } }),
      T('planet', 'planet_ring', 595, 610, 170, 'decoy', { ar: 1.417, idle: { bob: [8, 1.8], sway: [0.04, 1.3] }, crumb: '#8a2fc4', react: { say: 'r_wow', sfx: 'boing', swap: { asset: 'planet_two_rings', w: 180 }, regrow: 'float', kick: { on: 'self', type: 'shiver' } } }),
      T('rock', 'asteroid', 360, 960, 190, 'target', { ar: 1.009, idle: { sway: [0.02, 1.4], breathe: [0.012, 1.7] }, crumb: '#b4652a' }),
    ],
  },
  {
    n: 31, keep: true, bg: 'bg_beach', prompt: 'p31', win: 'w31', lift: 270,
    patch: { front: true, onFix: true, x: 150, y: 1056, w: 170, h: 56, c: ['#ddac4b', '#a56c27', '#e6bf4c'] },
    things: [
      T('castle', 'sandcastle', 335, 1050, 230, 'actor', { ar: 1.02, ay: 1, idle: { breathe: [0.01, 2.4] } }),
      ACTOR('kid_castle_sad', 'kid_castle_happy', 150, 1060, 180, { ar: 0.606, mood: 'sad', afterW: 208 }),
      T('cflag', 'castle_flag', 296, 850, 70, 'actor', { show: 'fix', ay: 1, ar: 0.66, idle: { sway: [0.06, 2] } }),
      T('bucket', 'sand_bucket', 500, 1050, 100, 'decoy', { ar: 0.988, ay: 1, idle: { sway: [0.02, 1.6] }, crumb: '#d93030', react: { say: 'r_oops', sfx: 'boing', kick: { on: 'self', type: 'tip' } } }),
      T('crab', 'crab_red', 608, 1050, 115, 'decoy', { ar: 1.14, ay: 1, idle: { sway: [0.05, 2.4], bob: [3, 3] }, crumb: '#cf3d34', react: { say: 'r_snap', sfx: 'boing', kick: { on: 'self', type: 'hop' } } }),
      T('wave', 'wave', 470, 790, 300, 'target', { ar: 0.97, idle: { sway: [0.015, 1.3], breathe: [0.02, 1.8] }, crumb: '#1f6fb5' }),
    ],
  },
  {
    n: 32, keep: true, bg: 'bg_beach', prompt: 'p32', win: 'w32',
    things: [
      T('chest', 'treasure', 580, 960, 125, 'actor', { main: true, show: 'peek', ar: 0.986, idle: { breathe: [0.025, 2.6], sway: [0.03, 1.4] } }),
      T('pile_l', 'sand_pile', 140, 960, 200, 'decoy', { ar: 1.721, idle: { sway: [0.012, 1.3] }, crumb: '#d9a021', react: { reveal: { asset: 'crab_shades', w: 150, dy: -60, ar: 1.215 }, say: 'r_cool', sfx: 'boing', kick: { on: 'self', type: 'shake' } } }),
      T('pile_m', 'sand_pile', 360, 960, 200, 'decoy', { ar: 1.721, idle: { sway: [0.012, 1.7] }, crumb: '#d9a021', react: { reveal: { asset: 'boot_fish', w: 110, dy: -80, ar: 0.634 }, say: 'r_splash', sfx: 'pop', kick: { on: 'self', type: 'wobble' } } }),
      T('pile_r', 'sand_pile', 580, 960, 200, 'target', { ar: 1.721, clue: 'dust', idle: { sway: [0.012, 1.1] }, crumb: '#d9a021' }),
    ],
  },
  {
    n: 33, keep: true, bg: 'bg_beach', prompt: 'p33', win: 'w33',
    things: [
      ACTOR('dog_hot', 'dog_cool', 190, 1060, 190, { ar: 0.802, mood: 'sad' }),
      ACTOR('parasol_closed', 'parasol_open', 400, 1060, 120, { main: false, ar: 0.415, afterW: 230, idle: { sway: [0.012, 1.4] } }),
      T('ball', 'beach_ball', 590, 880, 120, 'decoy', { ar: 0.995, idle: { bob: [6, 1.8], sway: [0.04, 1.5] }, crumb: '#3d8fd2', react: { say: 'r_boing', sfx: 'boing', regrow: 'float', kick: { on: 'self', type: 'hop' } } }),
      T('bowl', 'water_bowl', 585, 1070, 130, 'decoy', { ar: 1.472, ay: 1, idle: { breathe: [0.015, 1.9] }, crumb: '#3d8fd2', react: { say: 'r_splash', sfx: 'pop', kick: { on: 'self', type: 'tip' } } }),
      T('rope', 'parasol_rope', 400, 855, 120, 'target', { ar: 0.598, idle: { sway: [0.03, 1.6], bob: [3, 2.1] }, crumb: '#b4652a' }),
    ],
  },
  {
    n: 34, keep: true, bg: 'bg_beach', prompt: 'p34', win: 'w34', lift: 90,
    things: [
      ACTOR('boat_sad', 'boat_happy', 300, 668, 290, { ar: 0.92, mood: 'sad', fixMove: { dx: 280 }, idle: { bob: [6, 1.6], breathe: [0.015, 2.2], sway: [0.025, 1.3] } }),
      T('gull', 'gull_mast', 300, 364, 143, 'decoy', { goneOnFix: true, ar: 1.02, idle: { bob: [5, 2], sway: [0.03, 1.6] }, crumb: '#3d8fd2', react: { say: 'r_squawk', sfx: 'boing', swap: { asset: 'gull_fish', w: 165 }, regrow: 'float', kick: { on: 'self', type: 'shake' } } }),
      T('buoy', 'buoy', 548, 830, 170, 'decoy', { ar: 1.002, idle: { bob: [7, 1.7], sway: [0.04, 1.3] }, crumb: '#d93030', react: { say: 'r_bob', sfx: 'boing', kick: { on: 'self', type: 'wobble' } } }),
      T('anchor', 'anchor', 250, 950, 215, 'target', { tie: 'actor', ar: 0.728, idle: { sway: [0.025, 1.5], bob: [3, 2.2] }, crumb: '#4a2fd0' }),
    ],
  },
  {
    n: 35, keep: true, bg: 'bg_beach', prompt: 'p35', win: 'w35',
    things: [
      T('trunk', 'palm_trunk', 545, 1060, 110, 'actor', { ar: 0.336, ay: 1, idle: { sway: [0.006, 1.5] } }),
      ACTOR('kid_kite_sad', 'kid_kite_happy', 170, 1050, 150, { ar: 0.48, mood: 'sad', afterW: 209 }),
      T('kite', 'kite', 545, 640, 110, 'actor', { main: false, ay: 0.5, ar: 0.528, fixMove: { dy: -260 }, idle: { sway: [0.04, 1.5], bob: [4, 1.8] } }),
      T('cloud', 'cloud_small', 200, 480, 170, 'decoy', { ar: 1.337, idle: { bob: [7, 1.5], sway: [0.02, 1.2] }, crumb: '#3d8fd2', react: { rain: true, say: 'r_drip', sfx: 'boing', kick: { on: 'self', type: 'wobble' } } }),
      T('coco', 'coconut', 400, 1070, 100, 'decoy', { ar: 0.999, ay: 1, idle: { breathe: [0.015, 2] }, crumb: '#a5551f', react: { say: 'r_thud', sfx: 'boing', kick: { on: 'self', type: 'hop' } } }),
      T('leaves', 'palm_leaves', 545, 700, 250, 'target', { ar: 1.134, idle: { sway: [0.02, 1.3], breathe: [0.015, 1.8] }, crumb: '#2d9f25' }),
    ],
  },
  {
    n: 36, keep: true, bg: 'bg_beach', prompt: 'p36', win: 'w36', evening: true,
    things: [
      ACTOR('friends_sad', 'friends_happy', 160, 1060, 230, { ar: 1.55, mood: 'sad', afterW: 246 }),
      ACTOR('campfire_out', 'campfire_lit', 470, 1050, 220, { main: false, ar: 0.94, idle: { breathe: [0.012, 2.4] } }),
      T('fire', 'firework', 360, 560, 240, 'actor', { show: 'fix', ar: 1, idle: { breathe: [0.06, 3.2], sway: [0.05, 1.7] } }),
      T('marsh', 'marshmallow', 622, 1065, 70, 'decoy', { ar: 0.461, ay: 1, idle: { sway: [0.03, 1.6] }, crumb: '#cf3d34', react: { say: 'r_wow', sfx: 'pop', swap: { asset: 'marshmallow_big', w: 100 }, kick: { on: 'self', type: 'wobble' } } }),
      T('guitar', 'guitar', 335, 1075, 70, 'decoy', { ar: 0.448, ay: 1, idle: { sway: [0.02, 1.7] }, crumb: '#b4552a', react: { say: 'r_strum', sfx: 'boing', kick: { on: 'self', type: 'shake' } } }),
      T('cloud', 'cloud_rain', 470, 790, 260, 'target', { ar: 0.939, idle: BOB(6, 1.5), crumb: '#3d6fd2' }),
    ],
  },
  {
    n: 37, keep: true, bg: 'bg_castle', prompt: 'p37', win: 'w37',
    things: [
      ACTOR('drawbridge_up', 'drawbridge_down', 360, 1010, 300, { main: false, ar: 0.882, afterW: 420, idle: { sway: [0.006, 1.4] } }),
      ACTOR('knight_wait', 'knight_happy', 120, 1065, 150, { ar: 0.517, mood: 'sad', afterW: 170 }),
      T('banner', 'banner', 610, 900, 120, 'decoy', { ar: 0.645, ay: 1, idle: { sway: [0.05, 1.7] }, crumb: '#cf3030', react: { say: 'r_flap', sfx: 'boing', kick: { on: 'self', type: 'swing' } } }),
      T('frog', 'moat_frog', 600, 1065, 120, 'decoy', { ar: 0.926, ay: 1, idle: { breathe: [0.03, 2.2], sway: [0.03, 1.5] }, crumb: '#2d9f25', react: { say: 'r_croak', sfx: 'croak', swap: { asset: 'frog_crown', w: 130 }, kick: { on: 'self', type: 'hop' } } }),
      T('knot', 'bridge_knot', 360, 690, 150, 'target', { ar: 1.467, idle: { sway: [0.03, 1.6], bob: [3, 2.1] }, crumb: '#b4652a' }),
    ],
  },
  {
    n: 38, keep: true, bg: 'bg_castle', prompt: 'p38', win: 'w38',
    things: [
      ACTOR('dragon_sad', 'dragon_happy', 350, 1010, 330, { ar: 0.91, mood: 'sad', fixMove: { dy: -400 } }),
      T('gold', 'gold_pile', 112, 1070, 150, 'decoy', { ar: 1.244, ay: 1, idle: { breathe: [0.015, 2] }, crumb: '#ebb439', react: { say: 'r_jingle', sfx: 'pop', kick: { on: 'self', type: 'shake' } } }),
      T('nest', 'nest', 633, 1065, 100, 'decoy', { ar: 1.332, ay: 1, idle: { sway: [0.02, 1.6] }, crumb: '#a5551f', react: { say: 'r_tweet', sfx: 'boing', kick: { on: 'self', type: 'hop' } } }),
      T('ball', 'ball_chain', 455, 1000, 190, 'target', { ar: 1.015, idle: { sway: [0.02, 1.5], breathe: [0.012, 1.8] }, crumb: '#3d6fd2' }),
    ],
  },
  {
    n: 39, keep: true, bg: 'bg_castle', prompt: 'p39', win: 'w39',
    things: [
      T('crown', 'crown', 156, 1055, 120, 'actor', { main: true, show: 'peek', ay: 1, ar: 1.176, idle: { breathe: [0.03, 2.4], sway: [0.04, 1.6] } }),
      T('chest_l', 'chest_closed', 156, 1055, 196, 'target', { ar: 1.236, clue: 'sparkle', ay: 1, idle: { sway: [0.012, 1.3] }, crumb: '#a5551f' }),
      T('chest_m', 'chest_closed', 360, 1055, 196, 'decoy', { ar: 1.236, ay: 1, idle: { sway: [0.012, 1.7] }, crumb: '#a5551f', react: { reveal: { asset: 'ghost_small', w: 130, dy: -110, ar: 0.939 }, say: 'r_boo', sfx: 'boing', kick: { on: 'self', type: 'shake' } } }),
      T('chest_r', 'chest_closed', 564, 1055, 196, 'decoy', { ar: 1.236, ay: 1, idle: { sway: [0.012, 1.1] }, crumb: '#a5551f', react: { reveal: { asset: 'jester', w: 130, dy: -110, ar: 1.091 }, say: 'r_haha', sfx: 'boing', kick: { on: 'self', type: 'wobble' } } }),
    ],
  },
  {
    n: 40, keep: true, bg: 'bg_castle', prompt: 'p40', win: 'w40',
    things: [
      ACTOR('knight_stuck', 'knight_free', 350, 1050, 300, { ar: 0.572, mood: 'sad', afterW: 331 }),
      T('sword', 'sword', 108, 1070, 110, 'decoy', { ar: 0.423, ay: 1, idle: { sway: [0.02, 1.5] }, crumb: '#3d8fd2', react: { say: 'r_clang', sfx: 'boing', kick: { on: 'self', type: 'swing' } } }),
      T('spider', 'spider_cute', 598, 1065, 150, 'decoy', { ar: 1.418, ay: 1, idle: { bob: [4, 1.6], sway: [0.03, 1.4] }, crumb: '#622499', react: { say: 'r_hi', sfx: 'boing', swap: { asset: 'spider_hat', w: 160 }, kick: { on: 'self', type: 'hop' } } }),
      T('web', 'spider_web', 350, 863, 400, 'target', { ar: 0.991, idle: { sway: [0.012, 1.4], breathe: [0.01, 1.7] }, crumb: '#8a2fc4' }),
    ],
  },
  {
    n: 41, keep: true, bg: 'bg_castle', prompt: 'p41', win: 'w41',
    things: [
      T('tower', 'tower', 175, 1060, 260, 'actor', { main: false, ay: 1, ar: 0.414, idle: { sway: [0.004, 1.5] } }),
      ACTOR('princess_sad', 'princess_happy', 175, 1060, 140, { ar: 0.581, mood: 'sad', fixMove: { dx: 210 } }),
      T('crow', 'crow', 545, 1065, 110, 'decoy', { ar: 0.762, ay: 1, idle: { breathe: [0.03, 2.2], sway: [0.03, 1.5] }, crumb: '#622499', react: { say: 'r_caw', sfx: 'boing', kick: { on: 'self', type: 'hop' } } }),
      T('torch', 'torch', 640, 1060, 80, 'decoy', { ar: 0.329, ay: 1, idle: { sway: [0.02, 1.7] }, crumb: '#e8743b', react: { say: 'r_whoosh', sfx: 'pop', kick: { on: 'self', type: 'wobble' } } }),
      T('vines', 'thorn_vines', 175, 960, 240, 'target', { ar: 1.179, idle: { sway: [0.015, 1.4], breathe: [0.012, 1.8] }, crumb: '#2d9f25' }),
    ],
  },
  {
    n: 42, keep: true, bg: 'bg_castle', prompt: 'p42', win: 'w42',
    things: [
      T('table', 'feast_table', 380, 1065, 440, 'actor', { main: false, ay: 1, ar: 1.958 }),
      T('cake', 'royal_cake', 380, 885, 170, 'actor', { show: 'fix', ay: 1, ar: 0.849, idle: { breathe: [0.02, 2.4] } }),
      ACTOR('king_hungry', 'king_happy', 130, 1065, 170, { ar: 0.589, mood: 'sad', afterW: 182 }),
      T('goblet', 'goblet', 520, 885, 70, 'decoy', { ar: 0.666, ay: 1, idle: { sway: [0.02, 1.6] }, crumb: '#ebb439', react: { say: 'r_oops', sfx: 'boing', kick: { on: 'self', type: 'tip' } } }),
      T('dog', 'royal_dog', 612, 1070, 120, 'decoy', { ar: 0.875, ay: 1, idle: { breathe: [0.03, 2.2], sway: [0.03, 1.6] }, crumb: '#aa6a28', react: { say: 'r_woof', sfx: 'boing', kick: { on: 'self', type: 'shake' } } }),
      T('cloche', 'cloche', 380, 885, 190, 'target', { ar: 1.307, ay: 1, idle: { sway: [0.012, 1.4], breathe: [0.01, 1.7] }, crumb: '#3d8fd2' }),
    ],
  },
  {
    n: 43, keep: true, bg: 'bg_sea', prompt: 'p43', win: 'w43',
    things: [
      ACTOR('octopus_sad', 'octopus_happy', 360, 1050, 330, { ar: 0.972, ay: 1, mood: 'sad' }),
      T('starfish', 'starfish', 120, 1075, 130, 'decoy', { ar: 1.064, ay: 1, idle: { sway: [0.04, 1.6] }, crumb: '#cf3d34', react: { say: 'r_hi', sfx: 'boing', kick: { on: 'self', type: 'shiver' } } }),
      T('bubble', 'bubble_big', 600, 640, 150, 'decoy', { ar: 1.001, idle: { bob: [10, 1.4], sway: [0.03, 1.8] }, crumb: '#3d8fd2', react: { reveal: { asset: 'bubble_small', w: 70, n: 3, gap: 80, dy: 0, ar: 1.008 }, say: 'r_pop', sfx: 'pop', kick: { on: 'self', type: 'wobble' } } }),
      T('ink', 'ink_cloud', 360, 930, 260, 'target', { ar: 1.079, idle: { breathe: [0.02, 1.8], sway: [0.015, 1.2] }, crumb: '#622499' }),
    ],
  },
  {
    n: 44, keep: true, bg: 'bg_sea', prompt: 'p44', win: 'w44',
    things: [
      T('pearl', 'clam_pearl', 360, 1045, 190, 'actor', { main: true, show: 'peek', ay: 1, ar: 0.889, idle: { breathe: [0.025, 2.6], sway: [0.03, 1.4] } }),
      T('clam_l', 'clam_closed', 130, 1045, 190, 'decoy', { ar: 1.087, ay: 1, idle: { sway: [0.012, 1.3] }, crumb: '#d02a88', react: { reveal: { asset: 'clam_crab', w: 190, dy: 0, ar: 0.928 }, say: 'r_snap', sfx: 'boing', kick: { on: 'self', type: 'shake' } } }),
      T('clam_m', 'clam_closed', 360, 1045, 190, 'target', { ar: 1.087, clue: 'sparkle', ay: 1, idle: { sway: [0.012, 1.7] }, crumb: '#d02a88' }),
      T('clam_r', 'clam_closed', 590, 1045, 190, 'decoy', { ar: 1.087, ay: 1, idle: { sway: [0.012, 1.1] }, crumb: '#d02a88', react: { reveal: { asset: 'clam_fish', w: 190, dy: 0, ar: 0.896 }, say: 'r_blub', sfx: 'pop', kick: { on: 'self', type: 'wobble' } } }),
    ],
  },
  {
    n: 45, keep: true, bg: 'bg_sea', prompt: 'p45', win: 'w45', dark: true,
    things: [
      ACTOR('angler_dark', 'angler_lit', 360, 830, 330, { ar: 0.894, mood: 'sad' }),
      T('jelly', 'jellyfish', 120, 560, 140, 'decoy', { ar: 0.954, idle: { bob: [12, 1.3], sway: [0.04, 1.6] }, crumb: '#d02a88', react: { say: 'r_bob', sfx: 'boing', kick: { on: 'self', type: 'wobble' } } }),
      T('urchin', 'urchin', 590, 1070, 120, 'decoy', { ar: 1.13, ay: 1, idle: { breathe: [0.03, 2] }, crumb: '#4a2fd0', react: { say: 'r_eek', sfx: 'boing', kick: { on: 'self', type: 'shake' } } }),
      T('weed', 'lamp_weed', 257, 553, 125, 'target', { ar: 0.996, idle: { sway: [0.03, 1.5], bob: [3, 2] }, crumb: '#2d9f25' }),
    ],
  },
  {
    n: 46, keep: true, bg: 'bg_sea', prompt: 'p46', win: 'w46',
    things: [
      ACTOR('sub_sad', 'sub_happy', 360, 790, 300, { ar: 0.927, mood: 'sad', fixMove: { dy: -200 } }),
      T('bub1', 'bubble_small', 300, 860, 44, 'actor', { show: 'fix', ar: 1.008, fixMove: { dy: -300 }, idle: { bob: [6, 2.4] } }),
      T('bub2', 'bubble_small', 430, 850, 34, 'actor', { show: 'fix', ar: 1.008, fixMove: { dy: -340 }, idle: { bob: [6, 2.9] } }),
      T('puffer', 'puffer', 130, 650, 150, 'decoy', { ar: 1.114, idle: { bob: [8, 1.5], sway: [0.04, 1.4] }, crumb: '#e8743b', react: { reveal: { asset: 'puffer_big', w: 220, dy: 0, ar: 1.115 }, say: 'r_puff', sfx: 'pop', kick: { on: 'self', type: 'wobble' } } }),
      T('map', 'map_scroll', 590, 1065, 150, 'decoy', { ar: 0.739, ay: 1, idle: { sway: [0.02, 1.7] }, crumb: '#c9902f', react: { say: 'r_creak', sfx: 'boing', kick: { on: 'self', type: 'swing' } } }),
      T('bag', 'weight_bag', 360, 975, 150, 'target', { tie: 'actor', tieAt: [0, 0.42], ar: 0.848, idle: { sway: [0.02, 1.5], bob: [3, 2.2] }, crumb: '#aa6a28' }),
    ],
  },
  {
    n: 47, keep: true, bg: 'bg_sea', prompt: 'p47', win: 'w47',
    things: [
      ACTOR('sea_chest_closed', 'sea_chest_open', 340, 1050, 300, { main: false, ay: 1, ar: 1.221 }),
      ACTOR('seahorse_sad', 'seahorse_happy', 600, 960, 130, { ar: 0.549, mood: 'sad' }),
      T('eel', 'eel', 152, 640, 220, 'decoy', { ar: 0.84, idle: { bob: [8, 1.5], sway: [0.04, 1.3] }, crumb: '#e8c42a', react: { say: 'r_zap', sfx: 'pop', kick: { on: 'self', type: 'shiver' } } }),
      T('shell', 'shell_spiral', 110, 1075, 130, 'decoy', { ar: 0.747, ay: 1, idle: { sway: [0.02, 1.7] }, crumb: '#e8743b', react: { reveal: { asset: 'hermit', w: 130, dy: -30, ar: 0.856 }, say: 'r_peek', sfx: 'boing', kick: { on: 'self', type: 'shake' } } }),
      T('chain', 'chest_chain', 340, 930, 320, 'target', { ar: 1.048, idle: { sway: [0.015, 1.4], breathe: [0.012, 1.8] }, crumb: '#3d6fd2' }),
    ],
  },
  {
    n: 48, keep: true, bg: 'bg_sea', prompt: 'p48', win: 'w48',
    things: [
      ACTOR('sea_band_sad', 'sea_band_happy', 360, 1050, 340, { ay: 1, ar: 2.006, mood: 'sad' }),
      T('fire', 'firework', 360, 560, 240, 'actor', { show: 'fix', ar: 0.84, idle: { breathe: [0.06, 3.2], sway: [0.05, 1.7] } }),
      T('bub1', 'bubble_small', 220, 760, 50, 'actor', { show: 'fix', ar: 1.008, fixMove: { dy: -120 }, idle: { bob: [8, 2.2] } }),
      T('bub2', 'bubble_small', 500, 740, 40, 'actor', { show: 'fix', ar: 1.008, fixMove: { dy: -140 }, idle: { bob: [8, 2.7] } }),
      T('conch', 'conch', 100, 1070, 120, 'decoy', { ar: 0.575, ay: 1, idle: { sway: [0.02, 1.7] }, crumb: '#e8743b', react: { say: 'r_toot', sfx: 'boing', kick: { on: 'self', type: 'wobble' } } }),
      T('crabdrum', 'crab_drum', 608, 1070, 125, 'decoy', { ar: 1.156, ay: 1, idle: { sway: [0.04, 2.2], bob: [3, 3] }, crumb: '#cf3d34', react: { say: 'r_boom', sfx: 'pop', kick: { on: 'self', type: 'hop' } } }),
      T('kelp', 'kelp_curtain', 360, 905, 370, 'target', { ar: 0.836, idle: { sway: [0.015, 1.3], breathe: [0.01, 1.7] }, crumb: '#2d9f25' }),
    ],
  },
  {
    n: 49, keep: true, bg: 'bg_fair', prompt: 'p49', win: 'w49',
    things: [
      T('carousel', 'carousel', 330, 1045, 440, 'actor', { main: false, ay: 1, ar: 0.813, idle: { sway: [0.004, 1.5] } }),
      ACTOR('horse_sad', 'horse_happy', 250, 1022, 175, { ar: 0.604, mood: 'sad', afterW: 175 }),
      T('balloons', 'balloons', 120, 600, 150, 'decoy', { ar: 0.824, idle: BOB(12, 1.2), crumb: '#cf3d34', react: { say: 'r_pop', sfx: 'pop', regrow: 'float', kick: { on: 'self', type: 'swing' } } }),
      T('popcorn', 'popcorn', 605, 1065, 120, 'decoy', { ar: 0.722, ay: 1, idle: { breathe: [0.02, 2] }, crumb: '#ebb439', react: { say: 'r_pop', sfx: 'pop', kick: { on: 'self', type: 'shake' } } }),
      T('gum', 'gum_blob', 431, 872, 118, 'target', { ar: 1.138, idle: { breathe: [0.02, 1.8], sway: [0.015, 1.2] }, crumb: '#d02a88' }),
    ],
  },
  {
    n: 50, keep: true, bg: 'bg_fair', prompt: 'p50', win: 'w50',
    things: [
      ACTOR('clown_pie', 'clown_happy', 360, 1050, 330, { afterW: 339, ar: 0.642, mood: 'sad' }),
      T('jball', 'juggle_ball', 102, 1068, 100, 'decoy', { ar: 0.999, ay: 1, idle: { breathe: [0.03, 1.6], sway: [0.03, 1.4] }, crumb: '#2d6cc2', react: { say: 'r_boing', sfx: 'boing', kick: { on: 'self', type: 'hop' } } }),
      T('fdog', 'fair_dog', 592, 1065, 150, 'decoy', { ar: 0.741, ay: 1, idle: { breathe: [0.03, 2.2], sway: [0.03, 1.6] }, crumb: '#aa6a28', react: { say: 'r_whee', sfx: 'boing', kick: { on: 'self', type: 'spin' } } }),
      T('pie', 'cream_pie', 360, 640, 172, 'target', { ar: 1.232, idle: { sway: [0.02, 1.4], breathe: [0.015, 1.8] }, crumb: '#e8c42a' }),
    ],
  },
  {
    n: 51, keep: true, bg: 'bg_fair', prompt: 'p51', win: 'w51',
    things: [
      T('teddy', 'teddy', 552, 1055, 130, 'actor', { main: true, show: 'peek', ay: 1, ar: 0.734, idle: { breathe: [0.03, 2.4], sway: [0.04, 1.6] } }),
      T('box_l', 'prize_box', 158, 1055, 196, 'decoy', { ar: 0.903, ay: 1, idle: { sway: [0.012, 1.3] }, crumb: '#cf3d34', react: { reveal: { asset: 'jack_box', w: 150, dy: -110, ar: 0.72 }, say: 'r_boing', sfx: 'boing', kick: { on: 'self', type: 'shake' } } }),
      T('box_m', 'prize_box', 356, 1055, 196, 'decoy', { ar: 0.903, ay: 1, idle: { sway: [0.012, 1.7] }, crumb: '#cf3d34', react: { reveal: { asset: 'rubber_duck', w: 120, dy: -100, ar: 0.796 }, say: 'r_squeak', sfx: 'pop', kick: { on: 'self', type: 'wobble' } } }),
      T('box_r', 'prize_box', 552, 1055, 196, 'target', { ar: 0.903, clue: 'heart', ay: 1, idle: { sway: [0.012, 1.1] }, crumb: '#cf3d34' }),
    ],
  },
  {
    n: 52, keep: true, bg: 'bg_fair', prompt: 'p52', win: 'w52',
    things: [
      ACTOR('kid_fair_sad', 'kid_fair_happy', 205, 1062, 195, { ar: 0.696, mood: 'sad', afterW: 207, afterDelay: 1.7 }),
      T('bear', 'prize_bear', 345, 1062, 130, 'actor', { show: 'fix', showDelay: 1.5, ay: 1, ar: 0.817, idle: { breathe: [0.03, 2.2], sway: [0.04, 1.5] } }),
      T('bell', 'stall_bell', 88, 1065, 80, 'decoy', { ar: 1.093, ay: 1, idle: { sway: [0.03, 1.6] }, crumb: '#ebb439', react: { say: 'r_ding', sfx: 'boing', kick: { on: 'self', type: 'swing' } } }),
      T('basket', 'ball_basket', 603, 1065, 96, 'decoy', { ar: 0.929, ay: 1, idle: { breathe: [0.015, 2] }, crumb: '#cf3d34', react: { say: 'r_oops', sfx: 'boing', kick: { on: 'self', type: 'tip' } } }),
      T('cans', 'can_stack', 468, 1060, 180, 'target', { exit: 'topple', ar: 0.806, ay: 1, idle: { sway: [0.015, 1.4], breathe: [0.012, 1.8] }, crumb: '#2d6cc2' }),
    ],
  },
  {
    n: 53, keep: true, bg: 'bg_fair', prompt: 'p53', win: 'w53', bgHide: 'wheel', evening: true, dusk: 'lift', glow: 'wheel_lit',
    things: [
      ACTOR('wheel_dark', 'wheel_lit', 272, 545, 420, { ay: 0.5, ar: 0.902, afterW: 420, steady: true, wheel: true, spinSec: 25, idle: { breathe: [0.006, 1.6] } }),
      T('ticket', 'ticket_sign', 112, 1065, 120, 'decoy', { ar: 0.65, ay: 1, idle: { sway: [0.02, 1.7] }, crumb: '#d93030', react: { say: 'r_whee', sfx: 'boing', kick: { on: 'self', type: 'spin' } } }),
      T('cart', 'ice_cart', 598, 1065, 140, 'decoy', { ar: 0.873, ay: 1, idle: { breathe: [0.015, 2] }, crumb: '#3d8fd2', react: { say: 'r_ding', sfx: 'boing', kick: { on: 'self', type: 'wobble' } } }),
      T('owl', 'fair_owl', 470, 1065, 100, 'decoy', { ar: 0.643, ay: 1, idle: { breathe: [0.03, 2.4], sway: [0.025, 1.6] }, crumb: '#aa6a28', react: { say: 'r_hoot', sfx: 'boing', kick: { on: 'self', type: 'hop' } } }),
      T('knot', 'cable_knot', 300, 880, 210, 'target', { tie: 'actor', tieAt: [0.04, 0.42], ar: 1.316, idle: { sway: [0.03, 1.6], bob: [3, 2.1] }, crumb: '#b4652a' }),
    ],
  },
  {
    n: 54, keep: true, bg: 'bg_fair', prompt: 'p54', win: 'w54', lift: 100,
    things: [
      T('fire', 'firework', 360, 520, 200, 'actor', { show: 'fix', ar: 0.84, idle: { breathe: [0.06, 3.2], sway: [0.05, 1.7] } }),
      ACTOR('crowd_sad', 'crowd_happy', 360, 950, 560, { ar: 1.499, mood: 'sad', afterW: 585 }),
      T('crate', 'fire_crate', 360, 1125, 250, 'actor', { behindCard: true, main: false, ay: 1, ar: 0.784 }),
      T('trumpet', 'trumpet', 108, 1070, 110, 'decoy', { ar: 1.162, ay: 1, idle: { sway: [0.02, 1.6] }, crumb: '#ebb439', react: { say: 'r_toot', sfx: 'boing', kick: { on: 'self', type: 'shiver' } } }),
      T('bunting', 'bunting', 360, 520, 440, 'decoy', { ar: 2.514, idle: { sway: [0.012, 1.5] }, crumb: '#d93030', react: { say: 'r_flap', sfx: 'boing', kick: { on: 'self', type: 'swing' } } }),
      T('drum', 'drum', 598, 1070, 120, 'decoy', { ar: 0.869, ay: 1, idle: { breathe: [0.03, 1.4] }, crumb: '#cf3d34', react: { say: 'r_boom', sfx: 'pop', kick: { on: 'self', type: 'shake' } } }),
      T('tarp', 'wet_tarp', 360, 1129, 235, 'target', { ay: 1, ar: 1.444, idle: { sway: [0.01, 1.2], breathe: [0.012, 1.5] }, crumb: '#3d6fd2' }),
    ],
  },
  {
    n: 55, keep: true, bg: 'bg_jungle', prompt: 'p55', win: 'w55',
    things: [
      T('bridge', 'rope_bridge', 360, 1040, 600, 'actor', { main: false, ay: 1, ar: 1.53, idle: { sway: [0.004, 1.4] } }),
      ACTOR('tiger_sad', 'tiger_happy', 140, 1000, 170, { ar: 0.777, mood: 'sad', afterW: 170, fixMove: { dx: 440, walk: true } }),
      T('fly', 'butterfly', 540, 600, 110, 'decoy', { ar: 1.182, idle: { bob: [12, 1.6], sway: [0.06, 1.8] }, crumb: '#e8743b', react: { say: 'r_flap', sfx: 'boing', regrow: 'float', kick: { on: 'self', type: 'spin' } } }),
      T('mush', 'mushroom', 610, 1085, 110, 'decoy', { ar: 1.016, ay: 1, idle: { breathe: [0.025, 2.1] }, crumb: '#cf3d34', react: { say: 'r_boing', sfx: 'boing', kick: { on: 'self', type: 'hop' } } }),
      T('thorns', 'thorn_bush', 380, 950, 220, 'target', { ar: 1.079, idle: { sway: [0.02, 1.4], breathe: [0.012, 1.8] }, crumb: '#2d9f25' }),
    ],
  },
  {
    n: 56, keep: true, bg: 'bg_jungle', prompt: 'p56', win: 'w56',
    things: [
      ACTOR('toucan_sad', 'toucan_happy', 195, 1040, 250, { ar: 0.859, mood: 'sad', afterW: 276 }),
      T('mango', 'mango', 465, 1065, 110, 'actor', { show: 'peek', ay: 1, ar: 0.713, idle: { sway: [0.04, 1.5] } }),
      T('snake', 'snake_cute', 622, 1075, 100, 'decoy', { ar: 0.85, ay: 1, idle: { sway: [0.04, 1.5], breathe: [0.02, 2.2] }, crumb: '#2d9f25', react: { say: 'r_hiss', sfx: 'boing', kick: { on: 'self', type: 'wobble' } } }),
      T('tfrog', 'tree_frog', 322, 1075, 84, 'decoy', { ar: 1.033, ay: 1, idle: { breathe: [0.03, 2] }, crumb: '#2d9f25', react: { say: 'r_croak', sfx: 'croak', regrow: 'float', kick: { on: 'self', type: 'hop' } } }),
      T('leaf', 'big_leaf', 465, 952, 200, 'target', { ar: 0.815, idle: { sway: [0.025, 1.5], breathe: [0.012, 1.8] }, crumb: '#2d9f25' }),
    ],
  },
  {
    n: 57, keep: true, bg: 'bg_jungle', prompt: 'p57', win: 'w57',
    things: [
      T('baby', 'monkey_baby', 170, 940, 130, 'actor', { main: true, show: 'peek', ar: 0.936, idle: { breathe: [0.03, 2.4], sway: [0.05, 1.6] } }),
      T('bush_l', 'jungle_bush', 170, 940, 210, 'target', { ar: 1.055, clue: 'zzz', idle: { sway: [0.015, 1.3] }, crumb: '#2d9f25' }),
      T('bush_m', 'jungle_bush', 360, 940, 210, 'decoy', { ar: 1.055, idle: { sway: [0.015, 1.7] }, crumb: '#2d9f25', react: { reveal: { asset: 'chameleon', w: 170, dy: -70, ar: 0.938 }, say: 'r_hi', sfx: 'boing', kick: { on: 'self', type: 'shake' } } }),
      T('bush_r', 'jungle_bush', 556, 940, 210, 'decoy', { ar: 1.055, idle: { sway: [0.015, 1.1] }, crumb: '#2d9f25', react: { reveal: { asset: 'parrot_small', w: 120, dy: -80, ar: 0.82 }, say: 'r_squawk', sfx: 'boing', kick: { on: 'self', type: 'wobble' } } }),
    ],
  },
  {
    n: 58, keep: true, bg: 'bg_jungle', prompt: 'p58', win: 'w58',
    patch: { x: 360, y: 1000, w: 620, h: 250, c: ['#2f93da', '#1a5c9e', '#4cbfe6'], mud: { x: 300, y: 1082, w: 290, h: 84, c: ['#b8742c', '#a35c14', '#d0872a'] } },
    splash: { x: 300, y: 1000, at: 0.35 },
    things: [
      ACTOR('fall_dry', 'fall_flow', 360, 628, 330, { main: false, ay: 0.2, ar: 0.737, afterW: 430, idle: { breathe: [0.006, 1.6] } }),
      ACTOR('hippo_sad', 'hippo_happy', 300, 1010, 250, { ay: 0.7, ar: 0.842, mood: 'sad', afterW: 250 }),
      T('lily', 'lily_pad', 570, 1010, 110, 'decoy', { ar: 1.018, idle: { breathe: [0.02, 2], sway: [0.03, 1.5] }, crumb: '#2d9f25', react: { say: 'r_whee', sfx: 'boing', kick: { on: 'self', type: 'spin' } } }),
      T('dfly', 'dragonfly', 140, 640, 120, 'decoy', { ar: 1.185, idle: { bob: [10, 1.4], sway: [0.05, 1.8] }, crumb: '#3d8fd2', react: { say: 'r_zoom', sfx: 'boing', regrow: 'float', kick: { on: 'self', type: 'swing' } } }),
      T('lturtle', 'log_turtle', 138, 1012, 170, 'decoy', { ar: 0.888, idle: { breathe: [0.02, 2.2] }, crumb: '#aa6a28', react: { say: 'r_peek', sfx: 'boing', kick: { on: 'self', type: 'wobble' } } }),
      T('boulder', 'boulder', 360, 540, 200, 'target', { ar: 1.011, idle: { sway: [0.01, 1.4], breathe: [0.01, 1.7] }, crumb: '#aa6a28' }),
    ],
  },
  {
    n: 59, keep: true, bg: 'bg_jungle', prompt: 'p59', win: 'w59',
    things: [
      T('flower', 'jungle_flower', 340, 1060, 130, 'actor', { hideOnFix: true, main: false, ay: 1, ar: 0.589, idle: { sway: [0.03, 1.6] } }),
      ACTOR('sloth_sad', 'sloth_happy', 360, 720, 300, { ay: 0.5, ar: 1.083, mood: 'sad', afterW: 300, fixMove: { dy: 60 } }),
      T('hive', 'beehive', 165, 520, 140, 'decoy', { ar: 0.692, idle: { sway: [0.03, 1.5] }, crumb: '#ebb439', react: { say: 'r_buzz', sfx: 'boing', swap: { asset: 'bee', w: 70, n: 3, gap: 64 }, kick: { on: 'self', type: 'shake' } } }),
      T('bananas', 'banana_bunch', 600, 1070, 130, 'decoy', { ar: 0.992, ay: 1, idle: { sway: [0.02, 1.7] }, crumb: '#ebb439', react: { say: 'r_thud', sfx: 'boing', kick: { on: 'self', type: 'tip' } } }),
      T('beetle', 'beetle', 175, 1075, 100, 'decoy', { ar: 0.894, ay: 1, idle: { sway: [0.04, 1.8], breathe: [0.025, 2.2] }, crumb: '#622499', react: { say: 'r_boing', sfx: 'boing', kick: { on: 'self', type: 'hop' } } }),
      T('vknot', 'vine_knot', 540, 540, 200, 'target', { rim: '#ebb439', tie: 'actor', tieAt: [0.3, -0.38], ar: 1.519, idle: { sway: [0.03, 1.6], bob: [7, 2.4] }, crumb: '#2d9f25' }),
    ],
  },
  {
    n: 60, keep: true, bg: 'bg_jungle', prompt: 'p60', win: 'w60', lift: 258,
    finale: { hold: 2.5, bursts: [{ at: 0.35, x: 112, y: 480, cols: ['#ebb439', '#e8743b', '#d93030'] }, { at: 0.95, x: 608, y: 500, cols: ['#2d6cc2', '#2d9f25', '#ebb439'] }, { at: 1.55, x: 112, y: 660, cols: ['#d93030', '#ebb439', '#9951d6'] }, { at: 2.15, x: 608, y: 680, cols: ['#e8743b', '#2d9f25', '#2d6cc2'] }, { at: 2.75, x: 360, y: 400, n: 56, v: [130, 320], r: 11, cols: ['#ebb439', '#d93030', '#2d6cc2', '#2d9f25', '#e8743b'] }] },
    things: [
      T('temple', 'temple_closed', 360, 900, 350, 'actor', { after: 'temple_open', main: false, ay: 1, ar: 0.938, afterW: 350 }),
      ACTOR('jfriends_sad', 'jfriends_happy', 300, 1050, 240, { ar: 1.801, mood: 'sad', afterW: 240, turns: 3 }),
      T('fire', 'firework', 582, 640, 180, 'actor', { show: 'fix', ar: 0.84, idle: { breathe: [0.06, 3.2], sway: [0.05, 1.7] } }),
      T('idol', 'stone_idol', 100, 1075, 110, 'decoy', { ar: 0.614, ay: 1, idle: { breathe: [0.01, 2] }, crumb: '#aa6a28', react: { say: 'r_creak', sfx: 'boing', kick: { on: 'self', type: 'wobble' } } }),
      T('torch', 'torch', 485, 1070, 80, 'decoy', { ar: 0.329, ay: 1, idle: { sway: [0.02, 1.7] }, crumb: '#e8743b', react: { say: 'r_whoosh', sfx: 'pop', kick: { on: 'self', type: 'shiver' } } }),
      T('bongo', 'bongo', 610, 1075, 120, 'decoy', { ar: 1.658, ay: 1, idle: { breathe: [0.03, 1.4] }, crumb: '#aa6a28', react: { say: 'r_boom', sfx: 'pop', kick: { on: 'self', type: 'shake' } } }),
      T('vines', 'temple_vines', 360, 775, 200, 'target', { ar: 1.03, idle: { sway: [0.015, 1.4], breathe: [0.012, 1.8] }, crumb: '#2d9f25' }),
    ],
  },
  {
    n: 61, bg: 'bg_snow_village', prompt: 'p61', win: 'w61', weather: { kind: 'snow', x: 360, y: 480, w: 620, h: 850 }, warmReveal: true,
    things: [
      ACTOR('snowman_sad', 'snowman_happy', 360, 1080, 330, { ar: 0.78, mood: 'sad', afterW: 330 }),
      T('nose_drift', 'snow_pile', 360, 755, 250, 'target', { ar: 1.13, clue: 'heart', idle: BOB(3, 1.1), crumb: '#e5f6ff' }),
      T('snowcloud', 'snowcloud', 150, 460, 210, 'decoy', { ar: 1.3, idle: BOB(7, 1.3), crumb: '#8bb8e8', react: { say: 'r_brr', sfx: 'boing', kick: { on: 'actor', type: 'shiver' } } }),
      T('seal', 'seal', 570, 1060, 145, 'decoy', { ar: 0.88, ay: 1, idle: { breathe: [0.025, 2.1] }, crumb: '#8bb8e8', react: { say: 'r_honk', sfx: 'boing', kick: { on: 'self', type: 'hop' } } }),
    ],
  },
  {
    n: 62, bg: 'bg_snow_village', prompt: 'p62', win: 'w62', weather: { kind: 'snow', x: 360, y: 520, w: 620, h: 820 }, warmReveal: true,
    things: [
      ACTOR('penguin_shivering', 'penguin_happy', 360, 1060, 230, { ar: 0.58, mood: 'sad', breath: true, afterW: 230 }),
      T('cloud_cold', 'cloud_rain', 360, 530, 300, 'target', { ar: 0.94, clue: 'heart', idle: BOB(6, 1.4), crumb: '#9bb5c8' }),
      T('snowball', 'snow_pile', 148, 1050, 170, 'decoy', { ar: 1.13, ay: 1, crumb: '#e5f6ff', react: { say: 'r_oops', sfx: 'boing', kick: { on: 'self', type: 'shake' } } }),
      T('seal', 'seal', 574, 1060, 160, 'decoy', { ar: 0.88, ay: 1, crumb: '#8bb8e8', react: { say: 'r_splash', sfx: 'pop', kick: { on: 'self', type: 'hop' } } }),
    ],
  },
  {
    n: 63, bg: 'bg_snow_pond', prompt: 'p63', win: 'w63', weather: { kind: 'snow', x: 360, y: 500, w: 620, h: 850 }, warmReveal: true,
    things: [
      T('fish', 'fish_sleepy', 360, 850, 200, 'actor', { after: 'fish_jump', main: true, ay: 0.5, ar: 1.41, idle: { breathe: [0.02, 1.8] }, fixMove: { dy: -35 } }),
      T('frost', 'frost_scribbles', 360, 810, 410, 'target', { ar: 1.6, clue: 'zzz', idle: BOB(3, 1.2), crumb: '#dff5ff' }),
      T('snowcloud', 'snowcloud', 155, 450, 190, 'decoy', { ar: 1.3, crumb: '#8bb8e8', react: { say: 'r_brr', sfx: 'boing', kick: { on: 'self', type: 'shiver' } } }),
      T('seal', 'seal', 565, 1045, 155, 'decoy', { ar: 0.88, ay: 1, crumb: '#8bb8e8', react: { say: 'r_splash', sfx: 'pop', kick: { on: 'self', type: 'hop' } } }),
    ],
  },
  {
    n: 64, bg: 'bg_snow_cabin', prompt: 'p64', win: 'w64', weather: { kind: 'snow', x: 360, y: 400, w: 620, h: 760 }, warmReveal: true,
    things: [
      ACTOR('cocoa_worried', 'cocoa_happy', 360, 1040, 300, { ar: 0.88, mood: 'sad', afterW: 300 }),
      T('fly', 'fly', 360, 835, 86, 'target', { ar: 1, idle: { orbit: [24, 2.1, 12], jitter: 1.5 }, crumb: '#6c3c22' }),
      T('spoon', 'spoon', 165, 1025, 118, 'decoy', { ar: 0.55, ay: 1, crumb: '#c99a2e', react: { say: 'r_ding', sfx: 'boing', kick: { on: 'self', type: 'spin' } } }),
      T('cat', 'cat_annoyed', 570, 1040, 170, 'decoy', { ar: 1.2, ay: 1, crumb: '#c96d2a', react: { say: 'r_bow', sfx: 'boing', kick: { on: 'self', type: 'hop' } } }),
    ],
  },
  {
    n: 65, bg: 'bg_snow_village', prompt: 'p65', win: 'w65', weather: { kind: 'snow', x: 360, y: 500, w: 620, h: 850 }, warmReveal: true,
    things: [
      ACTOR('sled_stuck', 'sled_happy', 360, 1060, 350, { ar: 1.8, mood: 'sad', afterW: 350 }),
      T('drift', 'snow_pile', 360, 1000, 320, 'target', { ar: 1.13, clue: 'heart', idle: BOB(3, 1.1), crumb: '#e5f6ff' }),
      T('penguin', 'penguin_baby', 150, 1040, 142, 'decoy', { ar: 0.8, ay: 1, crumb: '#4b5c6e', react: { say: 'r_whee', sfx: 'boing', kick: { on: 'self', type: 'hop' } } }),
      T('snowcloud', 'snowcloud', 570, 490, 200, 'decoy', { ar: 1.3, crumb: '#8bb8e8', react: { say: 'r_brr', sfx: 'boing', kick: { on: 'actor', type: 'shiver' } } }),
    ],
  },
  {
    n: 66, bg: 'bg_snow_village', prompt: 'p66', win: 'w66', weather: { kind: 'snow', x: 360, y: 500, w: 620, h: 850 }, warmReveal: true,
    things: [
      ACTOR('reindeer_bare', 'reindeer_happy', 360, 1080, 330, { ar: 0.85, mood: 'sad', breath: true, afterW: 290 }),
      T('tangled_scarf', 'tangled_scarf', 360, 950, 180, 'target', { ar: 1.12, clue: 'heart', idle: BOB(3, 1.3), crumb: '#e8743b' }),
      T('snowcloud', 'snowcloud', 150, 455, 205, 'decoy', { ar: 1.3, crumb: '#8bb8e8', react: { say: 'r_brr', sfx: 'boing', kick: { on: 'actor', type: 'shiver' } } }),
      T('seal', 'seal', 570, 1050, 150, 'decoy', { ar: 0.88, ay: 1, crumb: '#8bb8e8', react: { say: 'r_honk', sfx: 'boing', kick: { on: 'self', type: 'hop' } } }),
    ],
  },
];

export const LEVEL_ASSETS = LEVELS.map((lv) => {
  const ids = new Set([lv.bg]);
  if (lv.n === 1) ids.add('hand_point');
  for (const th of lv.things) {
    ids.add(th.asset);
    if (th.after) ids.add(th.after);
    if (th.wheel) for (const id of ['wheel_rim', 'wheel_cabins', 'wheel_stand']) ids.add(id);
    if (th.react) { if (th.react.reveal) ids.add(th.react.reveal.asset); if (th.react.swap) ids.add(th.react.swap.asset); }
  }
  return [...ids];
});
