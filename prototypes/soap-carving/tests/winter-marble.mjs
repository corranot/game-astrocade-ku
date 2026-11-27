import assert from 'node:assert/strict';
import { marbleAlbedo } from '../soap.js';
import { orderShape, winterMarble } from '../winter.js';

const familiar = ['heart', 'star', 'duck', 'flower', 'fish', 'cat', 'crown', 'cloud'].map((id) => ({ id }));
const winterShapes = ['snowman', 'penguin', 'mitten', 'snowflake'].map((id) => ({ id, winter: true }));
const allShapes = [...familiar, ...winterShapes];

assert.equal(orderShape(0, false, 6, allShapes), 'heart');
assert.equal(orderShape(1, false, 6, allShapes), 'star');
// Pre-unlock selection is the original eight-shape pool, including its seeded slot formula.
assert.equal(orderShape(2, false, 6, allShapes, () => 0), familiar[(2 * 3) % 8].id);
assert.equal(orderShape(5, false, 6, allShapes, () => 0), familiar[(5 * 3) % 8].id);
assert.deepEqual([6, 7, 8, 9].map((n) => orderShape(n, false, 6, allShapes)), ['snowman', 'penguin', 'mitten', 'snowflake']);
assert.deepEqual([6, 7, 8, 9].map((n) => orderShape(n, true, 6, allShapes)), ['snowman', 'penguin', 'mitten', 'snowflake']);
assert.equal(orderShape(5, true, 6, allShapes), 'free');
assert.deepEqual([5, 6, 7, 8].map((n) => winterMarble(n, 6)), [null, 'frost', null, 'candy_cane']);

const frost = { base: '#B8E5F5', vein: '#FFFFFF', swirl: '#F3FCFF', kind: 'frost' };
const candyCane = { base: '#FFF8F3', vein: '#FFFFFF', swirl: '#EF5367', kind: 'candyCane' };
const same = (a, b) => assert.deepEqual(Array.from(a), Array.from(b));

const frostA = marbleAlbedo(frost, 96, 112, 19);
same(frostA, marbleAlbedo(frost, 96, 112, 19));
assert.equal(frostA.length, 96 * 112 * 3);
assert.ok(frostA.some((v) => v > 245), 'frost marble keeps icy white highlights');

const candyA = marbleAlbedo(candyCane, 96, 112, 23);
same(candyA, marbleAlbedo(candyCane, 96, 112, 23));
assert.equal(candyA.length, 96 * 112 * 3);
const blues = [];
for (let i = 2; i < candyA.length; i += 3) blues.push(candyA[i]);
assert.ok(Math.max(...blues) - Math.min(...blues) > 70, 'candy-cane bands have clear red-and-cream contrast');

console.log('winter shape and marble tests passed');

