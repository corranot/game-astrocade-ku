// PROTOTYPE - NOT FOR PRODUCTION
// Lint fixture: the host's config object is kept as the live config (expect: hostcfg).
class Game {
  constructor() { this.cfg = window.gameConfig; this.alive = true; }
}
window.g = new Game();
