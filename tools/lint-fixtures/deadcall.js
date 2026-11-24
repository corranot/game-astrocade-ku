// PROTOTYPE - NOT FOR PRODUCTION
// Lint fixture: a button calls a method without the argument it needs (expect: deadcall).
class Game {
  bind(el) { el.addEventListener('click', () => this.tryBuild()); }
  tryBuild(b) {
    if (!b) return;
    b.start();
  }
}
window.g = new Game();
