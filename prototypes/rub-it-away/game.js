/* Rub It Away: solve cheerful visual puzzles by rubbing away the one thing spoiling each scene. Play mode is for touch-first play; Edit mode is a quiet visual creator editor. */
let parametersRegistered = false;
function registerCreatorParameters() {
  if (parametersRegistered) return;
  const api = window.lib && window.lib.showGameParameters;
  if (typeof api !== 'function') return;
  try {
    api({
      name: 'Rub It Away',
      params: {
        'Music by default': { key: 'settings.music', type: 'checkbox' },
        'Sound effects by default': { key: 'settings.effects', type: 'checkbox' },
        'Haptics by default': { key: 'settings.haptics', type: 'checkbox' },
        'Reduced motion by default': { key: 'settings.reduceMotion', type: 'checkbox' },
      },
    });
    parametersRegistered = true;
  } catch (e) { try { window.lib.log('game parameter registration failed: ' + String(e)); } catch (ignored) { /* optional API */ } }
}

function run(mode) {
  registerCreatorParameters();
  return Promise.all([
    import('./modules/util.js'),
    import('./modules/strings.js'),
    import('./modules/levels.js'),
    import('./modules/assets.js'),
    import('./modules/audio.js'),
    import('./modules/save.js'),
    import('./modules/fx.js'),
    import('./modules/thing.js'),
    import('./modules/level.js'),
    import('./modules/hand.js'),
    import('./modules/ui.js'),
    import('./modules/rules.js'),
    import('./modules/editor.js'),
    import('./modules/boot.js'),
  ]).then((modules) => modules[13].start(mode));
}
window.run = run;
