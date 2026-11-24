// PROTOTYPE - NOT FOR PRODUCTION
// Lint fixture: a counter field named like a method replaces the method (expect: shadow).
class Sound {
  constructor() { this.step = 0; }
  step() { return 1; }
}
window.s = new Sound();
