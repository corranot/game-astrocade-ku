// PROTOTYPE - NOT FOR PRODUCTION
// Lint fixture: the same shapes done right (expect: nothing).
class Sound {
  constructor() { this.beat = 0; this.play = this.play.bind(this); }
  play() { return this.beat; }
  step() { return 1; }
}
class Game {
  constructor(cfg) { this.cfg = JSON.parse(JSON.stringify(cfg)); }
  bind(el, pad) { el.addEventListener('click', () => this.tryBuild(pad)); }
  tryBuild(b) {
    if (!b) return;
    b.start();
  }
}
window.s = new Sound(); window.g = new Game(window.gameConfig || {});
// a debug object's getters inside a method are not class methods
class Dbg { constructor() { this.S = {}; } debug() { const g = this; return { get S() { return g.S; } }; } }
window.d = new Dbg();
