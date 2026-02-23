const { JSDOM } = require('jsdom');

(async () => {
  try {
    const dom = await JSDOM.fromFile('teamA.html', {
      runScripts: 'dangerously',
      resources: 'usable',
      url: 'http://localhost:8000/'
    });

    // wait for external scripts to load
    await new Promise(resolve => setTimeout(resolve, 800));

    const win = dom.window;
    if (typeof win.setupWordSearchLevel !== 'function') {
      console.error('setupWordSearchLevel not found on window');
      process.exit(2);
    }

    // call with default cfgLevel
    win.setupWordSearchLevel({ level: 5, mode: 'wordsearch' });

    // give scripts time to run
    await new Promise(resolve => setTimeout(resolve, 200));

    const state = win.wordSearchState;
    if (!state) {
      console.error('wordSearchState not created');
      process.exit(3);
    }

    console.log('Grid size:', state.grid.length);
    console.log('Words placed:', state.words.length);
    console.log('Placed metadata count:', (win.wordSearchPlaced || []).length);
    console.log('Sample words:', state.words.slice(0,6).join(', '));
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
