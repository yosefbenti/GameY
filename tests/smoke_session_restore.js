const { JSDOM } = require('jsdom');

(async () => {
  try {
    // prepare a saved session snapshot for Team A (word level)
    const snapshot = {
      team: 'A',
      level: 3,
      mode: 'word',
      started: true,
      remaining: 42,
      timeLimit: 120,
      word: {
        letter: 'S',
        categories: ['Foods','Animals'],
        inputs: [ { value: 'Salmon' }, { value: 'Snake' } ],
        correctCount: 2,
        total: 2
      },
      timestamp: Date.now()
    };

    const dom = await JSDOM.fromFile('teamA.html', {
      runScripts: 'dangerously',
      resources: 'usable',
      url: 'http://localhost:8000/'
    });

    // wait for the page scripts to attach event handlers
    await new Promise(resolve => setTimeout(resolve, 300));

    const win = dom.window;
    // inject session snapshot into localStorage and trigger load event so page restores it
    win.localStorage.setItem(`gameSession:A`, JSON.stringify(snapshot));
    // ensure the currentLevelMode key is present as the loader checks that too
    win.localStorage.setItem('currentLevelMode', 'word');
    win.localStorage.setItem('currentLevel', String(3));

    // dispatch load event to invoke restore handlers
    win.dispatchEvent(new win.Event('load'));

    // allow handlers to run
    await new Promise(resolve => setTimeout(resolve, 300));

    // assertions
    if (String(win.levelMode) !== 'word') {
      console.error('Expected levelMode to be "word" but was', win.levelMode);
      process.exit(2);
    }
    if (Number(win.currentLevel) !== 3) {
      console.error('Expected currentLevel 3 but was', win.currentLevel);
      process.exit(3);
    }
    if (Number(win.remaining) !== 42) {
      console.error('Expected remaining 42 but was', win.remaining);
      process.exit(4);
    }
    if (!win.wordState || String(win.wordState.letter || '') !== 'S'){
      console.error('wordState not restored correctly');
      process.exit(5);
    }

    console.log('Session-restore smoke test passed');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
