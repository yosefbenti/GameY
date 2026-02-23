// ===============================
// Event Handlers & WebSocket Logic
// ===============================

// Example event handler and WebSocket setup:
// function setupEventListeners() { ... }
// function handleServerMessage(msg) { ... }
// function broadcast(data) { ... }
// if (pubWs) pubWs.onmessage = handleServerMessage;
// ...existing code...
// ===============================
// Shared State & Configuration
// ===============================

// Example shared variables:
// let finished = false;
// let interval = null;
// let remaining = 0;
// let levelMode = '';
// let cfg = {};
// let puzzleTimerEl, wordTimerEl, wordsearchTimerEl, pipeTimerEl;
// let puzzleScoreEl, wordScoreEl, wordCompletionEl;
// let pubWs;
// ...existing code...
// ===============================
// Utility Functions
// ===============================

// Time formatting utility
function formatTime(sec){
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s/60).toString().padStart(2,'0');
  const ss = (s%60).toString().padStart(2,'0');
  return `${m}:${ss}`;
}

// Timer tone utility
function getTimerTone(sec, limitSec){
  const limit = Math.max(1, Number(limitSec) || 1);
  const remainingSec = Math.max(0, Number(sec) || 0);
  if(remainingSec <= Math.floor(limit / 4)) return 'danger'; // 3/4 elapsed
  if(remainingSec <= Math.floor(limit / 2)) return 'warn';   // 1/2 elapsed
  return 'ok';
}

// Apply timer tone to element
function applyTimerTone(el, tone){
  if(!el || !el.classList) return;
  el.classList.remove('timer-ok', 'timer-warn', 'timer-danger');
  el.classList.add(`timer-${tone}`);
}

// Update timer displays for all modes
function updateTimerDisplays(sec, limitSec){
  const safeSec = Math.max(0, Number(sec) || 0);
  const safeLimit = Math.max(1, Number(limitSec) || 120);
  const text = formatTime(safeSec);
  const tone = getTimerTone(safeSec, safeLimit);
  updateHeartbeatForTone && updateHeartbeatForTone(tone);
  if(puzzleTimerEl){
    puzzleTimerEl.textContent = text;
    applyTimerTone(puzzleTimerEl, tone);
  }
  if(wordTimerEl){
    wordTimerEl.textContent = text;
    applyTimerTone(wordTimerEl, tone);
  }
  if(wordsearchTimerEl){
    wordsearchTimerEl.textContent = text;
    applyTimerTone(wordsearchTimerEl, tone);
  }
  if(pipeTimerEl){
    pipeTimerEl.textContent = text;
    applyTimerTone(pipeTimerEl, tone);
  }
  try{
    const g = document.getElementById('globalTimer');
    if(g){
      g.textContent = text;
      applyTimerTone(g, tone);
    }
  }catch(e){}
}

// ...existing code...
// ===============================
// Level 5: Word Search Game
// ===============================

// Word Search game initialization, timer, completion, UI, and score logic should be grouped here.
// Example structure:
// function setupWordSearchGame() { ... }
// function startWordSearchTimer() { ... }
// function onWordSearchGameComplete() { ... }
// function updateWordSearchUI() { ... }
// function recordWordSearchScore() { ... }

// ...existing code...
// ===============================
// Level 4: Memory Game
// ===============================

// Memory game initialization, timer, completion, UI, and score logic should be grouped here.
// Example structure:
// function setupMemoryGame() { ... }
// function startMemoryTimer() { ... }
// function onMemoryGameComplete() { ... }
// function updateMemoryUI() { ... }
// function recordMemoryScore() { ... }

// ...existing code...
// ===============================
// Level 3: Word Challenge Game
// ===============================

// Word Challenge game initialization, timer, completion, UI, and score logic should be grouped here.
// Example structure:
// function setupWordChallengeGame() { ... }
// function startWordChallengeTimer() { ... }
// function onWordGameComplete() { ... }
// function updateWordChallengeUI() { ... }
// function recordWordChallengeScore() { ... }

// ...existing code...
// ===============================
// Level 2: Pipe Game
// ===============================

// Pipe game initialization, timer, completion, UI, and score logic should be grouped here.
// Example structure:
// function setupPipeGame() { ... }
// function startPipeTimer() { ... }
// function onPipeGameComplete() { ... }
// function updatePipeUI() { ... }
// function recordPipeScore() { ... }

// ...existing code...
// ===============================
// Level 1: Puzzle Game
// ===============================

// Font size scaling for puzzle tiles
let puzzleFontScale = 1;
function applyPuzzleFontScale() {
  const boards = document.querySelectorAll('.board');
  boards.forEach(board => {
    const tiles = board.querySelectorAll('.piece, .card');
    tiles.forEach(tile => {
      tile.style.fontSize = `calc(28px * ${puzzleFontScale})`;
    });
  });
}

function setupPuzzleFontControls() {
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomResetBtn = document.getElementById('zoomResetBtn');
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', function() {
    puzzleFontScale = Math.max(0.5, puzzleFontScale - 0.1);
    applyPuzzleFontScale();
  });
  if (zoomInBtn) zoomInBtn.addEventListener('click', function() {
    puzzleFontScale = Math.min(2, puzzleFontScale + 0.1);
    applyPuzzleFontScale();
  });
  if (zoomResetBtn) zoomResetBtn.addEventListener('click', function() {
    puzzleFontScale = 1;
    applyPuzzleFontScale();
  });
  // Always apply font scale on load
  applyPuzzleFontScale();
}

window.addEventListener('DOMContentLoaded', setupPuzzleFontControls);

// ...existing code...
// --- Level 5 Word Search Game Core Structures ---
// Fixed version with proper multi-team roundComplete handling

const wordsearchRows = 12;
const wordsearchCols = 12;

function createWordsearchEmptyGrid() {
  const grid = Array.from({ length: wordsearchRows }, () => Array(wordsearchCols).fill(null));
  console.debug('[WordSearch] Created empty grid', JSON.stringify(grid));
  return grid;
}

const wordsearchWordList = ["OPAL", "SHOES", "PANAMA", "PYTHON", "LEVEL", "SEARCH", "PUZZLE", "GAME", "ALGORITHM", "GRID"];
let wordsearchPlacedWords = [];

const WORDSEARCH_DIRECTIONS = [
  { name: "RIGHT", rowStep: 0, colStep: 1 },
  { name: "DOWN", rowStep: 1, colStep: 0 },
  { name: "DIAG", rowStep: 1, colStep: 1 },
];

const wordsearchState = {
  A: { foundWords: new Set(), roundCompleteSent: false, timeoutId: null },
  B: { foundWords: new Set(), roundCompleteSent: false, timeoutId: null },
};

function canPlaceWordsearch(word, row, col, direction, grid) {
  for (let i = 0; i < word.length; i++) {
    const newRow = row + direction.rowStep * i;
    const newCol = col + direction.colStep * i;
    if (newRow < 0 || newRow >= wordsearchRows || newCol < 0 || newCol >= wordsearchCols) {
      console.debug(`[WordSearch] Cannot place '${word}' at (${row},${col}) dir=${direction.name}: out of bounds at (${newRow},${newCol})`);
      return false;
    }
    const cell = grid[newRow][newCol];
    if (cell !== null && cell !== word[i]) {
      console.debug(`[WordSearch] Cannot place '${word}' at (${row},${col}) dir=${direction.name}: cell conflict at (${newRow},${newCol})`);
      return false;
    }
  }
  return true;
}

function placeWordsearchWord(word, row, col, direction, grid) {
  for (let i = 0; i < word.length; i++) {
    const newRow = row + direction.rowStep * i;
    const newCol = col + direction.colStep * i;
    grid[newRow][newCol] = word[i];
  }
  wordsearchPlacedWords.push({ word, startRow: row, startCol: col, direction });
  console.debug(`[WordSearch] Placed word '${word}' at (${row},${col}) dir=${direction.name}`);
}

function placeAllWordsearchWords(grid, wordList, directions = WORDSEARCH_DIRECTIONS, maxAttempts = 100) {
  wordsearchPlacedWords = [];
  for (const word of wordList) {
    let placed = false;
    let attempt = 0;
    while (!placed && attempt < maxAttempts) {
      const direction = directions[Math.floor(Math.random() * directions.length)];
      const startRow = Math.floor(Math.random() * wordsearchRows);
      const startCol = Math.floor(Math.random() * wordsearchCols);
      console.debug(`[WordSearch] Attempting to place '${word}' at (${startRow},${startCol}) dir=${direction.name} (attempt ${attempt + 1})`);
      if (canPlaceWordsearch(word, startRow, startCol, direction, grid)) {
        placeWordsearchWord(word, startRow, startCol, direction, grid);
        placed = true;
      }
      attempt++;
    }
    if (!placed) {
      console.warn(`[WordSearch] Could not place word: ${word}`);
    }
  }
  console.debug('[WordSearch] Final placedWords:', JSON.stringify(wordsearchPlacedWords));
}

function onWordsearchFound(team, word) {
  if (!wordsearchState[team].foundWords.has(word)) {
    wordsearchState[team].foundWords.add(word);
    console.debug(`[WordSearch] Team ${team} found word: ${word}`);
    sendWordsearchProgress(team);
    checkAllWordsearchFound(team);
  }
}

function sendWordsearchProgress(team) {
  const matched = wordsearchState[team].foundWords.size;
  const totalPairs = wordsearchWordList.length;
  const remaining = totalPairs - matched;

  const message = {
    type: 'progress',
    payload: { team, matched, pairs: totalPairs, remaining, teamDisplay: team },
  };
  broadcast(message);
}

function checkAllWordsearchFound(team) {
  if (wordsearchState[team].foundWords.size === wordsearchWordList.length) {
    sendWordsearchRoundComplete(team, 'allComplete');
  }
}

function sendWordsearchRoundComplete(team, reason) {
  if (wordsearchState[team].roundCompleteSent) {
    console.debug(`[WordSearch] roundComplete already sent for team ${team}, skipping.`);
    return;
  }
  wordsearchState[team].roundCompleteSent = true;

  const matched = wordsearchState[team].foundWords.size;
  const totalPairs = wordsearchWordList.length;
  const score = matched * 10;

  const message = {
    type: 'roundComplete',
    payload: {
      team,
      level: 5,
      matched,
      pairs: totalPairs,
      score,
      bonus: 0,
      remaining: totalPairs - matched,
      reason,
      timestamp: Date.now(),
    },
  };

  console.debug(`[WordSearch] Sending roundComplete for team ${team} (reason: ${reason})`, message);
  broadcast(message);

  const otherTeam = team === 'A' ? 'B' : 'A';
  if (wordsearchState[otherTeam].roundCompleteSent) {
    broadcast({ type: 'requestNextLevel', team: 'all' });
    console.debug(`[WordSearch] Both teams finished Level 5, advancing to next level`);
  }
}

function startWordsearchTimer(team, timeLimitSeconds) {
  clearTimeout(wordsearchState[team].timeoutId);
  wordsearchState[team].timeoutId = setTimeout(() => {
    console.debug(`[WordSearch] Timeout reached for team ${team}, triggering roundComplete.`);
    sendWordsearchRoundComplete(team, 'timeout');
  }, timeLimitSeconds * 1000);
}

function resetWordsearchLevel() {
  wordsearchState.A.foundWords.clear();
  wordsearchState.B.foundWords.clear();
  wordsearchState.A.roundCompleteSent = false;
  wordsearchState.B.roundCompleteSent = false;
  clearTimeout(wordsearchState.A.timeoutId);
  clearTimeout(wordsearchState.B.timeoutId);
  wordsearchPlacedWords = [];
  console.debug('[WordSearch] Level 5 state reset');
}
// Simple 4x4 puzzle for two teams. Uses background-image slicing.
(function(){
  const ROWS = 4, COLS = 4, TOTAL = ROWS*COLS;
  // Config can be injected in the HTML via a global GAME_CONFIG
  const cfg = window.GAME_CONFIG || {};
  let currentLevel = 0;
  function setCurrentLevel(n, persist = true){
    currentLevel = Number(n) || 0;
    GAME.currentLevel = currentLevel;
    if(persist){
      try{ localStorage.setItem('currentLevel', String(currentLevel)); }catch(e){}
    }
  }
  function setCurrentMode(mode, persist = true){
    try{ if(!mode) return; mode = String(mode || '').toLowerCase(); levelMode = mode; }catch(e){}
    if(persist){
      try{ localStorage.setItem('currentLevelMode', String(mode)); }catch(e){}
    }
  }

  // --- session persistence helpers -------------------------------------------------
  function _getSessionKey(){ return `gameSession:${cfg.team || 'global'}`; }

  function saveGameSession(){
    try{
      const key = _getSessionKey();
      const snap = { team: cfg.team || 'global', level: Number(currentLevel) || 0, mode: String(levelMode || 'puzzle'), started: Boolean(started), remaining: (typeof remaining !== 'undefined' ? Number(remaining) : null), timeLimit: (typeof timeLimit !== 'undefined' ? Number(timeLimit) : null), timestamp: Date.now() };
      if(snap.mode === 'puzzle'){
        try{ snap.layout = captureBoardState() || []; }catch(e){ snap.layout = []; }
      } else if(snap.mode === 'memory'){
        snap.memory = { cards: captureMemorySnapshot() || [], matched: (memoryState && memoryState.matched) || 0, pairs: (memoryState && memoryState.pairs) || 0, timeLimit: (memoryState && memoryState.timeLimit) || timeLimit };
      } else if(snap.mode === 'word'){
        snap.word = { letter: (wordState && wordState.letter) || '', categories: (wordState && Array.isArray(wordState.categories) ? wordState.categories.slice() : []), inputs: collectWordInputs(), correctCount: (wordState && Number(wordState.correctCount)) || 0, total: (wordState && Number(wordState.total)) || 0 };
      } else if(snap.mode === 'pipe'){
        snap.pipe = {
          rows: (pipeState && Number(pipeState.rows)) || 5,
          cols: (pipeState && Number(pipeState.cols)) || 5,
          timeLimit: Number(timeLimit) || 75,
          tiles: (pipeState && Array.isArray(pipeState.tiles))
            ? pipeState.tiles.map(t=>({
                base: Array.isArray(t.base) ? t.base.slice() : [],
                rot: Number(t.rot) || 0,
                isPath: Boolean(t.isPath),
                isStart: Boolean(t.isStart),
                isEnd: Boolean(t.isEnd),
                playable: Boolean(t.playable),
              }))
            : [],
        };
      } else if(snap.mode === 'wordsearch'){
        snap.wordsearch = {
          grid: (wordSearchState && Array.isArray(wordSearchState.grid)) ? wordSearchState.grid.slice() : null,
          words: (wordSearchState && Array.isArray(wordSearchState.words)) ? wordSearchState.words.slice() : [],
          found: (wordSearchState && wordSearchState.found) ? Array.from(wordSearchState.found) : [],
          foundCellsByWord: (wordSearchState && wordSearchState.foundCellsByWord) ? wordSearchState.foundCellsByWord : {},
          selectedTiles: (wordSearchState && Array.isArray(wordSearchState.selectedTiles)) ? wordSearchState.selectedTiles.slice() : []
        };
      } else if(snap.mode === 'connect'){
        snap.connect = {
          nodes: (connectState && Array.isArray(connectState.nodes)) ? connectState.nodes.map(n=> ({ ...n })) : [],
          colors: (connectState && Array.isArray(connectState.colors)) ? connectState.colors.slice() : [],
          lines: (connectState && connectState.lines && typeof connectState.lines === 'object') ? connectState.lines : {},
          totalPairs: (connectState && Number(connectState.totalPairs)) || 0,
          matched: (connectState && Number(connectState.matched)) || 0,
          canvasSize: (connectState && Number(connectState.canvasSize)) || 520
        };
      }
      localStorage.setItem(key, JSON.stringify(snap));
    }catch(e){ /* ignore */ }
  }

  function clearSavedGameSession(){
    try{ localStorage.removeItem(_getSessionKey()); }catch(e){}
  }
  // -------------------------------------------------------------------------------
  // restore persisted level on load (if present)
  try{
    const rawCL = localStorage.getItem('currentLevel');
    if(rawCL != null){ const parsed = Number(rawCL); if(Number.isFinite(parsed)) setCurrentLevel(parsed, false); }
  }catch(e){}
  // restore persisted mode on load and attempt to re-run setup for that mode after DOM ready
  try{
    const rawMode = localStorage.getItem('currentLevelMode');
    if(rawMode){
      window.addEventListener('load', ()=>{
        try{
          // Always try to restore an in-progress session snapshot FIRST
          const sessionKey = `gameSession:${cfg.team || 'global'}`;
          const rawSess = localStorage.getItem(sessionKey);
          let restored = false;
          if(rawSess){
            const snap = JSON.parse(rawSess);
            if(snap && snap.mode && (typeof snap.level !== 'undefined')){
              // team mismatch guard
              if(cfg.team && snap.team && String(snap.team) !== String(cfg.team)) return;

              // apply level/mode from snapshot (do not persist again)
              try{ if(Number.isFinite(Number(snap.level))) setCurrentLevel(Number(snap.level), false); }catch(e){}
              try{ if(snap.mode) setCurrentMode(snap.mode, false); }catch(e){}

              // restore mode-specific state after setup has run above
              setTimeout(()=>{
                try{
                  if(snap.mode === 'puzzle'){
                    if(typeof resetLocal === 'function') resetLocal();
                    if(Array.isArray(snap.layout) && snap.layout.length && typeof restoreBoardState === 'function'){
                      restoreBoardState(snap.layout);
                    }
                    // Ensure puzzle section and board are visible after restore
                    if (typeof puzzleSection !== 'undefined' && puzzleSection) puzzleSection.classList.remove('hidden');
                    if (typeof board !== 'undefined' && board) {
                      board.style.display = 'grid';
                      board.style.visibility = '';
                    }
                    // Hide other sections
                    if (typeof wordLevelSection !== 'undefined' && wordLevelSection) wordLevelSection.classList.add('hidden');
                    if (typeof pipeLevelSection !== 'undefined' && pipeLevelSection) pipeLevelSection.classList.add('hidden');
                    if (typeof wordSearchSection !== 'undefined' && wordSearchSection) wordSearchSection.classList.add('hidden');
                    if(typeof snap.remaining !== 'undefined'){
                      remaining = Number(snap.remaining) || remaining;
                      timeLimit = Number(snap.timeLimit) || timeLimit;
                      updateTimerDisplays(remaining, timeLimit);
                      if(statusEl) statusEl.textContent = 'Restored from local session';
                      if(Boolean(snap.started)){
                        try{ startLocalTimer(Date.now(), Number(timeLimit) || remaining); }catch(e){}
                      }
                    }
                  } else if(snap.mode === 'memory'){
                    if(typeof setupMemoryLevel === 'function') setupMemoryLevel({ mode: 'memory', level: snap.level, pairs: (snap.memory && snap.memory.pairs) || undefined, timeLimit: (snap.memory && snap.memory.timeLimit) || undefined });
                    if(snap.memory && typeof applyMemorySnapshot === 'function') applyMemorySnapshot({ cards: snap.memory.cards || [], matched: snap.memory.matched || 0, pairs: snap.memory.pairs || 0 });
                    // Show memory section, hide others
                    if (typeof wordLevelSection !== 'undefined' && wordLevelSection) wordLevelSection.classList.add('hidden');
                    if (typeof pipeLevelSection !== 'undefined' && pipeLevelSection) pipeLevelSection.classList.add('hidden');
                    if (typeof wordSearchSection !== 'undefined' && wordSearchSection) wordSearchSection.classList.add('hidden');
                    if (typeof puzzleSection !== 'undefined' && puzzleSection) puzzleSection.classList.add('hidden');
                    if(typeof snap.remaining !== 'undefined'){
                      remaining = Number(snap.remaining) || remaining;
                      timeLimit = Number(snap.timeLimit) || timeLimit;
                      updateTimerDisplays(remaining, timeLimit);
                      if(statusEl) statusEl.textContent = 'Restored from local session';
                      if(Boolean(snap.started)){
                        try{ startLocalTimer(Date.now(), Number(timeLimit) || remaining); }catch(e){}
                      }
                    }
                  } else if(snap.mode === 'word'){
                    if(typeof setupWordLevel === 'function') setupWordLevel({ mode: 'word', level: snap.level, letter: (snap.word && snap.word.letter) || undefined, categories: (snap.word && snap.word.categories) || undefined });
                    if(snap.word && typeof applyWordSnapshot === 'function') applyWordSnapshot({ letter: (snap.word && snap.word.letter) || '', categories: (snap.word && snap.word.categories) || [], inputs: (snap.word && snap.word.inputs) || [], correctCount: snap.word.correctCount || 0, total: snap.word.total || 0, status: '' });
                    // Show word section, hide others
                    if (typeof wordLevelSection !== 'undefined' && wordLevelSection) wordLevelSection.classList.remove('hidden');
                    if (typeof puzzleSection !== 'undefined' && puzzleSection) puzzleSection.classList.add('hidden');
                    if (typeof pipeLevelSection !== 'undefined' && pipeLevelSection) pipeLevelSection.classList.add('hidden');
                    if (typeof wordSearchSection !== 'undefined' && wordSearchSection) wordSearchSection.classList.add('hidden');
                    if(typeof snap.remaining !== 'undefined'){
                      remaining = Number(snap.remaining) || remaining;
                      timeLimit = Number(snap.timeLimit) || timeLimit;
                      updateTimerDisplays(remaining, timeLimit);
                      if(statusEl) statusEl.textContent = 'Restored from local session';
                      if(Boolean(snap.started)){
                        try{ startLocalTimer(Date.now(), Number(timeLimit) || remaining); }catch(e){}
                      }
                    }
                  } else if(snap.mode === 'wordsearch'){
                    if(typeof setupWordSearchLevel === 'function') setupWordSearchLevel({ mode: 'wordsearch', level: snap.level, size: (snap.wordsearch && snap.wordsearch.grid && snap.wordsearch.grid.length) || undefined, words: (snap.wordsearch && snap.wordsearch.words) || undefined });
                    if(snap.wordsearch && typeof wordSearchState !== 'undefined'){
                      try{
                        if(Array.isArray(snap.wordsearch.grid)) wordSearchState.grid = snap.wordsearch.grid.slice();
                        if(Array.isArray(snap.wordsearch.words)) wordSearchState.words = snap.wordsearch.words.slice();
                        wordSearchState.found = new Set(Array.isArray(snap.wordsearch.found) ? snap.wordsearch.found : []);
                        wordSearchState.foundCellsByWord = snap.wordsearch.foundCellsByWord || {};
                        if(typeof renderWordSearchPuzzle === 'function') renderWordSearchPuzzle(wordSearchState);
                      }catch(e){}
                    }
                    // Show wordsearch section, hide others
                    if (typeof wordSearchSection !== 'undefined' && wordSearchSection) wordSearchSection.classList.remove('hidden');
                    if (typeof puzzleSection !== 'undefined' && puzzleSection) puzzleSection.classList.add('hidden');
                    if (typeof wordLevelSection !== 'undefined' && wordLevelSection) wordLevelSection.classList.add('hidden');
                    if (typeof pipeLevelSection !== 'undefined' && pipeLevelSection) pipeLevelSection.classList.add('hidden');
                    if(typeof snap.remaining !== 'undefined'){
                      remaining = Number(snap.remaining) || remaining;
                      timeLimit = Number(snap.timeLimit) || timeLimit;
                      updateTimerDisplays(remaining, timeLimit);
                      if(statusEl) statusEl.textContent = 'Restored from local session';
                      if(Boolean(snap.started)){
                        try{ startLocalTimer(Date.now(), Number(timeLimit) || remaining); }catch(e){}
                      }
                    }
                  } else if(snap.mode === 'pipe'){
                    if(typeof setupPipeLevel === 'function'){
                      setupPipeLevel({
                        mode: 'pipe',
                        level: snap.level || 4,
                        rows: (snap.pipe && snap.pipe.rows) || 5,
                        cols: (snap.pipe && snap.pipe.cols) || 5,
                        timeLimit: (snap.pipe && snap.pipe.timeLimit) || 75,
                        tiles: (snap.pipe && snap.pipe.tiles) || [],
                      });
                    }
                    if (typeof pipeLevelSection !== 'undefined' && pipeLevelSection) pipeLevelSection.classList.remove('hidden');
                    if (typeof puzzleSection !== 'undefined' && puzzleSection) puzzleSection.classList.add('hidden');
                    if (typeof wordLevelSection !== 'undefined' && wordLevelSection) wordLevelSection.classList.add('hidden');
                    if (typeof wordSearchSection !== 'undefined' && wordSearchSection) wordSearchSection.classList.add('hidden');
                    if (typeof connectLevelSection !== 'undefined' && connectLevelSection) connectLevelSection.classList.add('hidden');
                    if(typeof snap.remaining !== 'undefined'){
                      remaining = Number(snap.remaining) || remaining;
                      timeLimit = Number(snap.timeLimit) || timeLimit;
                      updateTimerDisplays(remaining, timeLimit);
                      if(statusEl) statusEl.textContent = 'Restored from local session';
                      if(Boolean(snap.started)){
                        try{ startLocalTimer(Date.now(), Number(timeLimit) || remaining); }catch(e){}
                      }
                    }
                  } else if(snap.mode === 'connect'){
                    if(typeof setupConnectLevel === 'function') setupConnectLevel({
                      mode: 'connect',
                      level: snap.level,
                      nodes: (snap.connect && snap.connect.nodes) || undefined,
                      canvasSize: (snap.connect && snap.connect.canvasSize) || undefined,
                    });
                    if(snap.connect && typeof applyConnectSnapshot === 'function'){
                      applyConnectSnapshot({
                        nodes: (snap.connect && snap.connect.nodes) || [],
                        lines: (snap.connect && snap.connect.lines) || {},
                        totalPairs: (snap.connect && snap.connect.totalPairs) || 0,
                        matched: (snap.connect && snap.connect.matched) || 0,
                        finished: Boolean(finished),
                      });
                    }
                    if (typeof connectLevelSection !== 'undefined' && connectLevelSection) connectLevelSection.classList.remove('hidden');
                    if (typeof puzzleSection !== 'undefined' && puzzleSection) puzzleSection.classList.add('hidden');
                    if (typeof wordLevelSection !== 'undefined' && wordLevelSection) wordLevelSection.classList.add('hidden');
                    if (typeof pipeLevelSection !== 'undefined' && pipeLevelSection) pipeLevelSection.classList.add('hidden');
                    if (typeof wordSearchSection !== 'undefined' && wordSearchSection) wordSearchSection.classList.add('hidden');
                    if(typeof snap.remaining !== 'undefined'){
                      remaining = Number(snap.remaining) || remaining;
                      timeLimit = Number(snap.timeLimit) || timeLimit;
                      updateTimerDisplays(remaining, timeLimit);
                      if(statusEl) statusEl.textContent = 'Restored from local session';
                      if(Boolean(snap.started)){
                        try{ startLocalTimer(Date.now(), Number(timeLimit) || remaining); }catch(e){}
                      }
                    }
                  }
                }catch(e){ console.error('restore session snapshot failed', e); }
              }, 50);
              restored = true;
            }
          }
          // If not restored, run the default setup logic
          if(!restored){
            const m = String(rawMode || '').toLowerCase();
            if(m === 'wordsearch' && typeof setupWordSearchLevel === 'function'){
              try{ setupWordSearchLevel({ mode: 'wordsearch', level: currentLevel }); }catch(e){}
              levelMode = 'wordsearch';
            } else if(m === 'word' && typeof setupWordLevel === 'function'){
              try{ setupWordLevel({ mode: 'word', level: currentLevel }); }catch(e){}
              levelMode = 'word';
            } else if(m === 'memory' && typeof setupMemoryLevel === 'function'){
              try{ setupMemoryLevel({ mode: 'memory', level: currentLevel }); }catch(e){}
              levelMode = 'memory';
            } else if(m === 'pipe' && typeof setupPipeLevel === 'function'){
              try{ setupPipeLevel({ mode: 'pipe', level: currentLevel }); }catch(e){}
              levelMode = 'pipe';
            } else if(m === 'connect' && typeof setupConnectLevel === 'function'){
              try{ setupConnectLevel({ mode: 'connect', level: currentLevel }); }catch(e){}
              levelMode = 'connect';
            } else if(m === 'puzzle'){
              levelMode = 'puzzle';
              if(typeof resetLocal === 'function') try{ resetLocal(); }catch(e){}
            }
          }
        }catch(e){}
      });
    }
  }catch(e){}
  const GAME = window.GAME || (window.GAME = {});
  if(typeof GAME.currentLevel === 'undefined') GAME.currentLevel = currentLevel;
  if(!GAME.A) GAME.A = { level3Score: 0 };
  if(!GAME.B) GAME.B = { level3Score: 0 };
  // default image (can be overridden by admin). If levels are provided use first.
  let imageUrl = (cfg.levels && cfg.levels[0]) || cfg.imageUrl || 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1600&auto=format&fit=crop&ixlib=rb-4.0.3&s=0c5a7e3a1da6c2a1234567890abcdef';

  const containerId = cfg.containerId || (cfg.team === 'A' ? 'boardA' : (cfg.team === 'B' ? 'boardB' : null));
  const board = containerId ? document.getElementById(containerId) : null;
  const statusEl = document.getElementById('status');
  const puzzleSection = document.querySelector('.level-puzzle');
  const wordLevelSection = document.getElementById('wordLevel');
  const pipeLevelSection = document.getElementById('pipeLevel');
  const wordSearchSection = document.getElementById('wordSearchLevel');
  const connectLevelSection = document.getElementById('connectLevel');
  const puzzleTimerEl = document.querySelector('.timer');
  const wordTimerEl = document.querySelector('.word-timer') || document.querySelector('.wordsearch-timer');
  const pipeTimerEl = document.querySelector('.pipe-timer');
  const wordsearchTimerEl = document.querySelector('.wordsearch-timer');
  const connectTimerEl = document.querySelector('.connect-timer');
  const puzzleScoreEl = document.querySelector('.score');
  const wordScoreEl = document.querySelector('.word-score');
  const pipeScoreEl = document.querySelector('.pipe-score');
  const connectScoreEl = document.querySelector('.connect-score');
  const puzzleCompletionEl = document.querySelector('.completion');
  const wordCompletionEl = document.querySelector('.word-completion');
  const pipeCompletionEl = document.querySelector('.pipe-completion');
  const connectCompletionEl = document.querySelector('.connect-completion');
  const pipeSection = document.getElementById('pipeChallenge');
  const pipeGridEl = document.getElementById('pipeGrid');
  const pipeStatusEl = document.getElementById('pipeStatus');
  const connectSection = document.getElementById('connectChallenge');
  const connectCanvasEl = document.getElementById('connectCanvas');
  const connectStatusEl = document.getElementById('connectStatus');
  const holdShowBtn = document.getElementById('holdShowBtn');
  const teamANameEl = document.getElementById('teamAName');
  const teamBNameEl = document.getElementById('teamBName');
  const teamANameInput = document.getElementById('teamANameInput');
  const teamBNameInput = document.getElementById('teamBNameInput');
  const setTeamANameBtn = document.getElementById('setTeamANameBtn');
  const setTeamBNameBtn = document.getElementById('setTeamBNameBtn');
  const totalALabelEl = document.getElementById('totalALabel');
  const totalBLabelEl = document.getElementById('totalBLabel');
  const playerTeamNameEls = Array.from(document.querySelectorAll('[data-team-name]'));
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomResetBtn = document.getElementById('zoomResetBtn');
  const zoomValueEl = document.getElementById('zoomValue');
  const promoVideoPlayerEl = document.getElementById('promoVideoPreview');
  const promoVideoAdminPreviewEl = document.getElementById('promoVideoAdminPreview');
  const promoVideoStatusEl = document.getElementById('promoVideoStatus');
  const promoImageAdminPreviewEl = document.getElementById('promoImageAdminPreview');
  const promoImageStatusEl = document.getElementById('promoImageStatus');
  const promoWidthValueEl = document.getElementById('promoWidthValue');
  const promoHeightValueEl = document.getElementById('promoHeightValue');
  const boardHeightValueEl = document.getElementById('boardHeightValue');
  const isPlayerPromoOnlyView = Boolean(promoVideoPlayerEl) && !promoVideoAdminPreviewEl;
  const DEFAULT_PROMO_IMAGE_PREVIEW_SRC = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#1e293b"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/><rect x="24" y="24" width="1152" height="582" rx="26" fill="none" stroke="#64748b" stroke-opacity="0.6" stroke-width="4" stroke-dasharray="14 12"/><g fill="#cbd5e1" fill-opacity="0.95"><circle cx="535" cy="280" r="28"/><path d="M610 252l50 56-44 49h-167l78-87 31 35z"/></g><text x="600" y="430" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="700" fill="#e2e8f0">Promotion Image Preview</text><text x="600" y="476" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" fill="#94a3b8">Default image shown until you upload or set a URL</text></svg>')}`;

  const ZOOM_MIN = 0.7;
  const ZOOM_MAX = 1.5;
  const ZOOM_STEP = 0.1;
  const PROMO_WIDTH_MIN = 280;
  const PROMO_WIDTH_MAX = 680;
  const PROMO_HEIGHT_MIN = 320;
  const PROMO_HEIGHT_MAX = 760;
  const BOARD_HEIGHT_MIN = 470;
  const BOARD_HEIGHT_MAX = 980;
  const zoomStorageKey = `gameBoardZoom:${cfg.team || 'global'}`;
  let boardZoom = 1;
  let promoVideoIsEmbed = false;

  function ensurePromoVideoEmbed(videoEl, id){
    if(!videoEl || !videoEl.parentNode) return null;
    let iframe = document.getElementById(id);
    if(iframe) return iframe;
    iframe = document.createElement('iframe');
    iframe.id = id;
    iframe.title = 'Promotion embedded video';
    iframe.loading = 'lazy';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.className = videoEl.className || '';
    iframe.style.display = 'none';
    videoEl.insertAdjacentElement('afterend', iframe);
    return iframe;
  }

  const promoVideoPlayerEmbedEl = ensurePromoVideoEmbed(promoVideoPlayerEl, 'promoVideoPreviewEmbed');
  const promoVideoAdminEmbedEl = ensurePromoVideoEmbed(promoVideoAdminPreviewEl, 'promoVideoAdminPreviewEmbed');

  function toYouTubeEmbedUrl(rawUrl){
    if(!rawUrl || typeof rawUrl !== 'string') return '';
    let u = null;
    try{ u = new URL(rawUrl, window.location.href); }catch(e){ return ''; }
    const host = (u.hostname || '').toLowerCase();
    let vid = '';
    if(host === 'youtu.be'){
      vid = (u.pathname || '').replace(/^\//,'').split('/')[0] || '';
    }else if(host.includes('youtube.com')){
      if((u.pathname || '').startsWith('/watch')) vid = u.searchParams.get('v') || '';
      else if((u.pathname || '').startsWith('/embed/')) vid = (u.pathname.split('/')[2] || '').trim();
      else if((u.pathname || '').startsWith('/shorts/')) vid = (u.pathname.split('/')[2] || '').trim();
    }
    vid = String(vid || '').trim();
    if(!vid) return '';
    const params = new URLSearchParams({ autoplay: '1', mute: '1', rel: '0', modestbranding: '1', playsinline: '1', enablejsapi: '1', origin: window.location.origin });
    return `https://www.youtube.com/embed/${encodeURIComponent(vid)}?${params.toString()}`;
  }

  function sendYouTubeCommand(iframeEl, func, args = []){
    if(!iframeEl || !iframeEl.contentWindow) return;
    try{
      const safeArgs = Array.isArray(args) ? args : [args];
      iframeEl.contentWindow.postMessage(JSON.stringify({ event:'command', func, args: safeArgs }), '*');
    }catch(e){}
  }

  function clampPromoWidth(v){
    const n = Number(v);
    if(!Number.isFinite(n)) return 380;
    return Math.max(PROMO_WIDTH_MIN, Math.min(PROMO_WIDTH_MAX, Math.round(n)));
  }

  function applyDashboardPromoWidth(v){
    const next = clampPromoWidth(v);
    document.documentElement.style.setProperty('--promo-col-width', `${next}px`);
    if(promoWidthValueEl) promoWidthValueEl.textContent = `${next}px`;
  }

  function clampPromoHeight(v){
    const n = Number(v);
    if(!Number.isFinite(n)) return 430;
    return Math.max(PROMO_HEIGHT_MIN, Math.min(PROMO_HEIGHT_MAX, Math.round(n)));
  }

  function applyDashboardPromoHeight(v){
    const next = clampPromoHeight(v);
    document.documentElement.style.setProperty('--promo-area-min-height', `${next}px`);
    if(promoHeightValueEl) promoHeightValueEl.textContent = `${next}px`;
  }

  function clampBoardHeight(v){
    const n = Number(v);
    if(!Number.isFinite(n)) return 620;
    return Math.max(BOARD_HEIGHT_MIN, Math.min(BOARD_HEIGHT_MAX, Math.round(n)));
  }

  function applyDashboardBoardHeight(v){
    const next = clampBoardHeight(v);
    document.documentElement.style.setProperty('--board-panel-min-height', `${next}px`);
    if(boardHeightValueEl) boardHeightValueEl.textContent = `${next}px`;
  }

  applyDashboardPromoWidth(380);
  applyDashboardPromoHeight(430);
  applyDashboardBoardHeight(620);

  function clampBoardZoom(v){
    const n = Number(v);
    if(!Number.isFinite(n)) return 1;
    return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, n));
  }

  function applyBoardZoom(nextZoom, persist = true){
    const clamped = clampBoardZoom(nextZoom);
    boardZoom = clamped;
    document.documentElement.style.setProperty('--board-zoom', clamped.toFixed(2));
    if(zoomValueEl) zoomValueEl.textContent = `${Math.round(clamped * 100)}%`;
    if(zoomOutBtn) zoomOutBtn.disabled = clamped <= ZOOM_MIN;
    if(zoomInBtn) zoomInBtn.disabled = clamped >= ZOOM_MAX;
    if(zoomResetBtn) zoomResetBtn.disabled = Math.abs(clamped - 1) < 0.01;
    if(persist){
      try{ localStorage.setItem(zoomStorageKey, String(clamped)); }catch(e){}
    }
  }

  (function initBoardZoom(){
    let initialZoom = 1;
    try{
      const raw = localStorage.getItem(zoomStorageKey);
      if(raw != null) initialZoom = clampBoardZoom(parseFloat(raw));
    }catch(e){}
    applyBoardZoom(initialZoom, false);
    if(zoomOutBtn) zoomOutBtn.addEventListener('click', ()=> applyBoardZoom(boardZoom - ZOOM_STEP));
    if(zoomInBtn) zoomInBtn.addEventListener('click', ()=> applyBoardZoom(boardZoom + ZOOM_STEP));
    if(zoomResetBtn) zoomResetBtn.addEventListener('click', ()=> applyBoardZoom(1));
  })();

  function setTeamNameUI(team, name){
    const rawTeam = String(team || '').trim();
    let teamKey = rawTeam;
    if(/^A$/i.test(rawTeam) || /^team\s*A$/i.test(rawTeam) || /^teamA$/i.test(rawTeam)) teamKey = 'A';
    if(/^B$/i.test(rawTeam) || /^team\s*B$/i.test(rawTeam) || /^teamB$/i.test(rawTeam)) teamKey = 'B';
    const safeName = (name || '').trim();
    if(!safeName) return;
    if(teamKey === 'A'){
      if(teamANameEl) teamANameEl.textContent = safeName;
      if(totalALabelEl) totalALabelEl.textContent = safeName;
      try{ localStorage.setItem('teamAName', safeName); }catch(e){}
    } else if(teamKey === 'B'){
      if(teamBNameEl) teamBNameEl.textContent = safeName;
      if(totalBLabelEl) totalBLabelEl.textContent = safeName;
      try{ localStorage.setItem('teamBName', safeName); }catch(e){}
    }
    if(cfg.team === teamKey){
      playerTeamNameEls.forEach(el=>{ el.textContent = safeName; });
    }
  }

  (function preloadTeamNameFromStorage(){
    try{
      if(cfg.team === 'A'){
        const name = localStorage.getItem('teamAName');
        if(name) playerTeamNameEls.forEach(el=>{ el.textContent = name; });
      } else if(cfg.team === 'B'){
        const name = localStorage.getItem('teamBName');
        if(name) playerTeamNameEls.forEach(el=>{ el.textContent = name; });
      } else {
        const aName = localStorage.getItem('teamAName');
        const bName = localStorage.getItem('teamBName');
        if(aName){
          if(teamANameEl) teamANameEl.textContent = aName;
          if(totalALabelEl) totalALabelEl.textContent = aName;
        }
        if(bName){
          if(teamBNameEl) teamBNameEl.textContent = bName;
          if(totalBLabelEl) totalBLabelEl.textContent = bName;
        }
      }
    }catch(e){}
  })();

  let timeLimit = cfg.timeLimit || 120;
  let remaining = timeLimit;
  let interval = null;
  let started = false;
  let finished = false;
  let roundLocked = false;
  let pubWs = null;
  let scoreRecorded = false;
  let levelMode = 'puzzle'; // 'puzzle' | 'memory' | 'word' | 'pipe' | 'wordsearch' | 'connect'
    // Level 5 (Word Search) logic

  let memoryState = null;
  let wordState = null;
  let pipeState = null;
  let connectState = null;
  let promoVideoUrl = null;
  let promoImageUrl = null;
  let wsRecoveryScheduled = false;
  let lastAuthoritativeLevelSig = '';
  let winnerFromServer = false;
  let startCountdownInterval = null;
  let startCountdownOverlayEl = null;
  let countdownMaskedLetter = null;
  let countdownAudioCtx = null;
  let countdownLastAnnounced = null;
  let heartbeatInterval = null;

  function getCountdownAudioContext(){
    if(countdownAudioCtx) return countdownAudioCtx;
    try{
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if(!Ctx) return null;
      countdownAudioCtx = new Ctx();
      return countdownAudioCtx;
    }catch(e){
      return null;
    }
  }

  function primeCountdownAudio(){
    const ctx = getCountdownAudioContext();
    if(!ctx) return;
    if(ctx.state === 'suspended'){
      try{ ctx.resume(); }catch(e){}
    }
  }

  function playCountdownBeep(secondLeft){
    const ctx = getCountdownAudioContext();
    if(!ctx) return;
    if(ctx.state === 'suspended'){
      try{ ctx.resume(); }catch(e){ return; }
    }
    if(ctx.state !== 'running') return;

    const isFinal = Number(secondLeft) <= 1;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isFinal ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isFinal ? 1320 : 980, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(isFinal ? 0.075 : 0.05, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (isFinal ? 0.24 : 0.14));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (isFinal ? 0.26 : 0.16));
  }

  function stopHeartbeatSound(){
    if(heartbeatInterval){
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  }

  function playHeartbeatSound(){
    const ctx = getCountdownAudioContext();
    if(!ctx) return;
    if(ctx.state === 'suspended'){
      try{ ctx.resume(); }catch(e){ return; }
    }
    if(ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const noiseBuffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * 0.03)), ctx.sampleRate);
    const channel = noiseBuffer.getChannelData(0);
    for(let i=0;i<channel.length;i++) channel[i] = (Math.random() * 2 - 1) * 0.7;

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2100, now);
    filter.Q.setValueAtTime(8, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.055);
  }

  function updateHeartbeatForTone(tone){
    const shouldPlay = tone === 'danger' && started && !finished;
    if(!shouldPlay){
      stopHeartbeatSound();
      return;
    }
    if(heartbeatInterval) return;
    playHeartbeatSound();
    heartbeatInterval = setInterval(playHeartbeatSound, 1000);
  }

  window.addEventListener('pointerdown', primeCountdownAudio, { passive: true });
  window.addEventListener('keydown', primeCountdownAudio);

  function setWordLetterVisible(isVisible){
    if(levelMode !== 'word') return;
    const actualLetter = (wordState && wordState.letter)
      ? String(wordState.letter || '').toUpperCase()
      : (countdownMaskedLetter || '—');
    const displayLetter = isVisible ? (actualLetter || '—') : '—';
    if(wordLetterEl) wordLetterEl.textContent = displayLetter;
    try{ const cl = document.getElementById('currentLetter'); if(cl) cl.textContent = displayLetter; }catch(e){}

    if(wordSection){
      const inputs = wordSection.querySelectorAll('input.word-input');
      inputs.forEach(input=>{ input.placeholder = `Starts with ${displayLetter}`; });
    }
  }

  function setCountdownVisualMask(isMasked){
    if(levelMode === 'puzzle' && board){
      // Do NOT hide the board during countdown; just disable moves
      if(isMasked){
        // Optionally, you could add a visual overlay here if desired
        disableMoves();
      }else{
        enableMoves();
      }
    }

    if(levelMode === 'word'){
      if(isMasked){
        countdownMaskedLetter = (wordLetterEl && wordLetterEl.textContent) ? String(wordLetterEl.textContent) : null;
        setWordLetterVisible(false);
      }else{
        setWordLetterVisible(true);
        countdownMaskedLetter = null;
      }
    }

    if(levelMode === 'connect'){
      if(isMasked) disableConnectInputs();
      else if(!isSpectator && !finished) enableConnectInputs();
    }
  }

  function clearStartCountdownInterval(){
    if(startCountdownInterval){
      clearInterval(startCountdownInterval);
      startCountdownInterval = null;
    }
  }

  function ensureStartCountdownOverlay(){
    if(startCountdownOverlayEl) return startCountdownOverlayEl;
    const overlay = document.createElement('div');
    overlay.className = 'start-countdown-overlay';
    overlay.setAttribute('aria-live', 'polite');
    overlay.innerHTML = '<div class="start-countdown-box"><div class="start-countdown-label">Starting in</div><div class="start-countdown-value" id="startCountdownValue">5</div><button id="enableCountdownSoundBtn" class="countdown-sound-btn" type="button">Enable sound</button><div id="countdownSoundHelp" class="countdown-sound-help">Tap to enable countdown sound on this device</div></div>';
    const enableBtn = overlay.querySelector('#enableCountdownSoundBtn');
    if(enableBtn){
      enableBtn.addEventListener('click', ()=>{
        primeCountdownAudio();
        const current = Number(countdownLastAnnounced) || 1;
        playCountdownBeep(current);
        const ctx = getCountdownAudioContext();
        const unlocked = ctx && ctx.state === 'running';
        enableBtn.style.display = unlocked ? 'none' : '';
        const helpEl = overlay.querySelector('#countdownSoundHelp');
        if(helpEl) helpEl.style.display = unlocked ? 'none' : '';
      });
    }
    document.body.appendChild(overlay);
    startCountdownOverlayEl = overlay;
    return overlay;
  }

  function setCountdownLock(isLocked){
    if(isLocked){
      setCountdownVisualMask(true);
      disableMoves();
      disableWordInputs();
      if(levelMode === 'memory' && board){
        const cards = board.querySelectorAll('.card');
        cards.forEach(c=>{ c.disabled = true; });
      }
      return;
    }
    setCountdownVisualMask(false);
    if(levelMode === 'word'){
      if(!isSpectator) enableWordInputs();
      return;
    }
    if(levelMode === 'memory' && board){
      const cards = board.querySelectorAll('.card');
      cards.forEach(c=>{ c.disabled = false; });
      return;
    }
    if(!isSpectator) enableMoves();
  }

  function hideStartCountdown(){
    clearStartCountdownInterval();
    if(startCountdownOverlayEl) startCountdownOverlayEl.classList.remove('active');
    countdownLastAnnounced = null;
    setCountdownLock(false);
  }

  function showStartCountdown(seconds, endsAt){
    const overlay = ensureStartCountdownOverlay();
    const valueEl = overlay.querySelector('#startCountdownValue');
    const enableBtn = overlay.querySelector('#enableCountdownSoundBtn');
    const helpEl = overlay.querySelector('#countdownSoundHelp');
    clearStartCountdownInterval();
    countdownLastAnnounced = null;
    overlay.classList.add('active');
    setCountdownLock(true);

    const ctx = getCountdownAudioContext();
    const needsUnlock = !ctx || ctx.state !== 'running';
    if(enableBtn) enableBtn.style.display = needsUnlock ? '' : 'none';
    if(helpEl) helpEl.style.display = needsUnlock ? '' : 'none';

    const fallbackEndsAt = Date.now() + (Math.max(1, Number(seconds) || 5) * 1000);
    const target = Number(endsAt) || fallbackEndsAt;
    const render = ()=>{
      const left = Math.max(0, Math.ceil((target - Date.now()) / 1000));
      const display = Math.max(1, left);
      if(valueEl) valueEl.textContent = String(display);
      if(display !== countdownLastAnnounced){
        countdownLastAnnounced = display;
        playCountdownBeep(display);
      }
      if(left <= 0) clearStartCountdownInterval();
    };
    render();
    startCountdownInterval = setInterval(render, 100);
  }

  function scheduleWsRecovery(reason){
    if(wsRecoveryScheduled) return;
    wsRecoveryScheduled = true;
    try{ if(statusEl) statusEl.textContent = reason || 'Connection lost. Reconnecting...'; }catch(e){}
    setTimeout(()=>{
      try{ window.location.reload(); }catch(e){}
    }, 1500);
  }

  function readFileAsDataUrl(file){
    return new Promise((resolve, reject)=>{
      const reader = new FileReader();
      reader.onload = (ev)=> resolve(ev.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function loadImageFromDataUrl(dataUrl){
    return new Promise((resolve, reject)=>{
      const img = new Image();
      img.onload = ()=> resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  async function fileToCompressedDataUrl(file, maxSide = 1920, quality = 0.92){
    const srcDataUrl = await readFileAsDataUrl(file);
    const img = await loadImageFromDataUrl(srcDataUrl);
    const w = img.width || 0;
    const h = img.height || 0;
    if(!w || !h) return srcDataUrl;
    const scale = Math.min(1, maxSide / Math.max(w, h));
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement('canvas');
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext('2d');
    if(!ctx) return srcDataUrl;
    ctx.drawImage(img, 0, 0, tw, th);
    const MAX_BYTES = 3 * 1024 * 1024;
    let q = quality;
    let out = canvas.toDataURL('image/jpeg', q);
    while(out.length > MAX_BYTES * 1.37 && q > 0.7){
      q = Math.max(0.7, q - 0.05);
      out = canvas.toDataURL('image/jpeg', q);
    }
    return out;
  }

  function normalizeSharedImageUrl(url){
    if(!url || typeof url !== 'string') return url;
    if(url.startsWith('data:')) return url;
    try{
      const u = new URL(url, window.location.href);
      if(u.hostname === 'localhost' || u.hostname === '127.0.0.1'){
        u.hostname = window.location.hostname;
        return u.toString();
      }
      return u.toString();
    }catch(e){
      return url;
    }
  }

  function getUploadEndpoint(pathname = '/upload'){
    const wsSource = cfg.adminWs || cfg.ws;
    if(wsSource){
      try{
        const u = new URL(wsSource, window.location.href);
        u.protocol = u.protocol === 'wss:' ? 'https:' : 'http:';
        u.pathname = pathname;
        u.search = '';
        u.hash = '';
        return u.toString();
      }catch(e){}
    }
    const proto = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const host = window.location.hostname || 'localhost';
    return `${proto}://${host}:8000${pathname}`;
  }

  async function uploadBinaryFile(file, pathname = '/upload'){
    const endpoint = getUploadEndpoint(pathname);
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'X-Upload-File-Name': encodeURIComponent(file && file.name ? file.name : ''),
      },
      body: file,
    });
    let data = null;
    try{ data = await resp.json(); }catch(e){}
    if(!resp.ok || !data || !data.url){
      const errMsg = data && data.error ? data.error : `Upload failed (${resp.status})`;
      throw new Error(errMsg);
    }
    return normalizeSharedImageUrl(data.url);
  }

  async function uploadImageFile(file){
    return uploadBinaryFile(file, '/upload');
  }

  async function importImageFromUrl(sourceUrl){
    const endpoint = getUploadEndpoint('/upload-image-url');
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: sourceUrl }),
    });
    let data = null;
    try{ data = await resp.json(); }catch(e){}
    if(!resp.ok || !data || !data.url){
      const errMsg = data && data.error ? data.error : `Image URL import failed (${resp.status})`;
      throw new Error(errMsg);
    }
    return normalizeSharedImageUrl(data.url);
  }

  async function uploadPromoVideoFile(file){
    return uploadBinaryFile(file, '/upload-video');
  }
  let solvedPreviewActive = false;
  let solvedPreviewSnapshot = null;

  const WORD_CATEGORIES = [
    'Country name',
    'Food name',
    'Drink name',
    'Animal name'
  ];

  // Updated list to include 1000 foods and 1000 drinks for the game
  const data = {
    countries: {
        A: ["Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan"],
        B: ["Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi"],
        C: ["Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic"],
        D: ["Denmark", "Djibouti", "Dominica", "Dominican Republic"],
        E: ["Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia"],
        F: ["Fiji", "Finland", "France"],
        G: ["Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana"],
        H: ["Haiti", "Honduras", "Hungary"],
        I: ["Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy"],
        J: ["Jamaica", "Japan", "Jordan"],
        K: ["Kazakhstan", "Kenya", "Kiribati", "Korea (North)", "Korea (South)", "Kosovo", "Kuwait", "Kyrgyzstan"],
        L: ["Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg"],
        M: ["Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar"],
        N: ["Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway"],
        O: ["Oman"],
        P: ["Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal"],
        Q: ["Qatar"],
        R: ["Romania", "Russia", "Rwanda"],
        S: ["Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria"],
        T: ["Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu"],
        U: ["Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan"],
        V: ["Vanuatu", "Vatican City", "Venezuela", "Vietnam"],
        W: ["Yemen"],
        Z: ["Zambia", "Zimbabwe"]
    },
    foods: {
        A: ["Apple", "Avocado", "Artichoke", "Asparagus", "Almond", "Apricot", "Acorn Squash", "Amaranth", "Anchovy", "Arugula"],
        B: ["Banana", "Blueberry", "Broccoli", "Brussels Sprouts", "Bread", "Bagel", "Bacon", "Basil", "Blackberry", "Beet"],
        C: ["Carrot", "Cucumber", "Cabbage", "Cauliflower", "Celery", "Chili", "Cheese", "Chicken", "Chickpea", "Cilantro"],
        D: ["Dumpling", "Date", "Duck", "Dill", "Donut", "Dragonfruit", "Durian", "Dandelion Greens", "Danish", "Dosa"],
        E: ["Egg", "Eggplant", "Edamame", "Endive", "Escarole", "Eel", "Elderberry", "Emmental", "English Muffin", "Espresso"],
        F: ["Fish", "Fig", "Fennel", "Feta", "Falafel", "Focaccia", "French Fries", "Fudge", "Flan", "Frosting"],
        G: ["Grapes", "Garlic", "Ginger", "Gooseberry", "Gouda", "Granola", "Gnocchi", "Graham Cracker", "Guacamole", "Gumbo"],
        H: ["Hamburger", "Honey", "Hazelnut", "Hummus", "Haddock", "Halibut", "Hoisin Sauce", "Hot Dog", "Havarti", "Hash Browns"],
        I: ["Ice Cream", "Indian Curry", "Italian Sausage", "Iceberg Lettuce", "Idli", "Irish Soda Bread", "Iced Tea", "Instant Noodles", "Icing", "Italian Dressing"],
        J: ["Jam", "Jelly", "Jalapeno", "Jackfruit", "Jicama", "Jerky", "Juice", "Jellybean", "Jasmine Rice", "Jambalaya"],
        K: ["Kebab", "Kiwi", "Kale", "Ketchup", "Kimchi", "Kohlrabi", "Kombucha", "Kasha", "Kippers", "Kheer"],
        L: ["Lettuce", "Lemon", "Lime", "Lentil", "Lobster", "Lychee", "Lasagna", "Lollipop", "Linguine", "Liver"],
        M: ["Mango", "Mushroom", "Milk", "Muffin", "Macaroni", "Meatball", "Miso", "Mozzarella", "Meringue", "Melon"],
        N: ["Noodles", "Nutmeg", "Nectarine", "Naan", "Nachos", "Natto", "Nougat", "Nuggets", "Nicoise Salad", "Nori"],
        O: ["Orange", "Olive", "Onion", "Oregano", "Oatmeal", "Octopus", "Okra", "Omelette", "Orzo", "Oysters"],
        P: ["Pizza", "Pasta", "Peach", "Pear", "Pineapple", "Papaya", "Peanut", "Pepper", "Potato", "Pumpkin"],
        Q: ["Quiche", "Quinoa", "Quail", "Quesadilla", "Quince", "Quark", "Quahog", "Quenelle", "Quavers", "Quetsch"],
        R: ["Rice", "Raspberry", "Radish", "Raisin", "Rhubarb", "Ricotta", "Ravioli", "Ratatouille", "Ramen", "Roulade"],
        S: ["Salad", "Spinach", "Strawberry", "Sushi", "Sausage", "Soup", "Scone", "Salsa", "Saffron", "Schnitzel"],
        T: ["Taco", "Tomato", "Turkey", "Tofu", "Tangerine", "Tuna", "Turnip", "Tortilla", "Tiramisu", "Tapioca"],
        U: ["Udon", "Ugli Fruit", "Upside-Down Cake", "Urfa Pepper", "Ube", "Umami Paste", "Urad Dal", "Ukrainian Borscht", "Unagi", "Umeboshi"],
        V: ["Vanilla", "Vegetable", "Venison", "Vermicelli", "Vinegar", "Vichyssoise", "Victoria Sponge", "Vada", "Velveeta", "Vermouth"],
        W: ["Waffle", "Walnut", "Watermelon", "Wasabi", "Wheat", "Whipped Cream", "White Chocolate", "Wiener", "Wonton", "Worcestershire Sauce"],
        X: ["Xacuti", "Xigua", "Xylitol", "Xnipec", "Xouba", "Xingren", "Xocolatl", "Xiaolongbao", "Xerem", "Xerophyte"],
        Y: ["Yogurt", "Yam", "Yeast", "Yellowtail", "Yuzu", "Yabby", "Yakhni", "Yassa", "Yokan", "Yorkshire Pudding"],
        Z: ["Zucchini", "Ziti", "Zest", "Zander", "Zabaglione", "Zopf", "Zhoug", "Ziti Pasta", "Zinfandel", "Zebra Cake"]
    },
    drinks: {
        A: ["Apple Juice", "Apricot Nectar", "Aloe Vera Drink", "Amaretto", "Arnold Palmer", "Absinthe", "Aperol", "Apple Cider", "Aguardiente", "Akvavit"],
        B: ["Beer", "Black Tea", "Bubble Tea", "Buttermilk", "Bloody Mary", "Bourbon", "Brandy", "Baileys", "Bacardi", "Boba"],
        C: ["Coffee", "Coca-Cola", "Coconut Water", "Cranberry Juice", "Champagne", "Chai", "Cider", "Campari", "Cognac", "Cucumber Water"],
        D: ["Daiquiri", "Diet Coke", "Dr. Pepper", "Dry Martini", "Dubonnet", "Dandelion Tea", "Dark Beer", "Detox Water", "Dragonfruit Juice", "Dewberry Cordial"],
        E: ["Espresso", "Elderflower Cordial", "Eggnog", "Energy Drink", "Earl Grey Tea", "Ethanol", "Eiskaffee", "Elderberry Wine", "Evian", "Ethiopian Coffee"],
        F: ["Fanta", "Fruit Punch", "Fennel Tea", "Flat White", "Frappuccino", "Fernet", "Fizzy Water", "Frozen Margarita", "Frosty", "Frappe"],
        G: ["Ginger Ale", "Green Tea", "Grape Juice", "Gin", "Gimlet", "Grenadine", "Ginger Beer", "Grog", "Guava Juice", "Ginseng Tea"],
        H: ["Hot Chocolate", "Herbal Tea", "Horchata", "Hibiscus Tea", "Honey Mead", "Hefeweizen", "Hot Toddy", "Hurricane", "Hibiscus Water", "Hoppy Beer"],
        I: ["Iced Tea", "Irish Coffee", "Ice Water", "Indian Chai", "Iced Latte", "Italian Soda", "Ice Wine", "Iced Mocha", "Iced Cappuccino", "Iceberg"],
        J: ["Juice", "Jasmine Tea", "Julep", "Jagermeister", "Jamaica Water", "Jack Daniels", "Jalapeno Margarita", "Jasmine Milk Tea", "Jungle Juice", "Jolt Cola"],
        K: ["Kombucha", "Kahlua", "Kefir", "Kiwi Juice", "Kool-Aid", "Kava", "Kopi Luwak", "Kumquat Juice", "Kirin Beer", "Krupnik"],
        L: ["Lemonade", "Lime Juice", "Lassi", "Latte", "Long Island Iced Tea", "Lager", "Lychee Juice", "Lillet", "Lemon Water", "Limoncello"],
        M: ["Milk", "Mojito", "Matcha", "Margarita", "Mulled Wine", "Mimosa", "Milkshake", "Malibu", "Martini", "Mead"],
        N: ["Nectar", "Negroni", "Nut Milk", "Nettle Tea", "Nimbu Pani", "Nesquik", "Naked Juice", "Naranjilla Juice", "Nocino", "Nettle Beer"],
        O: ["Orange Juice", "Oolong Tea", "Ouzo", "Old Fashioned", "Oat Milk", "Orangina", "Ovaltine", "Oyster Shooter", "Ouzo Lemonade", "Oregon Chai"],
        P: ["Punch", "Pina Colada", "Peach Tea", "Peppermint Tea", "Port", "Prosecco", "Perrier", "Pomegranate Juice", "Pale Ale", "Pisco Sour"],
        Q: ["Quinine Water", "Quince Juice", "Qishr", "Quark Smoothie", "Quetsch", "Quince Wine", "Quark", "Quahog", "Quenelle", "Quavers"],
        R: ["Rum", "Raspberry Tea", "Root Beer", "Red Wine", "Rooibos Tea", "Raspberry Lemonade", "Raki", "Raspberry Smoothie", "Rhubarb Cordial", "Raspberry Vodka"],
        S: ["Soda", "Sangria", "Smoothie", "Scotch", "Seltzer", "Shirley Temple", "Sake", "Sambuca", "Sarsaparilla", "Sauvignon Blanc"],
        T: ["Tea", "Tonic Water", "Tomato Juice", "Tequila", "Turmeric Latte", "Thai Iced Tea", "Tamarind Juice", "Tisane", "Tangerine Juice", "Triple Sec"],
        U: ["Umeshu", "Ube Milkshake", "Uva Tea", "Ukrainian Vodka", "Uji Matcha", "Umeshu Soda", "Ube Latte", "Uva Juice", "Umeshu Cocktail", "Ube Smoothie"],
        V: ["Vodka", "Vanilla Milkshake", "Vermouth", "Vitamin Water", "V8 Juice", "Valpolicella", "Vanilla Latte", "Vinho Verde", "Violet Liqueur", "Vegan Smoothie"],
        W: ["Water", "Whiskey", "White Wine", "Wheatgrass Juice", "Warm Milk", "Winter Ale", "Wassail", "White Russian", "Whey Protein Shake", "Wild Berry Tea"],
        X: ["Xingren Almond Drink", "Xocolatl", "Xiaoshu Tea", "Xanadu Wine", "Xylitol Water", "Xingren Smoothie", "Xouba Juice", "Xerem Drink", "Xerophyte Tea", "Xigua Juice"],
        Y: ["Yakult", "Yerba Mate", "Yellow Tea", "Yogurt Drink", "Yunnan Coffee", "Yuzu Soda", "Yam Wine", "Yogurt Smoothie", "Yunnan Tea", "Yuzu Cocktail"],
        Z: ["Zinfandel", "Zobo Drink", "Zucchini Juice", "Zebra Milk", "Zinger Tea", "Zubrowka", "Zobo Punch", "Zinfandel Rose", "Zebra Smoothie", "Zesty Lemonade"]
    },
    animals: {
        A: ["Antelope", "Aardvark", "Albatross", "Alligator", "Anaconda", "Armadillo", "Axolotl", "Aye-Aye", "African Elephant", "Arctic Fox"],
        B: ["Bear", "Bison", "Baboon", "Bat", "Beaver", "Blue Whale", "Butterfly", "Buzzard", "Bald Eagle", "Barracuda"],
        C: ["Cat", "Cheetah", "Cobra", "Camel", "Capybara", "Chameleon", "Coyote", "Crab", "Crow", "Caterpillar"],
        D: ["Dog", "Dolphin", "Duck", "Deer", "Dragonfly", "Dodo", "Donkey", "Dugong", "Dhole", "Dachshund"],
        E: ["Elephant", "Eagle", "Eel", "Emu", "Egret", "Ermine", "Earthworm", "Eastern Bluebird", "Echidna", "Elk"],
        F: ["Fox", "Frog", "Falcon", "Flamingo", "Firefly", "Ferret", "Fiddler Crab", "Flying Squirrel", "Fossa", "Frigatebird"],
        G: ["Giraffe", "Goat", "Gorilla", "Gecko", "Goldfish", "Grasshopper", "Gannet", "Gazelle", "Gibbon", "Gila Monster"],
        H: ["Horse", "Hawk", "Hedgehog", "Heron", "Hippopotamus", "Honeybee", "Hornbill", "Hummingbird", "Hyena", "Harpy Eagle"],
        I: ["Iguana", "Indian Star Tortoise", "Indian Cobra", "Indian Elephant", "Indian Pangolin", "Indian Starling", "Indian Mongoose", "Indian Peafowl", "Indian Python", "Indian Starfish"],
        J: ["Jaguar", "Jellyfish", "Jackal", "Jackrabbit", "Japanese Macaque", "Javan Rhino", "Jungle Cat", "Junco", "Jerboa", "Jacana"],
        K: ["Kangaroo", "Koala", "Kookaburra", "Kudu", "Kiwi", "Kingfisher", "Kite", "Killer Whale", "Komodo Dragon", "Krill"],
        L: ["Lion", "Lemur", "Leopard", "Lynx", "Llama", "Lobster", "Ladybug", "Lamprey", "Leafcutter Ant", "Lungfish"],
        M: ["Monkey", "Moose", "Mongoose", "Manta Ray", "Manatee", "Mole", "Moth", "Macaw", "Magpie", "Mandrill"],
        N: ["Narwhal", "Newt", "Nightingale", "Numbat", "Nautilus", "Nile Crocodile", "Northern Cardinal", "Northern Pike", "Nudibranch", "Nutria"],
        O: ["Owl", "Octopus", "Otter", "Ocelot", "Orangutan", "Ostrich", "Ox", "Osprey", "Orca", "Okapi"],
        P: ["Penguin", "Panda", "Parrot", "Peacock", "Pelican", "Porcupine", "Puma", "Platypus", "Puffin", "Python"],
        Q: ["Quail", "Quokka", "Quetzal", "Queen Bee", "Quagga", "Quoll", "Quahog", "Quetzalcoatlus", "Quokka Wallaby", "Queen Triggerfish"],
        R: ["Rabbit", "Raccoon", "Rat", "Raven", "Red Panda", "Reindeer", "Rhinoceros", "Robin", "Rockhopper Penguin", "Rottweiler"],
        S: ["Snake", "Shark", "Sheep", "Sloth", "Snail", "Spider", "Swan", "Squirrel", "Starfish", "Seahorse"],
        T: ["Tiger", "Turtle", "Toucan", "Tarantula", "Tuna", "Turkey", "Termite", "Tortoise", "Tasmanian Devil", "Tapir"],
        U: ["Urial", "Umbrellabird", "Uakari", "Ugandan Kob", "Unicornfish", "Upland Sandpiper", "Urchin", "Ulysses Butterfly", "Umbrella Octopus", "Ural Owl"],
        V: ["Vulture", "Viper", "Vicuna", "Vervet Monkey", "Vinegaroon", "Velvet Worm", "Vampire Bat", "Vaquita", "Violet-backed Starling", "Vine Snake"],
        W: ["Wolf", "Whale", "Walrus", "Wombat", "Woodpecker", "Warthog", "Weasel", "Wildebeest", "Wolverine", "Wrasse"],
        X: ["Xerus", "Xantus's Hummingbird", "X-ray Tetra", "Xenopus", "Xenarthra", "Xenops", "Xenopus Frog", "Xenoturbella", "Xenopus Toad", "Xerus Squirrel"],
        Y: ["Yak", "Yellowjacket", "Yellowhammer", "Yellowfin Tuna", "Yellowtail Snapper", "Yellow Baboon", "Yellow Mongoose", "Yellow Warbler", "Yellow Tang", "Yellow Anaconda"],
        Z: ["Zebra", "Zebu", "Zorilla", "Zander", "Zebra Finch", "Zebra Shark", "Zebra Spider", "Zebra Swallowtail", "Zebra Mussel", "Zebra Dove"]
    }
};

// Function to compare player input with the list and assign points
function compareInput(category, letter, input) {
    const validInputs = data[category][letter];
    if (validInputs && validInputs.some(validInput => validInput.toLowerCase() === input.toLowerCase())) {
        return 1; // Assign 1 point for correct input
    }
    return 0; // No points for incorrect input
}

// Function to compare player inputs for animal, food, drink, and country
function evaluatePlayerInputs(playerInputs) {
    const { animal, food, drink, country } = playerInputs;
    let score = 0;

    // Compare animal
    if (compareInput('animals', animal[0].toUpperCase(), animal)) {
        score += 1;
    }

    // Compare food
    if (compareInput('foods', food[0].toUpperCase(), food)) {
        score += 1;
    }

    // Compare drink
    if (compareInput('drinks', drink[0].toUpperCase(), drink)) {
        score += 1;
    }

    // Compare country
    if (compareInput('countries', country[0].toUpperCase(), country)) {
        score += 1;
    }

    return score; // Return the total score
}

// Example usage:
// const points = compareInput('animals', 'A', 'Antelope');
// console.log(points); // Output: 1

  const wordSection = document.getElementById('wordChallenge');
  const wordLetterEl = document.getElementById('challengeLetter');
  const wordCategoriesEl = document.getElementById('wordCategories');
  const submitWordsBtn = document.getElementById('submitWordsBtn');
  const wordStatusEl = document.getElementById('wordStatus');
  const queryParams = new URLSearchParams(window.location.search || '');
  const isSpectator = queryParams.get('view') === '1' || cfg.spectator === true;
  if(isSpectator){
    try{ document.body.classList.add('spectator-view'); }catch(e){}
  }
  const touchCapable = (typeof window !== 'undefined') && (
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0) ||
    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
  );
  let lastSentPuzzleStateSig = '';
  let pendingPuzzleLayout = null;
  let pendingMemorySnapshot = null;
  let pendingWordSnapshot = null;
  let pendingPipeSnapshot = null;
  let pendingConnectSnapshot = null;
  let wordStateBroadcastTimer = null;

  function formatTime(sec){
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s/60).toString().padStart(2,'0');
    const ss = (s%60).toString().padStart(2,'0');
    return `${m}:${ss}`;
  }

  function getTimerTone(sec, limitSec){
    const limit = Math.max(1, Number(limitSec) || 1);
    const remainingSec = Math.max(0, Number(sec) || 0);
    if(remainingSec <= Math.floor(limit / 4)) return 'danger'; // 3/4 elapsed
    if(remainingSec <= Math.floor(limit / 2)) return 'warn';   // 1/2 elapsed
    return 'ok';
  }

  function applyTimerTone(el, tone){
    if(!el || !el.classList) return;
    el.classList.remove('timer-ok', 'timer-warn', 'timer-danger');
    el.classList.add(`timer-${tone}`);
  }

    function updateTimerDisplays(sec, limitSec){
      const safeSec = Math.max(0, Number(sec) || 0);
      const safeLimit = Math.max(1, Number(limitSec) || Number(timeLimit) || 120);
      const text = formatTime(safeSec);
      const tone = getTimerTone(safeSec, safeLimit);
      updateHeartbeatForTone(tone);
      if(puzzleTimerEl){
        puzzleTimerEl.textContent = text;
        applyTimerTone(puzzleTimerEl, tone);
      }
      if(wordTimerEl){
        wordTimerEl.textContent = text;
        applyTimerTone(wordTimerEl, tone);
      }
      if(wordsearchTimerEl){
        wordsearchTimerEl.textContent = text;
        applyTimerTone(wordsearchTimerEl, tone);
      }
      if(pipeTimerEl){
        pipeTimerEl.textContent = text;
        applyTimerTone(pipeTimerEl, tone);
      }
      if(connectTimerEl){
        connectTimerEl.textContent = text;
        applyTimerTone(connectTimerEl, tone);
      }
      try{
        const g = document.getElementById('globalTimer');
        if(g){
          g.textContent = text;
          applyTimerTone(g, tone);
        }
      }catch(e){}

      // --- Winner trigger logic for admin.html ---
      // Only declare winner if both teams have completed all 6 levels
      try {
        if(document.body && document.body.classList.contains('admin-page')) {
          if(completedLevels['A'] && completedLevels['B'] && completedLevels['A'].size === 6 && completedLevels['B'].size === 6) {
            const totalA = [1,2,3,4,5,6].reduce((sum, lvl) => sum + (Number(levelScores['A'][lvl]) || 0), 0);
            const totalB = [1,2,3,4,5,6].reduce((sum, lvl) => sum + (Number(levelScores['B'][lvl]) || 0), 0);
            const nameA = typeof getTeamDisplayName === 'function' ? getTeamDisplayName('A') : 'A';
            const nameB = typeof getTeamDisplayName === 'function' ? getTeamDisplayName('B') : 'B';
            let winnerText = '';
            if(totalA > totalB){
              winnerText = `🏆 A Wins! team ${nameA} 🏆`;
            } else if(totalB > totalA){
              winnerText = `🏆 B Wins! team ${nameB} 🏆`;
            } else {
              winnerText = `🤝 Draw — ${nameA}: ${totalA} | ${nameB}: ${totalB} 🤝`;
            }
            if(typeof setWinner === 'function') setWinner(winnerText);
          }
        }
      }catch(e){}
    }

  function makeBoard(container){
    container.innerHTML='';
    for(let i=0;i<TOTAL;i++){
      const slot = document.createElement('div');
      slot.className='slot';
      slot.dataset.index = i;
      slot.addEventListener('dragover',e=>e.preventDefault());
      slot.addEventListener('drop',onDrop);
      if(touchCapable) slot.addEventListener('click', onSlotTap);
      container.appendChild(slot);
    }
  }

  function createPieces(){
    const pieces = [];
    for(let i=0;i<TOTAL;i++){
      const piece = document.createElement('div');
      piece.className='piece';
      piece.draggable = true;
      piece.dataset.correct = i;
      const row = Math.floor(i/COLS);
      const col = i%COLS;
      const x = (col/(COLS-1))*100;
      const y = (row/(ROWS-1))*100;
        piece.style.backgroundImage = `url(${imageUrl})`;
        // set explicit background-size to match grid so each piece maps correctly
        piece.style.backgroundSize = `${COLS*100}% ${ROWS*100}%`;
        // precise background position for the slice
        piece.style.backgroundPosition = `${(x).toFixed(6)}% ${(y).toFixed(6)}%`;
      piece.addEventListener('dragstart',onDragStart);
      pieces.push(piece);
    }
    return pieces;
  }

  function shuffleArray(a){
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
  }

  function populateBoard(container){
    const pieces = createPieces();
    // shuffle until no piece is in its correct slot (derangement) to avoid initial partial scores
    let attempts = 0;
    do{
      shuffleArray(pieces);
      attempts++;
      if(attempts>2000) break;
    } while(pieces.some((p,idx)=> String(p.dataset.correct) === String(idx)));
    const slots = Array.from(container.children);
    for(let i=0;i<TOTAL;i++){
      slots[i].appendChild(pieces[i]);
    }
    // Always apply font scaling after rendering tiles
    applyPuzzleFontScale();
  }

  let dragEl = null;
  let selectedTapSlot = null;
  function onDragStart(e){ if(finished || isSpectator){ e.preventDefault(); dragEl = null; return; } dragEl = e.target; }

  function _preventDrag(e){ e.preventDefault(); }

  function clearTapSelection(){
    if(!selectedTapSlot) return;
    try{ selectedTapSlot.classList.remove('slot-selected'); }catch(e){}
    selectedTapSlot = null;
  }

  function swapSlots(sourceSlot, targetSlot){
    if(!sourceSlot || !targetSlot || sourceSlot === targetSlot) return false;
    const sourcePiece = sourceSlot.firstElementChild;
    const targetPiece = targetSlot.firstElementChild;
    if(!sourcePiece) return false;
    targetSlot.appendChild(sourcePiece);
    if(targetPiece) sourceSlot.appendChild(targetPiece);
    return true;
  }

  function onSlotTap(e){
    if(!touchCapable || finished || levelMode !== 'puzzle' || isSpectator) return;
    const slot = e.currentTarget;
    if(!slot) return;

    if(!selectedTapSlot){
      if(!slot.firstElementChild) return;
      selectedTapSlot = slot;
      slot.classList.add('slot-selected');
      return;
    }

    const sourceSlot = selectedTapSlot;
    clearTapSelection();
    if(swapSlots(sourceSlot, slot)) updateScores();
  }

  function onDrop(e){
    if(!dragEl || finished || isSpectator) return;
    const targetSlot = e.currentTarget;
    const sourceSlot = dragEl.parentElement;
    if(swapSlots(sourceSlot, targetSlot)) updateScores();
  }

  function sendPuzzleState(reason = 'move', force = false){
    if(!board || levelMode !== 'puzzle' || isSpectator) return;
    if(!cfg.team) return;
    const layout = captureBoardState();
    if(!Array.isArray(layout) || !layout.length) return;
    const sig = JSON.stringify(layout);
    if(!force && sig === lastSentPuzzleStateSig) return;
    lastSentPuzzleStateSig = sig;
    try{ saveGameSession(); }catch(e){}
    try{
      if(pubWs && pubWs.readyState === WebSocket.OPEN){
        pubWs.send(JSON.stringify({
          type: 'puzzleState',
          payload: {
            team: cfg.team,
            layout,
            reason,
            timestamp: Date.now(),
          }
        }));
      }
    }catch(e){ console.error('puzzleState send failed', e); }
  }

  function captureMemorySnapshot(){
    if(!board) return null;
    const cards = Array.from(board.querySelectorAll('.card'));
    if(!cards.length) return null;
    return cards.map(card=>({
      val: String(card.dataset.val || ''),
      revealed: Boolean(card.textContent && card.textContent.trim()),
      matched: card.classList.contains('matched'),
    }));
  }

  function sendMemoryState(reason = 'update', force = false){
    if(!board || levelMode !== 'memory' || isSpectator) return;
    if(!cfg.team) return;
    const cards = captureMemorySnapshot();
    if(!cards || !cards.length) return;
    const matchedCount = memoryState ? (Number(memoryState.matched) || 0) : cards.filter(c=>c.matched).length;
    const pairs = memoryState ? (Number(memoryState.pairs) || 0) : 0;
    const payload = {
      team: cfg.team,
      cards,
      matched: matchedCount,
      pairs,
      reason,
      timestamp: Date.now(),
    };
    const sig = JSON.stringify(payload);
    if(!force && sig === lastSentPuzzleStateSig) return;
    lastSentPuzzleStateSig = sig;
    try{ saveGameSession(); }catch(e){}
    try{
      if(pubWs && pubWs.readyState === WebSocket.OPEN){
        pubWs.send(JSON.stringify({ type: 'memoryState', payload }));
      }
    }catch(e){ console.error('memoryState send failed', e); }
  }

  function applyMemorySnapshot(snapshot){
    if(!board || !snapshot || !Array.isArray(snapshot.cards)) return;
    const cards = Array.from(board.querySelectorAll('.card'));
    if(!cards.length) return;
    cards.forEach((card, idx)=>{
      const row = snapshot.cards[idx] || {};
      card.textContent = row.revealed ? String(row.val || card.dataset.val || '') : '';
      card.classList.toggle('matched', Boolean(row.matched));
    });
    if(memoryState){
      memoryState.matched = Math.max(0, Number(snapshot.matched) || 0);
      if(snapshot.pairs) memoryState.pairs = Math.max(0, Number(snapshot.pairs) || memoryState.pairs || 0);
      memoryState.opened = [];
    }
    const pairs = (memoryState && memoryState.pairs) ? memoryState.pairs : (Number(snapshot.pairs) || 0);
    const matched = (memoryState && Number.isFinite(memoryState.matched)) ? memoryState.matched : (Number(snapshot.matched) || 0);
    const pct = pairs > 0 ? Math.round((matched / pairs) * 100) : 0;
    if(puzzleScoreEl) puzzleScoreEl.textContent = `Score: ${matched * 10}`;
    if(puzzleCompletionEl) puzzleCompletionEl.textContent = `Completion: ${pct}%`;
    try{ saveGameSession(); }catch(e){}
  }

  function playMemoryRevealFlip(card){
    if(!card) return;
    try{
      card.classList.remove('memory-reveal');
      void card.offsetWidth;
      card.classList.add('memory-reveal');
    }catch(e){}
  }

  function collectWordInputs(){
    const inputs = wordSection ? Array.from(wordSection.querySelectorAll('input.word-input')) : [];
    return inputs.map((input)=>({
      value: String(input.value || ''),
      invalid: input.classList.contains('invalid'),
      skipped: input.classList.contains('skipped'),
    }));
  }

  function sendWordState(reason = 'update', force = false){
    if(levelMode !== 'word' || isSpectator || !cfg.team || !wordState) return;
    const payload = {
      team: cfg.team,
      letter: String(wordState.letter || '').toUpperCase(),
      categories: Array.isArray(wordState.categories) ? wordState.categories.slice() : [],
      inputs: collectWordInputs(),
      correctCount: Number(wordState.correctCount) || 0,
      total: Number(wordState.total) || 0,
      status: wordStatusEl ? String(wordStatusEl.textContent || '') : '',
      finished: Boolean(finished),
      reason,
      timestamp: Date.now(),
    };
    const sig = JSON.stringify(payload);
    if(!force && sig === lastSentPuzzleStateSig) return;
    lastSentPuzzleStateSig = sig;
    try{ saveGameSession(); }catch(e){}
    try{
      if(pubWs && pubWs.readyState === WebSocket.OPEN){
        pubWs.send(JSON.stringify({ type: 'wordState', payload }));
      }
    }catch(e){ console.error('wordState send failed', e); }
  }

  function scheduleWordStateBroadcast(reason = 'typing'){
    if(isSpectator) return;
    if(wordStateBroadcastTimer) clearTimeout(wordStateBroadcastTimer);
    wordStateBroadcastTimer = setTimeout(()=>{
      wordStateBroadcastTimer = null;
      sendWordState(reason);
    }, 120);
  }

  function applyWordSnapshot(snapshot){
    if(!snapshot || !snapshot.letter) return;
    const letter = String(snapshot.letter || '').toUpperCase();
    const categories = Array.isArray(snapshot.categories) && snapshot.categories.length
      ? snapshot.categories.slice()
      : WORD_CATEGORIES.slice();
    if(levelMode !== 'word' || !wordState || String(wordState.letter || '').toUpperCase() !== letter){
      setupWordLevel({ mode: 'word', level: 3, letter, categories });
    }
    const inputs = wordSection ? Array.from(wordSection.querySelectorAll('input.word-input')) : [];
    const rows = Array.isArray(snapshot.inputs) ? snapshot.inputs : [];
    inputs.forEach((input, idx)=>{
      const row = rows[idx] || {};
      input.value = String(row.value || '');
      input.classList.toggle('invalid', Boolean(row.invalid));
      input.classList.toggle('skipped', Boolean(row.skipped));
    });
    if(wordState){
      wordState.correctCount = Math.max(0, Number(snapshot.correctCount) || 0);
      wordState.total = Math.max(0, Number(snapshot.total) || wordState.total || categories.length || 0);
    }
    if(wordStatusEl && typeof snapshot.status === 'string') wordStatusEl.textContent = snapshot.status;
    updateWordProgress();
    if(isSpectator || snapshot.finished) disableWordInputs();
    try{ saveGameSession(); }catch(e){}
  }

  function checkCompletionForContainer(container){
    const slots = Array.from(container.children);
    let correct = 0;
    slots.forEach(s=>{
      const child = s.firstElementChild;
      if(child && String(child.dataset.correct) === s.dataset.index) correct++;
    });
    return correct;
  }

  function updateScores(options = {}){
    const broadcast = options.broadcast !== false;
    if(!board) return;
    if(levelMode === 'word') return;
    if(solvedPreviewActive) return;
    if(finished) return; // stop updating scores after round finished
    let correct = 0;
    let points = 0;
    let pairsLocal = TOTAL;
    let pct = 0;
    if(levelMode === 'wordsearch' && typeof wordSearchState === 'object'){
      correct = wordSearchState.found ? (Number(wordSearchState.found.size) || 0) : 0;
      pairsLocal = Array.isArray(wordSearchState.words) ? wordSearchState.words.length : TOTAL;
      points = correct * 30; // 30 points per found word
      pct = pairsLocal ? Math.round((correct / pairsLocal) * 100) : 0;
      // update left scoreboard cell for level 5 for this client/team
      try{
        const aEl = document.getElementById('scoreA5');
        const bEl = document.getElementById('scoreB5');
        if(cfg.team === 'A'){
          if(aEl) aEl.textContent = String(points);
        } else if(cfg.team === 'B'){
          if(bEl) bEl.textContent = String(points);
        }
        // recompute totals shown on the scoreboard
        computeAndSetTotals();
      }catch(e){}
      // update any local wordsearch score display if present
      if(wordScoreEl) wordScoreEl.textContent = `Score: ${points}`;
      if(wordCompletionEl) wordCompletionEl.textContent = `Completion: ${pct}%`;
    } else {
      correct = checkCompletionForContainer(board);
      // For level 4 (pipe), each correct tile gives exactly 10 points
      if (levelMode === 'pipe') {
        points = correct * 10;
      } else if (levelMode === 'puzzle') {
        points = correct * 10;
      } else {
        points = correct;
      }
      pct = Math.round((correct/TOTAL)*100);
      if(puzzleScoreEl) puzzleScoreEl.textContent = `Score: ${points}`;
      if(puzzleCompletionEl) puzzleCompletionEl.textContent = `Completion: ${pct}%`;
    }
    // broadcast progress/state so admin + dashboard stay in sync
    if(broadcast && !isSpectator){
      try{ const msg = { type: 'progress', payload: { team: cfg.team || 'unknown', matched: correct, pairs: pairsLocal, remaining } };
        console.debug('Sending progress:', msg);
        if(pubWs && pubWs.readyState === WebSocket.OPEN) pubWs.send(JSON.stringify(msg));
      }catch(e){ console.error('progress send failed', e); }
      sendPuzzleState('scoreUpdate');
    }
    if(correct === TOTAL && !isSpectator){
      endGame('You', remaining);
    }
  }

  function computeAndSetTotals(){
    try{
      const levels = [1,2,3,4,5,6];
      let aSum = 0, bSum = 0;
      levels.forEach(i=>{
        const aEl = document.getElementById('scoreA'+i);
        const bEl = document.getElementById('scoreB'+i);
        aSum += Number(aEl && aEl.textContent) || 0;
        bSum += Number(bEl && bEl.textContent) || 0;
      });
      const totalAEl = document.getElementById('totalA');
      const totalBEl = document.getElementById('totalB');
      if(totalAEl) totalAEl.textContent = String(aSum);
      if(totalBEl) totalBEl.textContent = String(bSum);
      updateWinnerFromTotals();
    }catch(e){}
  }

  function endGame(winner, remainingSec){
    if(isSpectator) return;
    finished = true;
    roundLocked = true;
    stopHeartbeatSound();
    clearInterval(interval);
    if(statusEl) statusEl.textContent = `${winner} completed the puzzle!`;
    if(puzzleScoreEl){
      puzzleScoreEl.textContent += ` (completed)`;
    }
    // disable further moves and record/advance (only once)
    disableMoves();
    if(!scoreRecorded){
      // prepare entry and try to notify server/admin immediately, then record locally
      try{
        const correct = checkCompletionForContainer(board);
        const points = correct * 10;
        const inferredLevel = Number(currentLevel) || (levelMode === 'memory' ? 2 : (levelMode === 'word' ? 3 : (levelMode === 'pipe' ? 4 : (levelMode === 'wordsearch' ? 5 : (levelMode === 'connect' ? 6 : 1)))));
        const entry = { team: cfg.team || 'unknown', level: inferredLevel, matched: correct, pairs: TOTAL, score: points, bonus: 0, remaining: Math.max(0, Math.floor(Number(remaining) || 0)), reason: 'complete', timestamp: Date.now() };
        if(pubWs && pubWs.readyState === WebSocket.OPEN) pubWs.send(JSON.stringify({ type: 'roundComplete', payload: entry }));
      }catch(e){console.error('send immediate roundComplete failed', e)}
      recordScoreAndAdvance('complete');
    }
  }

  function disableMoves(){
    if(levelMode === 'connect') disableConnectInputs();
    if(!board) return;
    clearTapSelection();
    const pieces = board.querySelectorAll('.piece');
    pieces.forEach(p=>{
      try{ p.draggable = false; p.removeEventListener('dragstart', onDragStart); p.addEventListener('dragstart', _preventDrag); }catch(e){}
    });
  }

  function enableMoves(){
    if(levelMode === 'connect') enableConnectInputs();
    if(!board) return;
    if(isSpectator){ disableMoves(); return; }
    clearTapSelection();
    const pieces = board.querySelectorAll('.piece');
    pieces.forEach(p=>{
      try{ p.draggable = true; p.removeEventListener('dragstart', _preventDrag); p.addEventListener('dragstart', onDragStart); }catch(e){}
    });
  }

  // --- Winner logic implementation ---
  // Track completed levels and scores for each team
  const completedLevels = { A: new Set(), B: new Set() };
  const levelScores = { A: {}, B: {} };
  function recordScoreAndAdvance(reason, notifyCoordinator = true, advanceLevel = true){
    if(isSpectator) return;
    if(!board) return;
    let score = 0;
    let pairs = TOTAL;
    let matched = 0;
    const effectiveTimeLimit = (levelMode === 'memory' && memoryState && memoryState.timeLimit) ? memoryState.timeLimit : timeLimit;
    let bonus = 0;
    if(levelMode === 'pipe' && pipeState){
      const playableTiles = (pipeState.tiles || []).filter(t => t.playable);
      matched = playableTiles.filter(isPipeTileCorrect).length;
      pairs = playableTiles.length;
      score = matched * 10;
      if(finished && Number(remaining) >= Math.ceil(effectiveTimeLimit/2)) {
        bonus = Math.max(0, Math.floor(Number(remaining)));
      }
    } else if(levelMode === 'puzzle') {
      matched = checkCompletionForContainer(board);
      pairs = TOTAL;
      score = matched * 10;
      if(finished && Number(remaining) >= Math.ceil(effectiveTimeLimit/2)) {
        bonus = Math.max(0, Math.floor(Number(remaining)));
      }
    } else if(levelMode === 'word' && wordState){
      matched = wordState.correctCount || 0;
      pairs = wordState.total || wordState.categories.length || 0;
      score = matched * 10;
      if(finished && Number(remaining) >= Math.ceil(effectiveTimeLimit/2)) {
        bonus = Math.max(0, Math.floor(Number(remaining)));
      }
    } else if(levelMode === 'memory' && memoryState){
      matched = memoryState.matched || 0;
      pairs = memoryState.pairs || 0;
      score = matched * 10;
      if(finished && Number(remaining) >= Math.ceil(effectiveTimeLimit/2)) {
        bonus = Math.max(0, Math.floor(Number(remaining)));
      }
    } else if(levelMode === 'wordsearch' && wordSearchState){
      matched = wordSearchState.found ? (Number(wordSearchState.found.size) || 0) : 0;
      pairs = Array.isArray(wordSearchState.words) ? wordSearchState.words.length : 0;
      score = matched * 30;
      if(matched === pairs && finished && Number(remaining) >= Math.ceil(effectiveTimeLimit/2)) {
        bonus = Math.max(0, Math.floor(Number(remaining)));
      }
      // --- FORCE roundComplete for Team B on level 5 ---
      if(cfg.team === 'B' && Number(currentLevel) === 5) {
        try {
          const entryB = { team: cfg.team || 'B', level: 5, matched, pairs, score, bonus, remaining: Math.max(0, Math.floor(Number(remaining) || 0)), reason, timestamp: Date.now() };
          if(pubWs && pubWs.readyState === WebSocket.OPEN) {
            pubWs.send(JSON.stringify({ type: 'roundComplete', payload: entryB }));
            console.debug('[WordSearch][FORCE] Sent roundComplete for Team B (level 5):', entryB);
          }
        } catch(e) { console.error('[WordSearch][FORCE] Failed to send roundComplete for Team B', e); }
      }
    } else if(levelMode === 'connect' && connectState){
      matched = Number(connectState.matched) || 0;
      pairs = Number(connectState.totalPairs) || 4;
      score = matched * 20;
      if(matched === pairs && finished && Number(remaining) >= Math.ceil(effectiveTimeLimit/2)) {
        bonus = Math.max(0, Math.floor(Number(remaining)));
      }
    } else {
      matched = checkCompletionForContainer(board);
      pairs = TOTAL;
      score = matched * 10;
      if(finished && Number(remaining) >= Math.ceil(effectiveTimeLimit/2)) {
        bonus = Math.max(0, Math.floor(Number(remaining)));
      }
    }
    const inferredLevel = Number(currentLevel) || (levelMode === 'memory' ? 2 : (levelMode === 'word' ? 3 : (levelMode === 'pipe' ? 4 : (levelMode === 'wordsearch' ? 5 : (levelMode === 'connect' ? 6 : 1)))));
    const entry = { team: cfg.team || 'unknown', level: inferredLevel, matched, pairs, score, bonus, remaining: Math.max(0, Math.floor(Number(remaining) || 0)), reason, timestamp: Date.now() };
    try{
      const existing = JSON.parse(localStorage.getItem('puzzle_scores')||'[]');
      existing.push(entry);
      localStorage.setItem('puzzle_scores', JSON.stringify(existing));
    }catch(e){ console.error('storing score failed', e); }
    // Mark level as completed and store score
    const teamKey = (cfg.team === 'A' || cfg.team === 'B') ? cfg.team : 'A';
    completedLevels[teamKey].add(inferredLevel);
    levelScores[teamKey][inferredLevel] = score + (bonus || 0);
    // notify coordinator about round completion if requested
    try{ if(notifyCoordinator && pubWs && pubWs.readyState === WebSocket.OPEN) pubWs.send(JSON.stringify({ type: 'roundComplete', payload: entry })); }catch(e){ console.error(e); }
    // defensive: also send a progress message immediately so admin sees matched/score update
    try{ if(pubWs && pubWs.readyState === WebSocket.OPEN) pubWs.send(JSON.stringify({ type: 'progress', payload: { team: entry.team, matched, pairs, remaining } })); }catch(e){}

    scoreRecorded = true;
    try{ clearSavedGameSession(); }catch(e){}

    // Update local scoreboard display for level 5 immediately when recording
    try{
      const inferredLevelNum = Number(entry.level) || inferredLevel;
      if(inferredLevelNum >= 1 && inferredLevelNum <= 6){
        const aEl = document.getElementById('scoreA' + inferredLevelNum);
        const bEl = document.getElementById('scoreB' + inferredLevelNum);
        if(entry.team === 'A'){
          if(aEl) aEl.textContent = String(entry.score + (entry.bonus || 0));
        } else if(entry.team === 'B'){
          if(bEl) bEl.textContent = String(entry.score + (entry.bonus || 0));
        }
        computeAndSetTotals();
      }
    }catch(e){}

    // Winner logic: Only after all 6 levels completed for both teams
    if(completedLevels['A'].size === 6 && completedLevels['B'].size === 6){
      const totalA = [1,2,3,4,5,6].reduce((sum, lvl) => sum + (Number(levelScores['A'][lvl]) || 0), 0);
      const totalB = [1,2,3,4,5,6].reduce((sum, lvl) => sum + (Number(levelScores['B'][lvl]) || 0), 0);
      const nameA = getTeamDisplayName('A');
      const nameB = getTeamDisplayName('B');
      let winnerText = '';
      if(totalA > totalB){
        winnerText = `🏆 Winner! team ${nameA} 🏆`;
      } else if(totalB > totalA){
        winnerText = `🏆 Winner! team ${nameB} 🏆`;
      } else {
        winnerText = `🤝 Draw — ${nameA}: ${totalA} | ${nameB}: ${totalB} 🤝`;
      }
      setWinner(winnerText);
    }

    if(advanceLevel){
      if(cfg.levels && Array.isArray(cfg.levels) && cfg.levels.length > currentLevel+1){
        currentLevel++;
        const next = cfg.levels[currentLevel];
        if(statusEl) statusEl.textContent = 'Loading next level...';
        setTimeout(()=>{ applyImage(next); resetLocal(); }, 800);
        return;
      }
      if(statusEl) statusEl.textContent = 'Round finished. Waiting for next level...';
      try{ if(pubWs && pubWs.readyState === WebSocket.OPEN) pubWs.send(JSON.stringify({ type: 'requestNextLevel', team: cfg.team })); }catch(e){}
    }
  }

  function tick(){
    if(finished) {
      if (interval) {
        clearInterval(interval);
        interval = null;
        console.debug('[tick] Timer auto-stopped because finished=true');
      }
      return;
    }
    remaining -= 1;
    updateTimerDisplays(remaining, timeLimit);
    try{ saveGameSession(); }catch(e){}
    if(remaining<=0){
      clearInterval(interval);
      finished = true;
      stopHeartbeatSound();
      if(statusEl) statusEl.textContent = 'Time is up';
      if(levelMode === 'word') disableWordInputs();
      if(levelMode === 'wordsearch'){
        // disable further wordsearch interactions
        try{ wordSearchEnabled = false; }catch(e){}
        try{ if(typeof renderWordSearchPuzzle === 'function' && wordSearchState) renderWordSearchPuzzle(wordSearchState); }catch(e){}
      } else if(levelMode === 'connect'){
        disableConnectInputs();
      }
      disableMoves();
      recordScoreAndAdvance('timeout');
    }
  }

  function startLocalTimer(atStartTimestamp, limitSeconds){
    // Server is authoritative for timer synchronization across different devices.
    hideStartCountdown();
    roundLocked = false;
    timeLimit = limitSeconds;
    remaining = timeLimit;
    started = true; finished = false;
    showLevelMode(
      levelMode === 'word' ? 'word'
      : (levelMode === 'memory' ? 'memory'
      : (levelMode === 'pipe' ? 'pipe'
      : (levelMode === 'wordsearch' ? 'wordsearch'
      : (levelMode === 'connect' ? 'connect' : 'puzzle'))))
    );
    if(levelMode === 'wordsearch') wordSearchEnabled = true;
    if(levelMode === 'connect') enableConnectInputs();
    if(statusEl) statusEl.textContent = 'Game started';
    updateTimerDisplays(remaining, timeLimit);
    try{ saveGameSession(); }catch(e){}
    clearInterval(interval);
    // start local tick so the client counts down when running without server ticks
    try{ interval = setInterval(tick, 1000); }catch(e){ interval = null; }

    if(levelMode === 'memory'){
      if(isSpectator) disableMoves();
      else runMemoryInitialPreview();
      disableWordInputs();
      return;
    }

    if(levelMode === 'connect'){
      if(isSpectator) disableConnectInputs();
      else enableConnectInputs();
      return;
    }

    if(isSpectator) disableMoves();
    else enableMoves();
    enableWordInputs();
    updateScores();
  }

  function resetLocal(){
    stopHeartbeatSound();
    hideStartCountdown();
    clearInterval(interval);
    started = false; finished = false;
    roundLocked = false;
    scoreRecorded = false;
    timeLimit = cfg.timeLimit || 120;
    remaining = timeLimit;
    setCurrentMode('puzzle');
    // disable wordsearch by default on reset
    try{ wordSearchEnabled = false; }catch(e){}
    if(memoryState && memoryState.previewTimeout){
      try{ clearTimeout(memoryState.previewTimeout); }catch(e){}
    }
    if(memoryState && memoryState.initialPreviewTimeout){
      try{ clearTimeout(memoryState.initialPreviewTimeout); }catch(e){}
    }
    memoryState = null;
    wordState = null;
    connectState = null;
    pendingMemorySnapshot = null;
    pendingWordSnapshot = null;
    pendingConnectSnapshot = null;
    resetWordUI();
    resetConnectUI();
    if(statusEl) statusEl.textContent = 'Waiting to start';
    updateTimerDisplays(remaining, timeLimit);
    if(board){
      board.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
      board.style.gridTemplateRows = `repeat(${ROWS}, 1fr)`;
      board.style.width = 'var(--board-size)';
      board.style.height = 'var(--board-size)';
      makeBoard(board);
      populateBoard(board);
    }
    if(isSpectator) disableMoves();
    else enableMoves();
    showLevelMode('puzzle');
    if(!started) setCountdownVisualMask(true);
    updateScores();
    sendPuzzleState('reset', true);
    try{ clearSavedGameSession(); }catch(e){}
  }

  // WebSocket connection if configured
  const adminState = {
    progress: {
      A: { matched: 0, pairs: 0 },
      B: { matched: 0, pairs: 0 }
    },
    names: { A: 'A', B: 'B' }
  };
  let sendAdminControlMessage = null;

  function getTeamDisplayName(key){
    if(key === 'A') return adminState.names.A || 'A';
    if(key === 'B') return adminState.names.B || 'B';
    return String(key || '');
  }

  function normalizeTeamKey(teamValue){
    const raw = String(teamValue || '').trim();
    if(!raw) return '';
    if(/^A$/i.test(raw) || /^team\s*A$/i.test(raw) || /^teamA$/i.test(raw)) return 'A';
    if(/^B$/i.test(raw) || /^team\s*B$/i.test(raw) || /^teamB$/i.test(raw)) return 'B';
    const low = raw.toLowerCase();
    const aName = String(getTeamDisplayName('A') || '').trim().toLowerCase();
    const bName = String(getTeamDisplayName('B') || '').trim().toLowerCase();
    if(aName && low === aName) return 'A';
    if(bName && low === bName) return 'B';
    return '';
  }

  function setWinner(text){
    const w = document.getElementById('winner');
    if(w) w.textContent = text;
    renderWinnerBanner(text);
  }

  function ensureWinnerBanner(){
    try{
      if(isSpectator) return null;
      if(document.body && document.body.classList && document.body.classList.contains('admin-page')) return null;
    }catch(e){}
    let el = document.getElementById('gameWinnerBanner');
    if(el) return el;
    el = document.createElement('div');
    el.id = 'gameWinnerBanner';
    el.className = 'game-winner-banner';
    document.body.appendChild(el);
    return el;
  }

  function isPendingWinnerText(text){
    const t = String(text || '').trim().toLowerCase();
    if(!t) return true;
    if(t.includes('pending')) return true;
    if(t === '—' || t === '-') return true;
    return false;
  }

  function renderWinnerBanner(text){
    const banner = ensureWinnerBanner();
    if(!banner) return;
    if(isPendingWinnerText(text)){
      banner.classList.remove('show', 'tie');
      banner.textContent = '';
      return;
    }
    const raw = String(text || '').trim();
    banner.classList.remove('tie');
    banner.textContent = raw;
    banner.classList.add('show');
  }

  function updateWinnerFromTotals(){
    if(!winnerFromServer){
      setWinner('Pending (complete all 6 levels)');
    }
  }
   // manula winer test
  /*////////////////////////

   function updateWinnerFromTotals(){
    const totalAEl = document.getElementById('totalA');
    const totalBEl = document.getElementById('totalB');
    const winnerEl = document.getElementById('winnerDisplay');

    if(!totalAEl || !totalBEl || !winnerEl) return;

    const a = Number(totalAEl.textContent) || 0;
    const b = Number(totalBEl.textContent) || 0;

    if(a > b){
        winnerEl.textContent = `🏆 Winner: Team A (${a} vs ${b}) 🏆`;
    }
    else if(b > a){
        winnerEl.textContent = `🏆 Winner: Team B (${b} vs ${a}) 🏆`;
    }
    else{
        winnerEl.textContent = `🤝 Draw: Team A (${a}) - Team B (${b}) 🤝`;
    }
}*/


  /////////////////////////






  function setLastRound(text){
    const lr = document.getElementById('lastRound');
    if(lr) lr.textContent = text;
  }

  function updateLeadingTeamFromTotals(a, b){
    const scoreA = Number(a) || 0;
    const scoreB = Number(b) || 0;
    const nameA = getTeamDisplayName('A');
    const nameB = getTeamDisplayName('B');
    if(scoreA > scoreB){
      setLastRound(`Leading: ${nameA} (Team A) — ${scoreA} vs ${scoreB}`);
      return;
    }
    if(scoreB > scoreA){
      setLastRound(`Leading: ${nameB} (Team B) — ${scoreB} vs ${scoreA}`);
      return;
    }
    setLastRound(`Leading: Tie — ${scoreA} vs ${scoreB}`);
  }

  function renderLevelScores(levelScores){
    const byTeam = levelScores && typeof levelScores === 'object' ? levelScores : {};
    const aLevels = byTeam.A || {};
    const bLevels = byTeam.B || {};

    const allLevels = [1,2,3,4,5,6];
    const completedA = allLevels.filter(l => Number(aLevels[l]) > 0);
    const completedB = allLevels.filter(l => Number(bLevels[l]) > 0);
    const missingA = allLevels.filter(l => !completedA.includes(l));
    const missingB = allLevels.filter(l => !completedB.includes(l));

    const a1 = Number(aLevels[1]) || 0;
    const a2 = Number(aLevels[2]) || 0;
    const a3 = Number(aLevels[3]) || 0;
    const a4 = Number(aLevels[4]) || 0;
    const a5 = Number(aLevels[5]) || 0;
    const a6 = Number(aLevels[6]) || 0;
    const b1 = Number(bLevels[1]) || 0;
    const b2 = Number(bLevels[2]) || 0;
    const b3 = Number(bLevels[3]) || 0;
    const b4 = Number(bLevels[4]) || 0;
    const b5 = Number(bLevels[5]) || 0;
    const b6 = Number(bLevels[6]) || 0;

    const scoreA1El = document.getElementById('scoreA1');
    const scoreA2El = document.getElementById('scoreA2');
    const scoreA3El = document.getElementById('scoreA3');
    const scoreA4El = document.getElementById('scoreA4');
    const scoreA6El = document.getElementById('scoreA6');
    const scoreB1El = document.getElementById('scoreB1');
    const scoreB2El = document.getElementById('scoreB2');
    const scoreB3El = document.getElementById('scoreB3');
    const scoreB4El = document.getElementById('scoreB4');
    const scoreB6El = document.getElementById('scoreB6');

    if(scoreA1El) scoreA1El.textContent = String(a1);
    if(scoreA2El) scoreA2El.textContent = String(a2);
    if(scoreA3El) scoreA3El.textContent = String(a3);
    if(scoreA4El) scoreA4El.textContent = String(a4);
    const scoreA5El = document.getElementById('scoreA5');
    const scoreB5El = document.getElementById('scoreB5');
    if(scoreA5El) scoreA5El.textContent = String(a5);
    if(scoreA6El) scoreA6El.textContent = String(a6);
    if(scoreB1El) scoreB1El.textContent = String(b1);
    if(scoreB2El) scoreB2El.textContent = String(b2);
    if(scoreB3El) scoreB3El.textContent = String(b3);
    if(scoreB4El) scoreB4El.textContent = String(b4);
    if(scoreB5El) scoreB5El.textContent = String(b5);
    if(scoreB6El) scoreB6El.textContent = String(b6);

    // Show missing levels for each team
    const missingAEl = document.getElementById('missingLevelsA');
    const missingBEl = document.getElementById('missingLevelsB');
    if(missingAEl) missingAEl.textContent = missingA.length ? `Missing: ${missingA.join(', ')}` : 'All levels complete';
    if(missingBEl) missingBEl.textContent = missingB.length ? `Missing: ${missingB.join(', ')}` : 'All levels complete';
  }

  function formatHistoryLevelTriplet(levels, teamKey){
    const byTeam = levels && levels[teamKey] ? levels[teamKey] : {};
    const l1 = Number(byTeam[1]) || 0;
    const l2 = Number(byTeam[2]) || 0;
    const l3 = Number(byTeam[3]) || 0;
    const l4 = Number(byTeam[4]) || 0;
    const l5 = Number(byTeam[5]) || 0;
    const l6 = Number(byTeam[6]) || 0;
    return `${l1}/${l2}/${l3}/${l4}/${l5}/${l6}`;
  }

  function renderGameHistory(history){
    const body = document.getElementById('gameHistoryBody');
    if(!body) return;
    const rows = Array.isArray(history) ? history.slice().reverse() : [];
    body.innerHTML = '';
    if(!rows.length){
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 9;
      td.textContent = 'No completed games yet.';
      tr.appendChild(td);
      body.appendChild(tr);
      return;
    }

    rows.forEach(entry=>{
      const tr = document.createElement('tr');
      const when = entry && entry.playedAt ? new Date(entry.playedAt) : null;
      const timeText = when && !Number.isNaN(when.getTime()) ? when.toLocaleString() : '—';
      const teamAName = (entry && entry.teams && entry.teams.A) ? entry.teams.A : 'A';
      const teamBName = (entry && entry.teams && entry.teams.B) ? entry.teams.B : 'B';
      const aLevels = formatHistoryLevelTriplet(entry.levelScores, 'A');
      const bLevels = formatHistoryLevelTriplet(entry.levelScores, 'B');
      const aTotal = Number(entry && entry.totals && entry.totals.A) || 0;
      const bTotal = Number(entry && entry.totals && entry.totals.B) || 0;
      const winner = (entry && entry.winnerName) ? entry.winnerName : 'Pending';

      [
        timeText,
        teamAName,
        aLevels,
        String(aTotal),
        teamBName,
        bLevels,
        String(bTotal),
        winner,
      ].forEach(value=>{
        const td = document.createElement('td');
        td.textContent = value;
        tr.appendChild(td);
      });

      const actionTd = document.createElement('td');
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.textContent = 'Delete';
      deleteBtn.className = 'history-delete-btn';
      deleteBtn.disabled = typeof sendAdminControlMessage !== 'function';
      deleteBtn.addEventListener('click', ()=>{
        if(typeof sendAdminControlMessage !== 'function') return;
        const targetId = entry && entry.id;
        if(targetId == null) return;
        const targetLabel = `${teamAName} vs ${teamBName} (${timeText})`;
        const ok = window.confirm(`Delete this game history entry?\n\n${targetLabel}`);
        if(!ok) return;
        sendAdminControlMessage({ type: 'deleteHistoryEntry', entryId: targetId });
      });
      actionTd.appendChild(deleteBtn);
      tr.appendChild(actionTd);

      body.appendChild(tr);
    });
  }

  function resetAdminPanels(){
    try{
      const teamAPanel = document.getElementById('teamAPanel');
      const teamBPanel = document.getElementById('teamBPanel');
      const panels = [teamAPanel, teamBPanel].filter(Boolean);
      panels.forEach(el=>{
        const matchedEl = el.querySelector('.matched');
        const pctEl = el.querySelector('.completion');
        const scoreElA = el.querySelector('.score');
        const statusElA = el.querySelector('.team-status');
        if(matchedEl) matchedEl.textContent = '0 / 0';
        if(pctEl) pctEl.textContent = '0%';
        if(scoreElA) scoreElA.textContent = 'Score: 0';
        if(statusElA) statusElA.textContent = 'Waiting';
      });
    }catch(e){}
    adminState.progress.A = { matched: 0, pairs: 0 };
    adminState.progress.B = { matched: 0, pairs: 0 };
    winnerFromServer = false;
    updateWinnerFromTotals();
    setLastRound('Leading: —');
    try{ const cl = document.getElementById('currentLetter'); if(cl) cl.textContent = '—'; }catch(e){}
  }

  function applyAuthoritativeTimer(timer){
    if(!timer || typeof timer !== 'object') return;
    try{
      const timerStatus = String(timer.status || '').toLowerCase();
      // Keep the local timer frozen after this client has finished a locked round.
      if(finished && roundLocked && timerStatus !== 'finished' && timerStatus !== 'paused' && timer.running){
        return;
      }
      if(typeof timer.timeLimit !== 'undefined') timeLimit = Number(timer.timeLimit) || timeLimit;
      if(typeof timer.remaining !== 'undefined' && timer.remaining !== null){
        remaining = Number(timer.remaining);
      }
      if(Number.isFinite(remaining)) updateTimerDisplays(remaining, timeLimit);

      if(timer.paused){
        clearInterval(interval);
        if(statusEl) statusEl.textContent = 'Paused';
        const ls = document.getElementById('levelStatus'); if(ls) ls.textContent = 'Paused';
        return;
      }

      if(timer.running){
        started = true;
        if(finished && !roundLocked){
          finished = false;
          enableMoves();
          enableWordInputs();
        }
        if(levelMode === 'word' && !finished){
          enableWordInputs();
        }
        if(statusEl) statusEl.textContent = 'Game started';
        const ls = document.getElementById('levelStatus'); if(ls) ls.textContent = 'Running';
      } else if(Number.isFinite(remaining) && remaining <= 0){
        finished = true;
        roundLocked = true;
        clearInterval(interval);
        disableMoves();
        disableWordInputs();
        if(statusEl) statusEl.textContent = 'Time is up';
        const ls = document.getElementById('levelStatus'); if(ls) ls.textContent = 'Finished';
      }
    }catch(e){ console.error('apply authoritative timer failed', e); }
  }

  function applyAuthoritativeGameState(gs){
    if(!gs || typeof gs !== 'object') return;
    try{
      if(gs.names){
        if(gs.names.A) setTeamNameUI('A', gs.names.A);
        if(gs.names.B) setTeamNameUI('B', gs.names.B);
      }
      if(gs.level && typeof gs.level === 'object'){
        const cfgLevel = gs.level;
        const sig = JSON.stringify(cfgLevel);
        if(sig !== lastAuthoritativeLevelSig){
          lastAuthoritativeLevelSig = sig;
          if(cfgLevel.mode === 'memory') setupMemoryLevel(cfgLevel);
          else if(cfgLevel.mode === 'word') setupWordLevel(cfgLevel);
          else if(cfgLevel.mode === 'wordsearch') setupWordSearchLevel(cfgLevel);
          else if(cfgLevel.mode === 'pipe') setupPipeLevel(cfgLevel);
          else if(cfgLevel.mode === 'connect') setupConnectLevel(cfgLevel);
          else if(cfgLevel.mode === 'puzzle'){
            levelMode = 'puzzle';
            resetLocal();
          }
        }
      }
      if(gs.imageUrl) applyImage(gs.imageUrl);
      if(typeof gs.promoVideoUrl !== 'undefined') applyPromoVideo(gs.promoVideoUrl);
      if(typeof gs.promoImageUrl !== 'undefined') applyPromoImage(gs.promoImageUrl);
      if(typeof gs.promoWidth !== 'undefined') applyDashboardPromoWidth(gs.promoWidth);
      if(typeof gs.promoHeight !== 'undefined') applyDashboardPromoHeight(gs.promoHeight);
      if(typeof gs.boardHeight !== 'undefined') applyDashboardBoardHeight(gs.boardHeight);
      if(gs.timer) applyAuthoritativeTimer(gs.timer);
      if(gs.levelScores) renderLevelScores(gs.levelScores);
      if(gs.scores){
        const totalAEl = document.getElementById('totalA');
        const totalBEl = document.getElementById('totalB');
        if(totalAEl) totalAEl.textContent = String(Number(gs.scores.A) || 0);
        if(totalBEl) totalBEl.textContent = String(Number(gs.scores.B) || 0);
        updateWinnerFromTotals();
      }
      if(typeof gs.winnerName === 'string' && !isPendingWinnerText(gs.winnerName)){
        winnerFromServer = true;
        try{
          const scores = gs.scores || gs.totalFinal || {};
          const a = Number(scores.A) || 0;
          const b = Number(scores.B) || 0;
          const nameA = getTeamDisplayName('A');
          const nameB = getTeamDisplayName('B');
          if(a > b) setWinner(`🏆 A Wins! team ${nameA} 🏆`);
          else if(b > a) setWinner(`🏆 B Wins! team ${nameB} 🏆`);
          else setWinner(`🏆 Final Score — ${nameA}: ${a} | ${nameB}: ${b} 🏆`);
        }catch(e){ setWinner(gs.winnerName); }
      }
    }catch(e){ console.error('apply gameState failed', e); }
  }

  if(cfg.ws){
    try{
      pubWs = new WebSocket(cfg.ws);
      pubWs.addEventListener('open', ()=>{
        console.log('WS connected to', cfg.ws);
        try{ pubWs.send(JSON.stringify({ type: 'stateRequest' })); }catch(e){}
        if(cfg.team && !isSpectator){
          setTimeout(()=>{
            try{
              if(levelMode === 'memory') sendMemoryState('sync', true);
              else if(levelMode === 'word') sendWordState('sync', true);
              else if(levelMode === 'connect') sendConnectState('sync', true);
              else sendPuzzleState('sync', true);
            }catch(e){}
          }, 120);
        }
      });
      pubWs.addEventListener('close', ()=> scheduleWsRecovery('Connection lost. Reconnecting...'));
      pubWs.addEventListener('error', ()=> scheduleWsRecovery('Connection error. Reconnecting...'));
      pubWs.addEventListener('message', evt=>{
        try{
          const msg = JSON.parse(evt.data);
          if(msg.type === 'gameState'){
            applyAuthoritativeGameState(msg);
          } else if(msg.type === 'updateTeamName'){
            try{ setTeamNameUI(msg.team, msg.name); }catch(e){}
          } else if(msg.type === 'start'){
            startLocalTimer(msg.start, msg.timeLimit);
            try{ const ls = document.getElementById('levelStatus'); if(ls) ls.textContent = 'Running'; }catch(e){}
          } else if(msg.type === 'startCountdown'){
            showStartCountdown(msg.seconds, msg.endsAt);
            try{ const ls = document.getElementById('levelStatus'); if(ls) ls.textContent = 'Starting...'; }catch(e){}
          } else if(msg.type === 'startCountdownCancel'){
            hideStartCountdown();
          } else if(msg.type === 'reset'){
            resetLocal();
            try{ const ls = document.getElementById('levelStatus'); if(ls) ls.textContent = 'Idle'; }catch(e){}
            resetAdminPanels();
          } else if(msg.type === 'image'){
            if(msg.url){
              applyImage(msg.url);
            }
          } else if(msg.type === 'promoVideo'){
            applyPromoVideo(msg.url || '');
          } else if(msg.type === 'promoImage'){
            applyPromoImage(msg.url || '');
          } else if(msg.type === 'promoWidth'){
            applyDashboardPromoWidth(msg.width);
          } else if(msg.type === 'promoHeight'){
            applyDashboardPromoHeight(msg.height);
          } else if(msg.type === 'boardHeight'){
            applyDashboardBoardHeight(msg.height);
          } else if(msg.type === 'promoVideoControl'){
            controlPromoVideo(msg.action || '');
          } else if(msg.type === 'timer'){
            try{
              const msgStatus = String(msg.status || '').toLowerCase();
              // Keep the local timer frozen after this client has finished a locked round.
              if(finished && roundLocked && msgStatus !== 'finished' && msgStatus !== 'paused'){
                return;
              }
              if(typeof msg.remaining !== 'undefined'){
                remaining = msg.remaining;
                if(typeof msg.timeLimit !== 'undefined') timeLimit = Number(msg.timeLimit) || timeLimit;
                if(remaining > 0 && msg.status !== 'paused'){
                  if(finished && !roundLocked){
                    finished = false;
                    enableMoves();
                    enableWordInputs();
                  }
                  if(levelMode === 'word' && !finished){
                    enableWordInputs();
                  }
                }
                updateTimerDisplays(remaining, timeLimit);
              }
              if(msg.status === 'finished' || remaining <= 0){
                finished = true; roundLocked = true; clearInterval(interval); disableMoves(); if(statusEl) statusEl.textContent = 'Time is up';
                stopHeartbeatSound();
                if(levelMode === 'word') disableWordInputs();
                if(!scoreRecorded) recordScoreAndAdvance('timeout', true, false);
              }
            }catch(e){console.error('timer msg error',e)}
          } else if(msg.type === 'pause'){
            try{ clearInterval(interval); if(statusEl) statusEl.textContent = 'Paused'; }catch(e){}
            try{ const ls = document.getElementById('levelStatus'); if(ls) ls.textContent = 'Paused'; }catch(e){}
          } else if(msg.type === 'timerFinished'){
            try{ finished = true; roundLocked = true; clearInterval(interval); disableMoves(); if(statusEl) statusEl.textContent = msg.reason ? `Ended (${msg.reason})` : 'Time finished'; }catch(e){}
            stopHeartbeatSound();
            try{ if(levelMode === 'word') disableWordInputs(); }catch(e){}
            try{ if(!scoreRecorded) recordScoreAndAdvance(msg.reason || 'timeout', true, false); }catch(e){}
            try{ updateTimerDisplays(0, timeLimit); const ls = document.getElementById('levelStatus'); if(ls) ls.textContent = 'Finished'; }catch(e){}
          } else if(msg.type === 'teamProgress'){
            try{
              const p = msg.payload || {};
              let team = p.team || '';
              const matched = p.matched || 0; const pairs = p.pairs || 0;
              const levelNum = Number(p.level) || 0;
              const pct = pairs>0 ? Math.round((matched/pairs)*100) : 0;
              const teamKey = normalizeTeamKey(team);
              if(teamKey === 'A' || teamKey === 'B') adminState.progress[teamKey] = { matched, pairs };
              const el = (teamKey ? document.getElementById('team' + teamKey + 'Panel') : null) || document.getElementById('team' + team + 'Panel') || document.getElementById('team' + team + 'Panel');
              let scoreDisplay = matched * 10;
              if(levelNum === 5) scoreDisplay = matched * 30;
              if(levelNum === 6) scoreDisplay = matched * 20;
              if(el){
                const matchedEl = el.querySelector('.matched');
                const pctEl = el.querySelector('.completion');
                const scoreElA = el.querySelector('.score');
                const statusElA = el.querySelector('.team-status');
                if(matchedEl) matchedEl.textContent = `${matched} / ${pairs}`;
                if(pctEl) pctEl.textContent = `${pct}%`;
                if(scoreElA) scoreElA.textContent = `Score: ${scoreDisplay}`;
                if(statusElA) statusElA.textContent = matched===pairs ? 'Finished' : 'Playing';
              }
            }catch(e){console.error(e)}
          } else if(msg.type === 'puzzleState'){
            try{
              const payload = msg.payload || {};
              const teamKey = normalizeTeamKey(payload.team || payload.teamDisplay);
              if(cfg.team && teamKey && cfg.team !== teamKey) return;
              if(!Array.isArray(payload.layout) || !payload.layout.length) return;
              if(!board || !board.children || !board.children.length){
                pendingPuzzleLayout = payload.layout.slice();
                return;
              }
              restoreBoardState(payload.layout);
              const reason = String(payload.reason || '');
              const isPreviewSync = reason === 'previewShow' || reason === 'previewHide';
              if(!isPreviewSync){
                updateScores({ broadcast: false });
              }
            }catch(e){ console.error('apply puzzleState failed', e); }
          } else if(msg.type === 'memoryState'){
            try{
              const payload = msg.payload || {};
              const teamKey = normalizeTeamKey(payload.team || payload.teamDisplay);
              if(cfg.team && teamKey && cfg.team !== teamKey) return;
              // For active player boards, ignore live echo snapshots during play;
              // they can reset local opened-card tracking and break touch matching.
              if(!isSpectator && cfg.team && teamKey === cfg.team && levelMode === 'memory' && board && board.querySelector('.card')){
                return;
              }
              if(levelMode !== 'memory' || !board || !board.querySelector('.card')){
                pendingMemorySnapshot = payload;
                return;
              }
              applyMemorySnapshot(payload);
            }catch(e){ console.error('apply memoryState failed', e); }
          } else if(msg.type === 'wordState'){
            try{
              const payload = msg.payload || {};
              const teamKey = normalizeTeamKey(payload.team || payload.teamDisplay);
              if(cfg.team && teamKey && cfg.team !== teamKey) return;
              // Ignore live echo snapshots on active player board to avoid input flicker/caret jumps.
              if(!isSpectator && cfg.team && teamKey === cfg.team && levelMode === 'word' && wordSection){
                return;
              }
              pendingWordSnapshot = payload;
              if(levelMode === 'word' && wordSection){
                applyWordSnapshot(payload);
                pendingWordSnapshot = null;
              }
            }catch(e){ console.error('apply wordState failed', e); }
          } else if(msg.type === 'pipeState'){
            try{
              const payload = msg.payload || {};
              const teamKey = normalizeTeamKey(payload.team || payload.teamDisplay);
              if(cfg.team && teamKey && cfg.team !== teamKey) return;
              pendingPipeSnapshot = payload;
              if(levelMode === 'pipe' && typeof applyPipeSnapshot === 'function'){
                applyPipeSnapshot(payload);
                pendingPipeSnapshot = null;
              }
            }catch(e){ console.error('apply pipeState failed', e); }
          } else if(msg.type === 'connectState'){
            try{
              const payload = msg.payload || {};
              const teamKey = normalizeTeamKey(payload.team || payload.teamDisplay);
              if(cfg.team && teamKey && cfg.team !== teamKey) return;
              pendingConnectSnapshot = payload;
              if(levelMode === 'connect' && typeof applyConnectSnapshot === 'function'){
                applyConnectSnapshot(payload);
                pendingConnectSnapshot = null;
              }
            }catch(e){ console.error('apply connectState failed', e); }
          } else if(msg.type === 'scoreUpdate'){
            try{
              const totals = msg.totals || {};
              if(msg.names && typeof msg.names === 'object'){
                if(msg.names.A){
                  adminState.names.A = msg.names.A;
                  setTeamNameUI('A', msg.names.A);
                }
                if(msg.names.B){
                  adminState.names.B = msg.names.B;
                  setTeamNameUI('B', msg.names.B);
                }
              }
              const a = totals['A'] || totals['Team A'] || totals['teamA'] || totals['a'] || 0;
              const b = totals['B'] || totals['Team B'] || totals['teamB'] || totals['b'] || 0;
              const totalAll = Object.keys(totals).reduce((sum, k)=> sum + (Number(totals[k]) || 0), 0);
              const totalAEl = document.getElementById('totalA');
              const totalBEl = document.getElementById('totalB');
              const totalSumEl = document.getElementById('totalSum');
              if(totalAEl) totalAEl.textContent = String(a);
              if(totalBEl) totalBEl.textContent = String(b);
              if(totalSumEl) totalSumEl.textContent = String(totalAll);
              renderLevelScores(msg.levelScores);
              try{
                const aNameEl = document.getElementById('teamAName');
                const bNameEl = document.getElementById('teamBName');
                const aTotalLabel = document.getElementById('totalALabel');
                const bTotalLabel = document.getElementById('totalBLabel');
                if(aNameEl) aNameEl.textContent = getTeamDisplayName('A');
                if(bNameEl) bNameEl.textContent = getTeamDisplayName('B');
                if(aTotalLabel) aTotalLabel.textContent = getTeamDisplayName('A');
                if(bTotalLabel) bTotalLabel.textContent = getTeamDisplayName('B');
              }catch(e){}
              updateLeadingTeamFromTotals(a, b);
              if(typeof msg.winnerName === 'string' && !isPendingWinnerText(msg.winnerName)){
                winnerFromServer = true;
                try{
                  const winnerKey = typeof msg.winnerKey === 'string' && msg.winnerKey ? msg.winnerKey : (a > b ? 'A' : (b > a ? 'B' : ''));
                  const nameA = getTeamDisplayName('A');
                  const nameB = getTeamDisplayName('B');
                  if(a > b){
                    setWinner(`🏆 A Wins! team ${nameA} 🏆`);
                  } else if(b > a){
                    setWinner(`🏆 B Wins! team ${nameB} 🏆`);
                  } else {
                    setWinner(`🏆 Final Score — ${nameA}: ${a} | ${nameB}: ${b} 🏆`);
                  }
                }catch(e){
                  setWinner(msg.winnerName);
                }
              } else {
                winnerFromServer = false;
                updateWinnerFromTotals();
              }
            }catch(e){console.error(e)}
          } else if(msg.type === 'gameHistory'){
            try{ renderGameHistory(msg.history || []); }catch(e){ console.error('render history failed', e); }
          } else if(msg.type === 'gameLogged'){
            try{ renderGameHistory(msg.history || []); }catch(e){ console.error('render logged game failed', e); }
          } else if(msg.type === 'level'){
            try{
              const cfgLevel = msg;
              if(cfgLevel.mode === 'memory'){
                setCurrentLevel(Number(cfgLevel.level) || 2);
                setCurrentMode('memory');
                setupMemoryLevel(cfgLevel);
              } else if(cfgLevel.mode === 'word'){
                setCurrentLevel(Number(cfgLevel.level) || 3);
                setCurrentMode('word');
                setupWordLevel(cfgLevel);
              } else if(cfgLevel.mode === 'wordsearch'){
                setCurrentLevel(Number(cfgLevel.level) || 5);
                setCurrentMode('wordsearch');
                setupWordSearchLevel(cfgLevel);
                levelMode = 'wordsearch';
              } else if(cfgLevel.mode === 'pipe'){
                setCurrentLevel(Number(cfgLevel.level) || 4);
                setCurrentMode('pipe');
                resetPipeLocal();
                setupPipeLevel(cfgLevel);
              } else if(cfgLevel.mode === 'connect'){
                setCurrentLevel(Number(cfgLevel.level) || 6);
                setCurrentMode('connect');
                setupConnectLevel(cfgLevel);
              } else if(cfgLevel.mode === 'puzzle'){
                setCurrentLevel(Number(cfgLevel.level) || 1);
                setCurrentMode('puzzle');
                if(cfgLevel.url) applyImage(cfgLevel.url);
                levelMode = 'puzzle';
                resetLocal();
              }
              try{ const cl = document.getElementById('currentLevel'); if(cl) cl.textContent = cfgLevel.level || (cfgLevel.mode === 'wordsearch' ? 5 : (cfgLevel.mode === 'connect' ? 6 : cfgLevel.mode)) || '—'; const ls = document.getElementById('levelStatus'); if(ls) ls.textContent = 'Ready'; }catch(e){}
            }catch(e){ console.error('apply level failed', e); }
            // Reset all local state for pipe level
            function resetPipeLocal(){
              stopHeartbeatSound && stopHeartbeatSound();
              hideStartCountdown && hideStartCountdown();
              clearInterval && clearInterval(interval);
              started = false; finished = false;
              roundLocked = false;
              scoreRecorded = false;
              timeLimit = cfg && cfg.timeLimit || 75;
              remaining = timeLimit;
              levelMode = 'pipe';
              pipeState = null;
              pendingPipeSnapshot = null;
              if(pipeStatusEl) pipeStatusEl.textContent = 'Waiting to start';
              updateTimerDisplays && updateTimerDisplays(remaining, timeLimit);
              if(pipeGridEl) pipeGridEl.innerHTML = '';
              if(isSpectator) disablePipeInputs && disablePipeInputs();
              else enablePipeInputs && enablePipeInputs();
              showLevelMode && showLevelMode('pipe');
              if(!started) setCountdownVisualMask && setCountdownVisualMask(true);
              if(pipeScoreEl) pipeScoreEl.textContent = 'Score: 0';
              if(pipeCompletionEl) pipeCompletionEl.textContent = 'Completion: 0%';
            }
          } else if(msg.type === 'next'){
            if(msg.url){ applyImage(msg.url); resetLocal(); }
          } else if(msg.type === 'roundComplete'){
            try{
              roundLocked = true;
              if(!finished){
                finished = true;
                clearInterval(interval);
                if(statusEl) statusEl.textContent = msg.payload && msg.payload.team ? `${msg.payload.team} completed the puzzle` : 'Round complete';
                disableMoves();
                
                if(levelMode === 'word') disableWordInputs();
                if(!scoreRecorded) recordScoreAndAdvance('otherComplete', true, false);
                
              }
              try{
                const lr = msg.payload || {};
                const lrTeamKey = normalizeTeamKey(lr.team || lr.teamDisplay);
                const roundScore = Math.max(0, Number(lr.score) || 0);
                const totalAEl = document.getElementById('totalA');
                const totalBEl = document.getElementById('totalB');
                let aNow = Number(totalAEl && totalAEl.textContent) || 0;
                let bNow = Number(totalBEl && totalBEl.textContent) || 0;
                if(lrTeamKey === 'A') aNow += roundScore;
                if(lrTeamKey === 'B') bNow += roundScore;
                updateLeadingTeamFromTotals(aNow, bNow);
                updateWinnerFromTotals();
              }catch(e){}
            }catch(e){ console.error('handling roundComplete', e); }
          }
        }catch(e){console.error(e)}
      });
    }catch(e){console.error('WS connect failed', e)}
  }

  function applyImage(url){
    if(!url) return;
    const normalizedUrl = normalizeSharedImageUrl(url);
    if(normalizedUrl === imageUrl) return;
    imageUrl = normalizedUrl;
    solvedPreviewActive = false;
    solvedPreviewSnapshot = null;
    // update preview if present
    const preview = document.getElementById('imagePreview');
    if(preview) preview.src = normalizedUrl;
    // rebuild board pieces using the new image
    if(board){
      board.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
      board.style.gridTemplateRows = `repeat(${ROWS}, 1fr)`;
      board.style.width = 'var(--board-size)';
      board.style.height = 'var(--board-size)';
      makeBoard(board);
      populateBoard(board);
      updateScores();
    }
  }

  function applyPromoVideo(url){
    const normalizedUrl = url ? normalizeSharedImageUrl(url) : '';
    const ytEmbedUrl = toYouTubeEmbedUrl(normalizedUrl);
    const useEmbed = Boolean(ytEmbedUrl);
    promoVideoUrl = normalizedUrl || null;
    promoVideoIsEmbed = useEmbed;

    if(!promoVideoPlayerEl && !promoVideoAdminPreviewEl) return;

    if(!normalizedUrl){
      if(promoVideoPlayerEl){
        try{
          promoVideoPlayerEl.pause();
          promoVideoPlayerEl.removeAttribute('src');
          promoVideoPlayerEl.load();
        }catch(e){}
      }
      if(promoVideoPlayerEmbedEl){
        promoVideoPlayerEmbedEl.style.display = 'none';
        promoVideoPlayerEmbedEl.removeAttribute('src');
      }
      if(promoVideoPlayerEl) promoVideoPlayerEl.style.display = '';
      if(promoVideoAdminPreviewEl){
        try{
          promoVideoAdminPreviewEl.removeAttribute('src');
          promoVideoAdminPreviewEl.load();
        }catch(e){}
      }
      if(promoVideoAdminEmbedEl){
        promoVideoAdminEmbedEl.style.display = 'none';
        promoVideoAdminEmbedEl.removeAttribute('src');
      }
      if(promoVideoAdminPreviewEl) promoVideoAdminPreviewEl.style.display = '';
      if(promoVideoStatusEl) promoVideoStatusEl.textContent = 'No promotion video uploaded yet.';
      return;
    }

    if(useEmbed){
      if(promoVideoPlayerEl){
        try{ promoVideoPlayerEl.pause(); promoVideoPlayerEl.removeAttribute('src'); promoVideoPlayerEl.load(); }catch(e){}
        promoVideoPlayerEl.style.display = 'none';
      }
      if(promoVideoPlayerEmbedEl){
        promoVideoPlayerEmbedEl.src = ytEmbedUrl;
        promoVideoPlayerEmbedEl.style.display = 'block';
      }

      if(promoVideoAdminPreviewEl){
        try{ promoVideoAdminPreviewEl.pause(); promoVideoAdminPreviewEl.removeAttribute('src'); promoVideoAdminPreviewEl.load(); }catch(e){}
        promoVideoAdminPreviewEl.style.display = 'none';
      }
      if(promoVideoAdminEmbedEl){
        promoVideoAdminEmbedEl.src = ytEmbedUrl;
        promoVideoAdminEmbedEl.style.display = 'block';
      }

      if(promoVideoStatusEl) promoVideoStatusEl.textContent = 'Promotion video is live.';
      return;
    }

    if(promoVideoPlayerEmbedEl){
      promoVideoPlayerEmbedEl.style.display = 'none';
      promoVideoPlayerEmbedEl.removeAttribute('src');
    }
    if(promoVideoPlayerEl) promoVideoPlayerEl.style.display = '';
    if(promoVideoAdminEmbedEl){
      promoVideoAdminEmbedEl.style.display = 'none';
      promoVideoAdminEmbedEl.removeAttribute('src');
    }
    if(promoVideoAdminPreviewEl) promoVideoAdminPreviewEl.style.display = '';

    const ext = (normalizedUrl.split('?')[0].split('.').pop() || '').toLowerCase();
    const typeByExt = {
      mp4: 'video/mp4', webm: 'video/webm', ogg: 'video/ogg', ogv: 'video/ogg',
      mov: 'video/quicktime', m4v: 'video/x-m4v', mpeg: 'video/mpeg', mpg: 'video/mpeg',
      '3gp': 'video/3gpp', '3g2': 'video/3gpp2', avi: 'video/x-msvideo', wmv: 'video/x-ms-wmv', mkv: 'video/x-matroska',
    };
    const guessedType = typeByExt[ext];

    if(promoVideoPlayerEl){
      try{
        promoVideoPlayerEl.autoplay = true;
        promoVideoPlayerEl.controls = false;
        promoVideoPlayerEl.muted = true;
        promoVideoPlayerEl.playsInline = true;
        promoVideoPlayerEl.volume = 0;
        promoVideoPlayerEl.src = normalizedUrl;
        promoVideoPlayerEl.load();
        const playAttempt = promoVideoPlayerEl.play();
        if(playAttempt && typeof playAttempt.catch === 'function'){
          playAttempt.catch(()=>{
            if(promoVideoStatusEl) promoVideoStatusEl.textContent = 'Video is live (muted). Use Unmute to enable audio remotely.';
          });
        }
      }catch(e){}
    }

    if(promoVideoAdminPreviewEl){
      try{
        if(typeof promoVideoAdminPreviewEl.canPlayType === 'function' && guessedType && !promoVideoAdminPreviewEl.canPlayType(guessedType)){
          if(promoVideoStatusEl) promoVideoStatusEl.textContent = `Uploaded, but this browser may not play .${ext} directly. Try MP4 (H.264/AAC) or WebM.`;
        }
        promoVideoAdminPreviewEl.src = normalizedUrl;
        promoVideoAdminPreviewEl.load();
      }catch(e){}
    }

    if(promoVideoStatusEl && isPlayerPromoOnlyView) promoVideoStatusEl.textContent = 'Video is live and started muted on player board.';
    else if(promoVideoStatusEl) promoVideoStatusEl.textContent = 'Promotion video is live (muted autoplay enabled).';
  }

  function controlPromoVideo(action){
    const act = String(action || '').toLowerCase();
    if(!act) return;

    if(promoVideoIsEmbed){
      if(act === 'play'){
        sendYouTubeCommand(promoVideoPlayerEmbedEl, 'mute');
        sendYouTubeCommand(promoVideoPlayerEmbedEl, 'playVideo');
        sendYouTubeCommand(promoVideoAdminEmbedEl, 'mute');
        sendYouTubeCommand(promoVideoAdminEmbedEl, 'playVideo');
      } else if(act === 'pause'){
        sendYouTubeCommand(promoVideoPlayerEmbedEl, 'pauseVideo');
        sendYouTubeCommand(promoVideoAdminEmbedEl, 'pauseVideo');
      } else if(act === 'stop'){
        sendYouTubeCommand(promoVideoPlayerEmbedEl, 'pauseVideo');
        sendYouTubeCommand(promoVideoPlayerEmbedEl, 'seekTo', [0, true]);
        sendYouTubeCommand(promoVideoAdminEmbedEl, 'pauseVideo');
        sendYouTubeCommand(promoVideoAdminEmbedEl, 'seekTo', [0, true]);
      } else if(act === 'volumeup'){
        sendYouTubeCommand(promoVideoPlayerEmbedEl, 'setVolume', [100]);
        sendYouTubeCommand(promoVideoPlayerEmbedEl, 'unMute');
        sendYouTubeCommand(promoVideoAdminEmbedEl, 'setVolume', [100]);
        sendYouTubeCommand(promoVideoAdminEmbedEl, 'unMute');
      } else if(act === 'volumedown'){
        sendYouTubeCommand(promoVideoPlayerEmbedEl, 'setVolume', [30]);
        sendYouTubeCommand(promoVideoPlayerEmbedEl, 'unMute');
        sendYouTubeCommand(promoVideoAdminEmbedEl, 'setVolume', [30]);
        sendYouTubeCommand(promoVideoAdminEmbedEl, 'unMute');
      } else if(act === 'mute'){
        sendYouTubeCommand(promoVideoPlayerEmbedEl, 'mute');
        sendYouTubeCommand(promoVideoAdminEmbedEl, 'mute');
      } else if(act === 'unmute'){
        sendYouTubeCommand(promoVideoPlayerEmbedEl, 'unMute');
        sendYouTubeCommand(promoVideoPlayerEmbedEl, 'setVolume', [100]);
        sendYouTubeCommand(promoVideoAdminEmbedEl, 'unMute');
        sendYouTubeCommand(promoVideoAdminEmbedEl, 'setVolume', [100]);
      } else if(act === 'autoplaywithsound'){
        sendYouTubeCommand(promoVideoPlayerEmbedEl, 'mute');
        sendYouTubeCommand(promoVideoPlayerEmbedEl, 'setVolume', [100]);
        sendYouTubeCommand(promoVideoPlayerEmbedEl, 'playVideo');
        sendYouTubeCommand(promoVideoAdminEmbedEl, 'mute');
        sendYouTubeCommand(promoVideoAdminEmbedEl, 'setVolume', [100]);
        sendYouTubeCommand(promoVideoAdminEmbedEl, 'playVideo');
      }
      if(promoVideoStatusEl){
        if(act === 'play') promoVideoStatusEl.textContent = 'Promotion video playing (muted).';
        if(act === 'pause') promoVideoStatusEl.textContent = 'Promotion video paused.';
        if(act === 'stop') promoVideoStatusEl.textContent = 'Promotion video stopped.';
        if(act === 'volumeup') promoVideoStatusEl.textContent = 'Promotion video volume: high.';
        if(act === 'volumedown') promoVideoStatusEl.textContent = 'Promotion video volume: low.';
        if(act === 'mute') promoVideoStatusEl.textContent = 'Promotion video muted.';
        if(act === 'unmute') promoVideoStatusEl.textContent = 'Promotion video unmuted.';
        if(act === 'autoplaywithsound') promoVideoStatusEl.textContent = 'Promotion video auto-started muted. Use Unmute to enable audio.';
      }
      return;
    }

    if(promoVideoPlayerEl){
      try{
        if(act === 'play'){
          promoVideoPlayerEl.muted = true;
          if(promoVideoPlayerEl.volume <= 0.01) promoVideoPlayerEl.volume = 0;
          const p = promoVideoPlayerEl.play();
          if(p && typeof p.catch === 'function'){
            p.catch(()=>{
              if(promoVideoStatusEl) promoVideoStatusEl.textContent = 'Play requested (muted). Use Unmute to enable audio remotely.';
            });
          }
        } else if(act === 'pause'){
          promoVideoPlayerEl.pause();
        } else if(act === 'stop'){
          promoVideoPlayerEl.pause();
          try{ promoVideoPlayerEl.currentTime = 0; }catch(e){}
        } else if(act === 'volumeup'){
          promoVideoPlayerEl.muted = false;
          promoVideoPlayerEl.volume = 1;
        } else if(act === 'volumedown'){
          promoVideoPlayerEl.muted = false;
          promoVideoPlayerEl.volume = 0.3;
        } else if(act === 'mute'){
          promoVideoPlayerEl.muted = true;
        } else if(act === 'unmute'){
          promoVideoPlayerEl.muted = false;
          if(promoVideoPlayerEl.volume <= 0.01) promoVideoPlayerEl.volume = 1;
        } else if(act === 'autoplaywithsound'){
          promoVideoPlayerEl.muted = true;
          promoVideoPlayerEl.volume = 1;
          const p = promoVideoPlayerEl.play();
          if(p && typeof p.catch === 'function') p.catch(()=>{});
        }
      }catch(e){}
    }

    if(promoVideoAdminPreviewEl){
      try{
        if(act === 'play'){
          promoVideoAdminPreviewEl.muted = false;
          if(promoVideoAdminPreviewEl.volume <= 0.01) promoVideoAdminPreviewEl.volume = 1;
          const p = promoVideoAdminPreviewEl.play();
          if(p && typeof p.catch === 'function') p.catch(()=>{});
        } else if(act === 'pause'){
          promoVideoAdminPreviewEl.pause();
        } else if(act === 'stop'){
          promoVideoAdminPreviewEl.pause();
          try{ promoVideoAdminPreviewEl.currentTime = 0; }catch(e){}
        } else if(act === 'volumeup'){
          promoVideoAdminPreviewEl.muted = false;
          promoVideoAdminPreviewEl.volume = 1;
        } else if(act === 'volumedown'){
          promoVideoAdminPreviewEl.muted = false;
          promoVideoAdminPreviewEl.volume = 0.3;
        } else if(act === 'mute'){
          promoVideoAdminPreviewEl.muted = true;
        } else if(act === 'unmute'){
          promoVideoAdminPreviewEl.muted = false;
          if(promoVideoAdminPreviewEl.volume <= 0.01) promoVideoAdminPreviewEl.volume = 1;
        } else if(act === 'autoplaywithsound'){
          promoVideoAdminPreviewEl.muted = true;
          promoVideoAdminPreviewEl.volume = 1;
          const p = promoVideoAdminPreviewEl.play();
          if(p && typeof p.catch === 'function') p.catch(()=>{});
        }
      }catch(e){}
    }

    if(promoVideoStatusEl){
      if(act === 'play') promoVideoStatusEl.textContent = 'Promotion video playing (muted).';
      if(act === 'pause') promoVideoStatusEl.textContent = 'Promotion video paused.';
      if(act === 'stop') promoVideoStatusEl.textContent = 'Promotion video stopped.';
      if(act === 'volumeup') promoVideoStatusEl.textContent = 'Promotion video volume: high.';
      if(act === 'volumedown') promoVideoStatusEl.textContent = 'Promotion video volume: low.';
      if(act === 'mute') promoVideoStatusEl.textContent = 'Promotion video muted.';
      if(act === 'unmute') promoVideoStatusEl.textContent = 'Promotion video unmuted.';
      if(act === 'autoplaywithsound') promoVideoStatusEl.textContent = 'Promotion video auto-started muted. Use Unmute to enable audio.';
    }
  }

  function applyPromoImage(url){
    const normalizedUrl = url ? normalizeSharedImageUrl(url) : '';
    promoImageUrl = normalizedUrl || null;

    if(promoImageAdminPreviewEl){
      if(normalizedUrl) promoImageAdminPreviewEl.src = normalizedUrl;
      else promoImageAdminPreviewEl.src = DEFAULT_PROMO_IMAGE_PREVIEW_SRC;
    }

    if(promoImageStatusEl){
      promoImageStatusEl.textContent = normalizedUrl ? 'Promotion image is live for dashboard slot 2.' : 'No promotion image uploaded yet.';
    }
  }

  if(promoImageAdminPreviewEl && !promoImageAdminPreviewEl.getAttribute('src')){
    promoImageAdminPreviewEl.src = DEFAULT_PROMO_IMAGE_PREVIEW_SRC;
  }

  if(promoVideoPlayerEl && isPlayerPromoOnlyView){
    promoVideoPlayerEl.autoplay = true;
    promoVideoPlayerEl.controls = false;
    promoVideoPlayerEl.muted = true;
    promoVideoPlayerEl.playsInline = true;
    promoVideoPlayerEl.volume = 0;

    const unlockPlayerAudio = ()=>{
      try{
        if(!promoVideoPlayerEl || !promoVideoPlayerEl.src) return;
        promoVideoPlayerEl.muted = true;
        promoVideoPlayerEl.volume = 0;
        const p = promoVideoPlayerEl.play();
        if(p && typeof p.catch === 'function') p.catch(()=>{});
      }catch(e){}
    };
    window.addEventListener('pointerdown', unlockPlayerAudio, { passive: true });
    window.addEventListener('keydown', unlockPlayerAudio);
  }


  function showOnly(sectionId){
    const sections = document.querySelectorAll('.level-section');
    sections.forEach(section=>{
      const isTarget = section.id === sectionId;
      section.classList.toggle('hidden', !isTarget);
    });
  }

  // --- Level 5: Word Search Integration ---
  // Word search config and implementation following provided algorithm
  const WORDSEARCH_WORDS = [
    'ETHIOPIA', 'ADDIS', 'COFFEE', 'NILE', 'LION', 'AFRICA', 'UNITY', 'BLUE', 'ABYSSINIA', 'HIGHLAND',
    'LALIBELA', 'AXUM', 'HARAR', 'DANAKIL', 'SIMIEN', 'ENSET', 'INJERA', 'TEFF', 'WALIA', 'SHEBA'
  ];
  const WORDSEARCH_DEFAULT_SIZE = 10;
  const WORDSEARCH_MAX_ATTEMPTS = 100;
  let wordSearchState = null;
  let wordSearchPlaced = [];
  let wordSearchEnabled = true;

  // Difficulty -> allowed directions
  const DIRECTIONS_BY_DIFFICULTY = {
    easy: [ {r:0,c:1}, {r:1,c:0} ], // horizontal, vertical
    medium: [ {r:0,c:1}, {r:1,c:0}, {r:1,c:1}, {r:-1,c:1} ], // add diagonals and up-right
    hard: [ {r:0,c:1}, {r:1,c:0}, {r:1,c:1}, {r:-1,c:1}, {r:0,c:-1}, {r:-1,c:0}, {r:-1,c:-1}, {r:1,c:-1} ] // all directions
  };

  function randomWordSearchWords(n, pool = WORDSEARCH_WORDS) {
    const arr = pool.slice();
    shuffleArray(arr);
    return arr.slice(0, n);
  }

  function makeEmptyGrid(size) {
    return Array.from({length: size}, () => Array(size).fill(null));
  }

  function canPlace(word, row, col, dir, grid) {
    const size = grid.length;
    for (let i = 0; i < word.length; i++) {
      const r = row + dir.r * i;
      const c = col + dir.c * i;
      if (r < 0 || c < 0 || r >= size || c >= size) return false;
      const cell = grid[r][c];
      if (cell !== null && cell !== word[i]) return false;
    }
    return true;
  }

  function placeWord(word, row, col, dir, grid) {
    for (let i = 0; i < word.length; i++) {
      const r = row + dir.r * i;
      const c = col + dir.c * i;
      grid[r][c] = word[i];
    }
    wordSearchPlaced.push({ word, startRow: row, startCol: col, direction: dir });
  }

  function placeAllWords(grid, words, directions, maxAttempts = WORDSEARCH_MAX_ATTEMPTS) {
    wordSearchPlaced = [];
    for (const word of words) {
      let placed = false;
      let attempt = 0;
      while (!placed && attempt < maxAttempts) {
        const dir = directions[Math.floor(Math.random() * directions.length)];
        const row = Math.floor(Math.random() * grid.length);
        const col = Math.floor(Math.random() * grid.length);
        if (canPlace(word, row, col, dir, grid)) {
          placeWord(word, row, col, dir, grid);
          placed = true;
        }
        attempt++;
      }
      if (!placed) console.warn('Could not place word:', word);
    }
  }

  function fillGridRandom(grid) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (!grid[r][c]) grid[r][c] = letters[Math.floor(Math.random() * letters.length)];
      }
    }
  }

  // Render into team-specific container (A or B) based on cfg.team
  function renderWordSearchPuzzle(state) {
    const teamSuffix = cfg.team ? String(cfg.team).toUpperCase() : 'A';
    const containerId = `wordSearchGame${teamSuffix}`;
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    const grid = state.grid;
    const found = state.found;
    // build a quick map of found cell -> {word,color}
    const cellFoundMap = new Map();
    if(state.foundCellsByWord){
      Object.keys(state.foundCellsByWord).forEach(w=>{
        const cellsArr = state.foundCellsByWord[w] || [];
        const color = (state.colorsByWord && state.colorsByWord[w]) || null;
        cellsArr.forEach(([rr,cc])=> cellFoundMap.set(`${rr},${cc}`, { word: w, color }));
      });
    }

    const table = document.createElement('table');
    table.className = 'wordsearch-grid';
    for (let r = 0; r < grid.length; r++) {
      const tr = document.createElement('tr');
      for (let c = 0; c < grid[r].length; c++) {
        const td = document.createElement('td');
        td.textContent = grid[r][c];
        td.dataset.row = r;
        td.dataset.col = c;
        td.className = 'wordsearch-cell';
        // selectedTiles is an ordered array of [r,c] clicks (click or drag)
        const selArr = Array.isArray(state.selectedTiles) ? state.selectedTiles : (Array.isArray(state.selected) ? state.selected : null);
        if (selArr && selArr.some(([rr,cc])=>rr===r&&cc===c)) td.classList.add('selected');
        // apply per-word found coloring if present
        const foundInfo = cellFoundMap.get(`${r},${c}`);
        if(foundInfo){
          td.classList.add('found');
            if(foundInfo.color){ td.style.backgroundColor = foundInfo.color; td.style.borderColor = foundInfo.color; td.style.color = '#08131a'; }
            td.style.fontSize = '14px';
          td.dataset.foundWord = foundInfo.word;
        }
        // allow click toggling unless part of found word
        td.addEventListener('click', e => {
          // if this cell is already found, ignore clicks
          if(cellFoundMap.has(`${r},${c}`)) return;
          toggleSelection(r,c);
        });
        // pointer events for drag selection preserved
        td.addEventListener('pointerdown', e => startSelect(r, c));
        td.addEventListener('pointerenter', e => dragSelect(r, c, e));
        td.addEventListener('pointerup', endSelect);
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    // Build word-search layout
    const wrapper = document.createElement('div');
    wrapper.className = 'wordsearch-wrapper';

    const leftCol = document.createElement('div');
    leftCol.className = 'wordsearch-left';
    leftCol.appendChild(table);

    const rightCol = document.createElement('div');
    rightCol.className = 'wordsearch-right';

    // Word list
    const wordList = document.createElement('ul');
    wordList.className = 'wordsearch-list';
    for (const w of state.words) {
      const li = document.createElement('li');
      const pill = document.createElement('span');
      pill.className = 'word-pill';
      pill.textContent = w;
      if(state.colorsByWord && state.colorsByWord[w]) pill.style.backgroundColor = state.colorsByWord[w];
      pill.style.color = '#fff';
      pill.style.marginRight = '8px';
      li.appendChild(pill);
      // Removed duplicate text node: only show pill, not pill + text
      if (found.has(w)) li.className = 'found';
      wordList.appendChild(li);
    }

    // Status
    const status = document.createElement('div');
    status.className = 'wordsearch-status';
    status.textContent = `Words-found: ${found.size} / ${state.words.length}`;

    // Controls: Undo last selection, Reset selections
    // Only show controls if not in spectator/dashboard mode.
    const isAudienceView = Boolean(isSpectator) || String(window.location.search || '').includes('view=1') || window.self !== window.top;
    let showControls = !isAudienceView;
    let controls = null;
    if (showControls) {
      controls = document.createElement('div');
      controls.style.marginTop = '8px';
      const undoBtn = document.createElement('button');
      undoBtn.type = 'button';
      undoBtn.textContent = 'Undo Last';
      undoBtn.addEventListener('click', ()=>{ undoLastSelection(); renderWordSearchPuzzle(wordSearchState); });
      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.style.marginLeft = '8px';
      clearBtn.textContent = 'Clear Selection';
      clearBtn.addEventListener('click', ()=>{ clearSelection(); renderWordSearchPuzzle(wordSearchState); });
      //controls.appendChild(undoBtn);
      //controls.appendChild(clearBtn);
    }

    if(isAudienceView){
      // In dashboard/audience view, place words below the grid so they are always visible.
      leftCol.classList.add('wordsearch-underboard');
      leftCol.appendChild(wordList);
      leftCol.appendChild(status);
      wrapper.appendChild(leftCol);
    }else{
      rightCol.appendChild(wordList);
      rightCol.appendChild(status);
      if (controls) rightCol.appendChild(controls);
      wrapper.appendChild(leftCol);
      wrapper.appendChild(rightCol);
    }
    container.appendChild(wrapper);
    try{ saveGameSession(); }catch(e){}
  }

  function getLineCells(r1, c1, r2, c2) {
    const cells = [];
    const dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1);
    const len = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1));
    for (let i = 0; i <= len; i++) {
      cells.push([r1 + dr * i, c1 + dc * i]);
    }
    return cells;
  }

  // Selection helpers (click mode)
  function coordKey(r,c){ return `${r},${c}`; }
  function isContiguousLine(cells){
    if(!Array.isArray(cells) || cells.length < 2) return false;
    const [r1,c1] = cells[0];
    const [r2,c2] = cells[cells.length-1];
    const dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1);
    const expected = getLineCells(r1,c1,r2,c2);
    if(expected.length !== cells.length) return false;
    for(let i=0;i<cells.length;i++){
      if(cells[i][0] !== expected[i][0] || cells[i][1] !== expected[i][1]) return false;
    }
    return true;
  }

  function toggleSelection(r,c){
    if(!wordSearchState) return;
    if(typeof wordSearchEnabled === 'boolean' && !wordSearchEnabled) return;
    if(!Array.isArray(wordSearchState.selectedTiles)) wordSearchState.selectedTiles = [];
    const idx = wordSearchState.selectedTiles.findIndex(([rr,cc])=>rr===r&&cc===c);
    // if already found earlier, ignore (check foundCellsByWord)
    if(wordSearchState.found && wordSearchState.foundCellsByWord){
      const anyFound = Object.values(wordSearchState.foundCellsByWord).some(arr=> arr.some(([fr,fc])=> fr===r && fc===c));
      if(anyFound) return;
    }
    if(idx >= 0){
      // remove selection
      wordSearchState.selectedTiles.splice(idx,1);
    } else {
      wordSearchState.selectedTiles.push([r,c]);
    }
    // attempt auto-validate if selection forms contiguous line
    if(wordSearchState.selectedTiles.length >= 2 && isContiguousLine(wordSearchState.selectedTiles)){
      validateSelectedTiles();
    }
    renderWordSearchPuzzle(wordSearchState);
  }

  function undoLastSelection(){
    if(!wordSearchState || !Array.isArray(wordSearchState.selectedTiles)) return;
    wordSearchState.selectedTiles.pop();
  }

  function clearSelection(){
    if(!wordSearchState) return;
    wordSearchState.selectedTiles = [];
  }

  function validateSelectedTiles(){
    if(!wordSearchState || !Array.isArray(wordSearchState.selectedTiles)) return;
    const cells = wordSearchState.selectedTiles.slice();
    if(cells.length < 2) return;
    if(!isContiguousLine(cells)) return;
    const word = cells.map(([r,c])=>wordSearchState.grid[r][c]).join('');
    const rev = word.split('').reverse().join('');
    const ws = wordSearchState.wordSet || new Set(wordSearchState.words);
    let matched = null;
    if(ws.has(word) && !wordSearchState.found.has(word)) matched = word;
    else if(ws.has(rev) && !wordSearchState.found.has(rev)) matched = rev;
    if(matched){
      wordSearchState.found.add(matched);
      if(!wordSearchState.foundCellsByWord) wordSearchState.foundCellsByWord = {};
      wordSearchState.foundCellsByWord[matched] = (wordSearchState.foundCellsByWord[matched]||[]).concat(cells);
      // prevent unselecting found tiles
      wordSearchState.selectedTiles = wordSearchState.selectedTiles.filter(([r,c])=> !Object.values(wordSearchState.foundCellsByWord).some(arr=> arr.some(([fr,fc])=> fr===r && fc===c)));
      // update score UI (30 points per found word)
      if(puzzleScoreEl) puzzleScoreEl.textContent = `Score: ${wordSearchState.found.size * 30}`;
      if(puzzleCompletionEl) puzzleCompletionEl.textContent = `Completion: ${Math.round((wordSearchState.found.size / wordSearchState.words.length) * 100)}%`;
      // check completion
      if(wordSearchState.found.size === wordSearchState.words.length){
        finished = true;
        recordScoreAndAdvance('complete');
      }
    }
  }

  function startSelect(r, c) {
    if (!wordSearchState || wordSearchState.found.size === wordSearchState.words.length) return;
    if(typeof wordSearchEnabled === 'boolean' && !wordSearchEnabled) return;
    wordSearchState.selecting = true;
    wordSearchState.startCell = [r, c];
    if(!Array.isArray(wordSearchState.selectedTiles)) wordSearchState.selectedTiles = [];
    wordSearchState.selectedTiles = [[r, c]];
    // keep backward-compatible property cleared
    wordSearchState.selected = null;
    renderWordSearchPuzzle(wordSearchState);
    // add document-level pointermove to support dragging across cells (touch & mouse)
    document.addEventListener('pointermove', pointerMoveHandler);
    document.addEventListener('pointerup', endSelect, { once: true });
  }
  function dragSelect(r, c, e) {
    if (!wordSearchState || !wordSearchState.selecting || !wordSearchState.startCell) return;
    if(typeof wordSearchEnabled === 'boolean' && !wordSearchEnabled) return;
    const [r0, c0] = wordSearchState.startCell;
    // normalize to straight/diagonal line
    const dr = Math.sign(r - r0), dc = Math.sign(c - c0);
    if (dr === 0 && dc === 0) return;
    const line = getLineCells(r0, c0, r, c);
    if(!Array.isArray(wordSearchState.selectedTiles)) wordSearchState.selectedTiles = [];
    wordSearchState.selectedTiles = line;
    // keep backward-compatible property cleared
    wordSearchState.selected = null;
    renderWordSearchPuzzle(wordSearchState);
  }
  function endSelect() {
    if (!wordSearchState || !wordSearchState.selecting) return;
    // remove document pointermove handler
    try{ document.removeEventListener('pointermove', pointerMoveHandler); }catch(e){}
    const cells = Array.isArray(wordSearchState.selectedTiles) ? wordSearchState.selectedTiles.slice() : [];
    if(!cells.length){ wordSearchState.selecting = false; wordSearchState.startCell = null; wordSearchState.selectedTiles = []; return; }
    const word = cells.map(([r,c])=>wordSearchState.grid[r][c]).join('');
    const revWord = word.split('').reverse().join('');
    let foundWord = null;
    const wordSet = wordSearchState.wordSet || new Set(wordSearchState.words);
    if (wordSet.has(word) && !wordSearchState.found.has(word)) foundWord = word;
    else if (wordSet.has(revWord) && !wordSearchState.found.has(revWord)) foundWord = revWord;
    if (foundWord) {
      wordSearchState.found.add(foundWord);
      if (!wordSearchState.foundCellsByWord) wordSearchState.foundCellsByWord = {};
      wordSearchState.foundCellsByWord[foundWord] = (wordSearchState.foundCellsByWord[foundWord] || []).concat(cells);
    }
    wordSearchState.selecting = false;
    wordSearchState.startCell = null;
    wordSearchState.selectedTiles = [];
    // clear backward-compatible property
    wordSearchState.selected = null;
    renderWordSearchPuzzle(wordSearchState);
    // Update scoring and completion
    if (wordSearchState.found.size === wordSearchState.words.length) {
      finished = true;
      const score = wordSearchState.words.length * 30;
      if (puzzleScoreEl) puzzleScoreEl.textContent = `Score: ${score}`;
      if (puzzleCompletionEl) puzzleCompletionEl.textContent = 'Completion: 100%';
      // update left scoreboard cell immediately
      try{
        const aEl = document.getElementById('scoreA5');
        const bEl = document.getElementById('scoreB5');
        if(cfg.team === 'A'){ if(aEl) aEl.textContent = String(score); }
        else if(cfg.team === 'B'){ if(bEl) bEl.textContent = String(score); }
        computeAndSetTotals();
      }catch(e){}
      recordScoreAndAdvance('complete');
    } else {
      if (puzzleScoreEl) puzzleScoreEl.textContent = `Score: ${wordSearchState.found.size * 30}`;
      if (puzzleCompletionEl) puzzleCompletionEl.textContent = `Completion: ${Math.round((wordSearchState.found.size / wordSearchState.words.length) * 100)}%`;
    }
  }

  function pointerMoveHandler(e){
    if(!wordSearchState || !wordSearchState.selecting) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if(!el) return;
    const rr = el.dataset && el.dataset.row != null ? Number(el.dataset.row) : null;
    const cc = el.dataset && el.dataset.col != null ? Number(el.dataset.col) : null;
    if(typeof rr === 'number' && typeof cc === 'number' && Number.isFinite(rr) && Number.isFinite(cc)){
      dragSelect(rr, cc, e);
    }
  }

  // cfgLevel may specify: { level:5, mode:'wordsearch', size, words, difficulty }
  function setupWordSearchLevel(cfgLevel) {
    cfgLevel = cfgLevel || {};
    if (puzzleSection) puzzleSection.classList.add('hidden');
    if (wordLevelSection) wordLevelSection.classList.add('hidden');
    if (pipeLevelSection) pipeLevelSection.classList.add('hidden');
    if (connectLevelSection) connectLevelSection.classList.add('hidden');
    if (wordSearchSection) wordSearchSection.classList.remove('hidden');
    setCurrentMode('wordsearch');
    const size = Math.max(6, Math.min(18, Number(cfgLevel.size) || WORDSEARCH_DEFAULT_SIZE));
    const difficulty = (cfgLevel.difficulty || 'medium').toLowerCase();
    const pool = Array.isArray(cfgLevel.words) && cfgLevel.words.length ? cfgLevel.words.map(w=>String(w).toUpperCase()) : WORDSEARCH_WORDS;
    const count = Math.max(3, Math.min(12, Number(cfgLevel.count) || 6));
    const words = Array.isArray(cfgLevel.words) && cfgLevel.words.length ? cfgLevel.words.map(w=>String(w).toUpperCase()).slice(0,count) : randomWordSearchWords(count, pool);
    const grid = makeEmptyGrid(size);
    const directions = DIRECTIONS_BY_DIFFICULTY[difficulty] || DIRECTIONS_BY_DIFFICULTY.medium;
    placeAllWords(grid, words, directions, WORDSEARCH_MAX_ATTEMPTS);
    fillGridRandom(grid);
    // assign distinct colors to each word for visual clarity
    const colorPalette = ['#ef4444','#fb923c','#f59e0b','#84cc16','#22c55e','#06b6d4','#0ea5e9','#7c3aed','#a78bfa','#f472b6','#60a5fa','#f43f5e'];
    const colorsByWord = {};
    words.forEach((w,i)=> colorsByWord[w] = colorPalette[i % colorPalette.length]);

    wordSearchState = {
      grid,
      words,
      found: new Set(),
      foundCellsByWord: {},
      colorsByWord,
      selecting: false,
      startCell: null,
      selected: null,
      selectedTiles: [],
      wordSet: new Set(words)
    };
    // initialize and display timer for this level
    try{
      const tl = Number(cfgLevel.timeLimit) || Number(cfg.timeLimit) || Number(timeLimit) || 120;
      timeLimit = Math.max(5, Math.floor(tl));
      remaining = timeLimit;
      updateTimerDisplays(remaining, timeLimit);
      // if not started, visually mask board like other levels
      if(!started) setCountdownVisualMask(true);
    }catch(e){}

    renderWordSearchPuzzle(wordSearchState);
    if (puzzleScoreEl) puzzleScoreEl.textContent = 'Score: 0';
    if (puzzleCompletionEl) puzzleCompletionEl.textContent = 'Completion: 0%';
  }


  // Consolidated showLevelMode: handle all modes including 'wordsearch'
  function showLevelMode(mode){
    // hide all level sections first
    const showPuzzle = mode === 'puzzle' || mode === 'memory';
    const showWord = mode === 'word';
    const showPipe = mode === 'pipe';
    const showWordSearch = mode === 'wordsearch';
    const showConnect = mode === 'connect';

    if(puzzleSection) puzzleSection.classList.toggle('hidden', !showPuzzle);
    if(wordLevelSection) wordLevelSection.classList.toggle('hidden', !showWord);
    if(pipeLevelSection) pipeLevelSection.classList.toggle('hidden', !showPipe);
    if(wordSearchSection) wordSearchSection.classList.toggle('hidden', !showWordSearch);
    if(connectLevelSection) connectLevelSection.classList.toggle('hidden', !showConnect);

    // manage holdShowBtn visibility
    if(holdShowBtn) holdShowBtn.classList.toggle('hidden', showWord || showPipe || showConnect || mode === 'memory');

    if(mode !== 'puzzle'){
      solvedPreviewActive = false;
      solvedPreviewSnapshot = null;
    }

    // manage main board visibility
    if(board){
      const hideBoard = showWord || showPipe || showWordSearch || showConnect;
      board.classList.toggle('hidden', hideBoard);
      board.classList.toggle('word-hidden', hideBoard);
      if(hideBoard){
        if(!board.dataset.prevDisplay) board.dataset.prevDisplay = board.style.display || '';
        board.style.display = 'none';
        board.style.visibility = 'hidden';
        board.style.pointerEvents = 'none';
        board.style.width = '0px';
        board.style.height = '0px';
        board.innerHTML = '';
      } else {
        board.style.display = board.dataset.prevDisplay || '';
        board.style.visibility = '';
        board.style.pointerEvents = '';
        board.style.width = 'var(--board-size)';
        board.style.height = 'var(--board-size)';
        delete board.dataset.prevDisplay;
      }
    }

    // trigger render for wordsearch if showing
    if(showWordSearch && typeof renderWordSearchPuzzle === 'function' && wordSearchState) renderWordSearchPuzzle(wordSearchState);
    if(showConnect && typeof renderConnectBoard === 'function') renderConnectBoard();
  }

  function resetWordUI(){
    if(wordSection){
      showLevelMode('puzzle');
    }
    if(wordLetterEl) wordLetterEl.textContent = '—';
    if(wordCategoriesEl) wordCategoriesEl.innerHTML = '';
    if(wordStatusEl) wordStatusEl.textContent = '';
    if(submitWordsBtn) submitWordsBtn.disabled = false;
  }

  function resetPipeUI(){
    if(pipeSection){
      showLevelMode('puzzle');
    }
    if(pipeGridEl) pipeGridEl.innerHTML = '';
    if(pipeStatusEl) pipeStatusEl.textContent = '';
    if(pipeScoreEl) pipeScoreEl.textContent = 'Score: 0';
    if(pipeCompletionEl) pipeCompletionEl.textContent = 'Completion: 0%';
  }

  function enableWordInputs(){
    if(levelMode !== 'word') return;
    if(!wordSection) return;
    const inputs = wordSection.querySelectorAll('input.word-input');
    inputs.forEach(i => {
      i.disabled = false;
      // Attach input event for instant validation
      i.removeEventListener('input', validateWordSubmission); // Prevent duplicate
      i.addEventListener('input', validateWordSubmission);
      // Debug: log event attachment
      console.debug('[WordGame] Input event attached for', i);
    });
    if(submitWordsBtn) submitWordsBtn.disabled = false;
  }

  function disableWordInputs(){
    if(!wordSection) return;
    const inputs = wordSection.querySelectorAll('input.word-input');
    inputs.forEach(i=> i.disabled = true);
    if(submitWordsBtn) submitWordsBtn.disabled = true;
  }

  function enablePipeInputs(){
    if(levelMode !== 'pipe' || !pipeGridEl) return;
    const tiles = pipeGridEl.querySelectorAll('button.pipe-tile');
    tiles.forEach(btn=>{
      if(btn.classList.contains('empty')) btn.disabled = true;
      else btn.disabled = false;
    });
  }

  function disablePipeInputs(){
    if(!pipeGridEl) return;
    const tiles = pipeGridEl.querySelectorAll('button.pipe-tile');
    tiles.forEach(btn=>{ btn.disabled = true; });
  }

  function resetConnectUI(){
    if(connectSection){
      showLevelMode('puzzle');
    }
    if(connectStatusEl) connectStatusEl.textContent = '';
    if(connectScoreEl) connectScoreEl.textContent = 'Score: 0';
    if(connectCompletionEl) connectCompletionEl.textContent = 'Completion: 0%';
  }

  function enableConnectInputs(){
    if(levelMode !== 'connect') return;
    if(!connectState) return;
    connectState.enabled = true;
  }

  function disableConnectInputs(){
    if(!connectState) return;
    connectState.enabled = false;
    connectState.activePath = null;
    if(typeof renderConnectBoard === 'function') renderConnectBoard();
  }

  function randomLetter(){
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return letters[Math.floor(Math.random() * letters.length)];
  }

  function setupWordLevel(cfgLevel){
    setCurrentMode('word');
    setCurrentLevel(Number(cfgLevel.level) || 3);
    scoreRecorded = false;
    finished = false;
    const letter = (cfgLevel.letter || randomLetter()).toUpperCase();
    const categories = Array.isArray(cfgLevel.categories) && cfgLevel.categories.length ? cfgLevel.categories : WORD_CATEGORIES.slice();
    wordState = { letter, categories, answers: {}, correctCount: 0, total: categories.length };
    countdownMaskedLetter = letter;
    setWordLetterVisible(Boolean(started));
    if(wordCategoriesEl){
      wordCategoriesEl.innerHTML = '';
      categories.forEach((cat, idx)=>{
        const row = document.createElement('div');
        row.className = 'category-row';
        const label = document.createElement('label');
        label.textContent = cat;
        label.setAttribute('for', `word-${idx}`);
        const input = document.createElement('input');
        input.id = `word-${idx}`;
        input.className = 'word-input';
        input.type = 'text';
        input.placeholder = `Starts with ${letter}`;
        input.dataset.category = cat;
        input.addEventListener('input', ()=>{
          input.classList.remove('invalid');
          input.classList.remove('skipped');
          input.classList.remove('valid');
          scheduleWordStateBroadcast('typing');
          validateWordSubmission({ strict: true });
        });
        input.addEventListener('blur', ()=> validateWordSubmission({ strict: true }));
        row.appendChild(label);
        row.appendChild(input);
        wordCategoriesEl.appendChild(row);
      });
    }
    if(wordStatusEl) wordStatusEl.textContent = 'Enter words that start with the letter.';
    if(wordScoreEl) wordScoreEl.textContent = 'Score: 0';
    if(wordCompletionEl) wordCompletionEl.textContent = 'Completion: 0%';
    showLevelMode('word');
    if(isSpectator || !started) disableWordInputs();
    else enableWordInputs();
    if(!isSpectator) sendWordState('setup', true);
    if(pendingWordSnapshot && String(pendingWordSnapshot.letter || '').toUpperCase() === letter){
      applyWordSnapshot(pendingWordSnapshot);
      pendingWordSnapshot = null;
    }
  }

  function generateRandomLetter(){
    const letter = randomLetter();
    setupWordLevel({ mode: 'word', level: 3, letter, categories: WORD_CATEGORIES.slice() });
  }

  function updateTotalScore(team){
    const totalAEl = document.getElementById('totalA');
    const totalBEl = document.getElementById('totalB');
    if(!totalAEl || !totalBEl) return;
    const a = Number(totalAEl.textContent) || 0;
    const b = Number(totalBEl.textContent) || 0;
    if(team === 'A') totalAEl.textContent = String(a);
    if(team === 'B') totalBEl.textContent = String(b);
    updateWinnerFromTotals();
  }

  function submitWords(team, correctAnswersCount){
    const score = (Number(correctAnswersCount) || 0) * 10;
    if(team === 'A' || team === 'B'){
      GAME[team].level3Score = score;
      updateTotalScore(team);
    }
  }

  function startLevel3(){
    setCurrentLevel(3);
    levelMode = 'word';

    // Hide all other levels
    showOnly('wordLevel');

    // Reset word score and completion
    if (wordScoreEl) wordScoreEl.textContent = 'Score: 0';
    if (wordCompletionEl) wordCompletionEl.textContent = 'Completion: 0%';

    // Stop Level 1 timer
    if (interval) {
      clearInterval(interval);
      interval = null;
    }

    generateRandomLetter();
  }

  function updateWordProgress(){
    if(!wordState) return;
    const matched = wordState.correctCount || 0;
    const pairs = wordState.total || 0;
    const pct = pairs > 0 ? Math.round((matched / pairs) * 100) : 0;
    if(wordScoreEl) wordScoreEl.textContent = `Score: ${matched * 10}`;
    if(wordCompletionEl) wordCompletionEl.textContent = `Completion: ${pct}%`;
    if(!isSpectator){
      try{
        const msg = { type: 'progress', payload: { team: cfg.team || 'unknown', matched, pairs, remaining } };
        if(pubWs && pubWs.readyState === WebSocket.OPEN) pubWs.send(JSON.stringify(msg));
      }catch(e){ console.error('word progress send failed', e); }
      sendWordState('progress');
    }
  }

  function normalizeWordCategory(label){
    const l = String(label || '').toLowerCase();
    if(l.includes('country')) return 'countries';
    if(l.includes('food')) return 'foods';
    if(l.includes('drink')) return 'drinks';
    if(l.includes('animal')) return 'animals';
    return '';
  }

  function isValidWordForCategory(raw, categoryLabel, letter){
    const normalized = raw.toUpperCase();
    const startsOk = normalized.startsWith(letter);
    const spellingOk = /^[\p{L}][\p{L}\p{M}\s'’\-]*$/u.test(raw);
    if(!startsOk || !spellingOk) return false;
    const key = normalizeWordCategory(categoryLabel);
    if(key && data[key] && data[key][letter]){
      return compareInput(key, letter, raw) === 1;
    }
    return true;
  }

  function onWordGameComplete() {
    if(finished) {
      console.debug('[WordGame] onWordGameComplete called but already finished');
      return;  // avoid double trigger
    }
    finished = true;
    if (interval) {
      clearInterval(interval); // stop the timer
      interval = null;
      console.debug('[WordGame] Timer stopped by onWordGameComplete');
    } else {
      console.debug('[WordGame] No interval to clear in onWordGameComplete');
    }
    disableMoves();          // disable further clicks
    // Show message on team board
    if (typeof statusEl !== 'undefined' && statusEl) statusEl.textContent = 'Ended';
    // Show message on admin control panel
    try {
      const adminStatus = document.querySelector('.admin-page #statusMessage');
      if (adminStatus) adminStatus.textContent = 'Ended';
    } catch(e) {}
    recordScoreAndAdvance('complete'); // update score & move to next level
}
     
 


 function validateWordSubmission(options = {}){
    if(isSpectator) return;
    if(levelMode !== 'word' || finished || !wordState) return;
    const strict = options && options.strict === true;
    const letter = wordState.letter.toUpperCase();
    const inputs = wordSection ? Array.from(wordSection.querySelectorAll('input.word-input')) : [];
    const seen = new Set();
    let correct = 0;
    let invalidCount = 0;
    const answers = {};
    inputs.forEach(input=>{
      const raw = (input.value || '').trim();
      const categoryLabel = input.dataset.category || input.id || '';
      input.classList.remove('invalid');
      input.classList.remove('skipped');
      input.classList.remove('valid');
      if(!raw){
        input.classList.add('invalid');
        invalidCount += 1;
        return;
      }
      const normalized = raw.toUpperCase();
      if(seen.has(normalized)){
        input.classList.add('invalid');
        invalidCount += 1;
        return;
      }
      if(!isValidWordForCategory(raw, categoryLabel, letter)){
        input.classList.add('invalid');
        invalidCount += 1;
        return;
      }
      seen.add(normalized);
      answers[categoryLabel] = raw;
      input.classList.add('valid');
      correct += 1;
    });

    wordState.answers = answers;
    wordState.correctCount = correct;
    updateWordProgress();
    
    if(invalidCount > 0){
      if(wordStatusEl) wordStatusEl.textContent = `Saved ${correct} correct ${correct === 1 ? 'answer' : 'answers'}. Fix ${invalidCount} invalid ${invalidCount === 1 ? 'answer' : 'answers'}.`;
    } else {
      if(wordStatusEl) wordStatusEl.textContent = correct === wordState.total ? 'All categories completed correctly!' : 'Answers submitted. You can improve before time runs out.';
    }

    sendWordState('submit', true);
  
    if(correct === wordState.total){
      onWordGameComplete();
      sendWordState('completed', true);
    }
  }

  function shuffleInPlace(arr){
    for(let i=arr.length-1;i>0;i--){
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function rotatePipeEdges(edges, rot){
    const r = ((Number(rot) || 0) % 4 + 4) % 4;
    return (Array.isArray(edges) ? edges : []).map(v=> ((Number(v) || 0) + r + 4) % 4).sort((a,b)=> a-b);
  }

  function pipeEdgeKey(edges){
    return rotatePipeEdges(edges, 0).join('|');
  }

  function buildPipeLevelPayload(rows = 5, cols = 5, timeLimitSec = 75){
    const rMax = Math.max(3, Math.min(8, Number(rows) || 5));
    const cMax = Math.max(3, Math.min(8, Number(cols) || 5));
    const path = [];
    let r = 0, c = 0;
    path.push([r,c]);
    while(r < rMax - 1 || c < cMax - 1){
      if(r === rMax - 1) c += 1;
      else if(c === cMax - 1) r += 1;
      else if(Math.random() < 0.5) c += 1;
      else r += 1;
      path.push([r,c]);
    }

    const byPos = new Map(path.map((p, idx)=> [`${p[0]}:${p[1]}`, idx]));
    const fallbackPool = [ [0,1], [1,2], [2,3], [0,3], [0,2], [1,3] ];
    const tiles = [];

    for(let rr=0; rr<rMax; rr++){
      for(let cc=0; cc<cMax; cc++){
        const key = `${rr}:${cc}`;
        const idx = byPos.get(key);
        let base = null;
        let isPath = false;
        let isStart = false;
        let isEnd = false;
        if(typeof idx === 'number'){
          isPath = true;
          isStart = idx === 0;
          isEnd = idx === path.length - 1;
          const dirs = [];
          const prev = idx > 0 ? path[idx - 1] : null;
          const next = idx < path.length - 1 ? path[idx + 1] : null;
          if(prev){
            const dr = prev[0] - rr;
            const dc = prev[1] - cc;
            if(dr === -1) dirs.push(0);
            if(dc === 1) dirs.push(1);
            if(dr === 1) dirs.push(2);
            if(dc === -1) dirs.push(3);
          }
          if(next){
            const dr = next[0] - rr;
            const dc = next[1] - cc;
            if(dr === -1) dirs.push(0);
            if(dc === 1) dirs.push(1);
            if(dr === 1) dirs.push(2);
            if(dc === -1) dirs.push(3);
          }
          base = Array.from(new Set(dirs)).sort((a,b)=> a-b);
        }else{
          base = fallbackPool[Math.floor(Math.random() * fallbackPool.length)].slice();
        }

        let rot = Math.floor(Math.random() * 4);
        if(isPath && pipeEdgeKey(rotatePipeEdges(base, rot)) === pipeEdgeKey(base)) rot = (rot + 1) % 4;
        tiles.push({
          base,
          rot,
          isPath,
          isStart,
          isEnd,
          playable: isPath && !isStart && !isEnd
        });
      }
    }

    return {
      type: 'level',
      mode: 'pipe',
      level: 4,
      rows: rMax,
      cols: cMax,
      timeLimit: Math.max(30, Number(timeLimitSec) || 75),
      tiles,
    };
  }

  function pipeGlyph(edges){
    const k = pipeEdgeKey(edges);
    if(k === '0|2') return '│';
    if(k === '1|3') return '─';
    if(k === '0|1') return '└';
    if(k === '1|2') return '┌';
    if(k === '2|3') return '┐';
    if(k === '0|3') return '┘';
    if(k === '0') return '╵';
    if(k === '1') return '╶';
    if(k === '2') return '╷';
    if(k === '3') return '╴';
    return '•';
  }

  function isPipeTileCorrect(tile){
    if(!tile || !tile.isPath || tile.isStart || tile.isEnd) return false;
    return pipeEdgeKey(rotatePipeEdges(tile.base, tile.rot)) === pipeEdgeKey(tile.base);
  }

  function sendPipeState(reason = 'update', force = false){
    if(levelMode !== 'pipe' || isSpectator || !pipeState) return;
    const rotations = (pipeState.tiles || []).map(t=> Math.max(0, Math.min(3, Number(t.rot) || 0)));
    const sig = JSON.stringify(rotations);
    if(!force && pipeState.lastSig === sig) return;
    pipeState.lastSig = sig;
    try{
      if(pubWs && pubWs.readyState === WebSocket.OPEN){
        pubWs.send(JSON.stringify({
          type: 'pipeState',
          payload: {
            team: cfg.team || 'unknown',
            rows: pipeState.rows,
            cols: pipeState.cols,
            matched: pipeState.matched || 0,
            total: pipeState.totalPath || 0,
            finished: Boolean(finished),
            reason,
            rotations,
          }
        }));
      }
    }catch(e){ console.error('pipeState send failed', e); }
  }

  // Check if the path is fully connected from Start to End
  function isPipePathFullyConnected() {
    if (!pipeState || !pipeState.tiles) return false;
    const { tiles, rows, cols } = pipeState;
    // Find start and end tile indices
    let startIdx = -1, endIdx = -1;
    tiles.forEach((t, i) => {
      if (t.isStart) startIdx = i;
      if (t.isEnd) endIdx = i;
    });
    if (startIdx === -1 || endIdx === -1) return false;
    // BFS from start
    const visited = new Set();
    const queue = [startIdx];
    visited.add(startIdx);
    while (queue.length) {
      const idx = queue.shift();
      const tile = tiles[idx];
      const [r, c] = [Math.floor(idx / cols), idx % cols];
      const edges = rotatePipeEdges(tile.base, tile.rot);
      for (const dir of edges) {
        let nr = r, nc = c, nDir = (dir + 2) % 4;
        if (dir === 0) nr--;
        else if (dir === 1) nc++;
        else if (dir === 2) nr++;
        else if (dir === 3) nc--;
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
        const nIdx = nr * cols + nc;
        const neighbor = tiles[nIdx];
        if (!neighbor || !neighbor.isPath) continue;
        const neighborEdges = rotatePipeEdges(neighbor.base, neighbor.rot);
        if (!neighborEdges.includes(nDir)) continue;
        if (!visited.has(nIdx)) {
          visited.add(nIdx);
          queue.push(nIdx);
        }
      }
    }
    return visited.has(endIdx);
  }

  function updatePipeProgress(){
    if(levelMode !== 'pipe' || !pipeState) return;
    // Only count playable tiles (not start/end)
    const playableTiles = (pipeState.tiles || []).filter(t => t.playable);
    const matched = playableTiles.filter(isPipeTileCorrect).length;
    const total = Math.max(1, playableTiles.length);
    pipeState.matched = matched;
    const pct = Math.round((matched / total) * 100);
    if(pipeScoreEl) pipeScoreEl.textContent = `Score: ${matched * 10}`;
    if(pipeCompletionEl) pipeCompletionEl.textContent = `Completion: ${pct}%`;
    if(!isSpectator){
      try{
        if(pubWs && pubWs.readyState === WebSocket.OPEN){
          pubWs.send(JSON.stringify({ type: 'progress', payload: { team: cfg.team || 'unknown', matched, pairs: total, remaining } }));
        }
      }catch(e){ console.error('pipe progress send failed', e); }
      sendPipeState('progress');
    }
    // Only finish if all path tiles are correct AND path is fully connected
    if(matched === total && isPipePathFullyConnected() && !finished && !isSpectator){
      finished = true;
      disablePipeInputs();
      if(pipeStatusEl) pipeStatusEl.textContent = 'Path connected!';
      sendPipeState('complete', true);
      recordScoreAndAdvance('complete');
    }
  }

  function renderPipeBoard(){
    if(!pipeGridEl || !pipeState) return;
    pipeGridEl.innerHTML = '';
    pipeGridEl.style.gridTemplateColumns = `repeat(${pipeState.cols}, minmax(44px, 1fr))`;
    (pipeState.tiles || []).forEach((tile, idx)=>{
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pipe-tile';
      if(!tile.isPath) btn.classList.add('empty');
      if(tile.isStart) btn.classList.add('start');
      if(tile.isEnd) btn.classList.add('end');
      const edgesNow = rotatePipeEdges(tile.base, tile.rot);
      // Show glyph for all tiles; start/end are styled via CSS markers (no S/E letters).
      btn.textContent = pipeGlyph(edgesNow);
      // Allow S and E tiles to rotate, but keep them visually distinct and not scorable
      if(tile.isStart || tile.isEnd || tile.playable){
        btn.disabled = false;
        btn.addEventListener('click', ()=>{
          if(isSpectator || finished || levelMode !== 'pipe') return;
          if(!pipeState || !pipeState.tiles || !pipeState.tiles[idx]) return;
          const live = pipeState.tiles[idx];
          if(!live.isPath) return;
          live.rot = (Number(live.rot) + 1) % 4;
          renderPipeBoard();
          updatePipeProgress();
          sendPipeState('rotate');
        });
      } else {
        btn.disabled = true;
      }
      pipeGridEl.appendChild(btn);
    });
  }

  function applyPipeSnapshot(snapshot){
    if(!snapshot || !pipeState || !Array.isArray(snapshot.rotations)) return;
    const rotations = snapshot.rotations;
    (pipeState.tiles || []).forEach((tile, idx)=>{
      if(rotations[idx] == null) return;
      tile.rot = Math.max(0, Math.min(3, Number(rotations[idx]) || 0));
    });
    renderPipeBoard();
    updatePipeProgress();
    if(snapshot.finished){
      finished = true;
      disablePipeInputs();
    }
  }

  function setupPipeLevel(cfgLevel){
    setCurrentMode('pipe');
    setCurrentLevel(Number(cfgLevel.level) || 4);
    scoreRecorded = false;
    finished = false;
    started = true;

    const rows = Math.max(3, Math.min(8, Number(cfgLevel.rows) || 5));
    const cols = Math.max(3, Math.min(8, Number(cfgLevel.cols) || 5));
    const tilesRaw = Array.isArray(cfgLevel.tiles) ? cfgLevel.tiles : [];
    const expected = rows * cols;
    const safeTiles = [];
    for(let i=0;i<expected;i++){
      const src = tilesRaw[i] || {};
      const base = Array.isArray(src.base) ? src.base.map(v=> ((Number(v) || 0) % 4 + 4) % 4).slice(0, 2).sort((a,b)=> a-b) : [1,3];
      const isPath = Boolean(src.isPath);
      const isStart = Boolean(src.isStart);
      const isEnd = Boolean(src.isEnd);
      safeTiles.push({
        base,
        rot: Math.max(0, Math.min(3, Number(src.rot) || 0)),
        isPath,
        isStart,
        isEnd,
        playable: isPath && !isStart && !isEnd
      });
    }

    pipeState = {
      rows,
      cols,
      tiles: safeTiles,
      totalPath: safeTiles.filter(t=> t.isPath).length || expected,
      matched: 0,
      lastSig: '',
    };
    showLevelMode('pipe');
    // Always enable inputs for new pipe level
    if(pipeGridEl) {
      const tiles = pipeGridEl.querySelectorAll('button.pipe-tile');
      tiles.forEach(btn=>{ btn.disabled = false; });
    }
    renderPipeBoard();
    updatePipeProgress();

    if(pipeStatusEl) pipeStatusEl.textContent = 'Rotate tiles to connect Start → End.';
    if(isSpectator || !started) disablePipeInputs();
    else enablePipeInputs();

    if(!isSpectator) sendPipeState('setup', true);
    if(pendingPipeSnapshot){
      applyPipeSnapshot(pendingPipeSnapshot);
      pendingPipeSnapshot = null;
    }
  }

  function normalizeConnectPairCount(value){
    const n = Number(value);
    if(!Number.isFinite(n)) return 4;
    return Math.max(2, Math.min(8, Math.floor(n)));
  }

  function randomConnectNodes(pairCount = 4){
    const paletteAll = [
      { key: 'blue', color: '#3f51b5' },
      { key: 'red', color: '#ff1b1b' },
      { key: 'green', color: '#146b1f' },
      { key: 'orange', color: '#f97316' },
      { key: 'purple', color: '#7c3aed' },
      { key: 'teal', color: '#0f766e' },
      { key: 'pink', color: '#db2777' },
      { key: 'amber', color: '#d97706' },
    ];
    const safePairCount = normalizeConnectPairCount(pairCount);
    const palette = paletteAll.slice(0, safePairCount);
    const nodes = [];
    const minDist = 0.20;
    const minPairDist = 0.42;
    const minEdge = 0.12;
    const maxAttempts = 500;
    let attempts = 0;

    function farEnough(x, y){
      return nodes.every((n)=> Math.hypot(n.x - x, n.y - y) >= minDist);
    }

    palette.forEach((entry)=>{
      for(let i=0;i<2;i++){
        let placed = false;
        while(!placed && attempts < maxAttempts){
          attempts += 1;
          const x = minEdge + Math.random() * (1 - minEdge * 2);
          const y = minEdge + Math.random() * (1 - minEdge * 2);
          if(!farEnough(x, y)) continue;
          if(i === 1){
            const mate = nodes.find((n)=> n.id === `${entry.key}1`);
            if(mate && Math.hypot(mate.x - x, mate.y - y) < minPairDist) continue;
          }
          nodes.push({
            id: `${entry.key}${i + 1}`,
            color: entry.color,
            x,
            y,
          });
          placed = true;
        }
        if(!placed){
          // deterministic fallback if random packing fails
          const totalDots = Math.max(2, safePairCount * 2);
          const idx = nodes.length;
          const angle = ((idx / totalDots) * Math.PI * 2) - (Math.PI / 2);
          const ring = 0.34 + ((idx % 2) ? 0.12 : 0);
          const fallback = {
            x: Math.max(0.10, Math.min(0.90, 0.5 + Math.cos(angle) * ring)),
            y: Math.max(0.10, Math.min(0.90, 0.5 + Math.sin(angle) * ring)),
          };
          nodes.push({
            id: `${entry.key}${i + 1}`,
            color: entry.color,
            x: fallback.x,
            y: fallback.y,
          });
        }
      }
    });

    return nodes;
  }

  function defaultConnectLevelPayload(){
    return defaultConnectLevelPayloadWithPairs(4);
  }

  function defaultConnectLevelPayloadWithPairs(pairCount){
    const safePairCount = normalizeConnectPairCount(pairCount);
    return {
      type: 'level',
      mode: 'connect',
      level: 6,
      timeLimit: 75,
      pairCount: safePairCount,
      nodes: randomConnectNodes(safePairCount),
      canvasSize: 520,
    };
  }

  function connectNodeRadiusPx(){
    const canvas = connectCanvasEl;
    if(!canvas) return 24;
    return Math.max(18, Math.round(Math.min(canvas.width, canvas.height) * 0.06));
  }

  function connectPointDist(a, b){
    const dx = Number(a.x) - Number(b.x);
    const dy = Number(a.y) - Number(b.y);
    return Math.hypot(dx, dy);
  }

  function connectNodeToPx(node){
    const canvas = connectCanvasEl;
    if(!canvas || !node) return { x: 0, y: 0 };
    return {
      x: Number(node.x) * canvas.width,
      y: Number(node.y) * canvas.height,
    };
  }

  function canvasPointFromEvent(evt){
    if(!connectCanvasEl) return null;
    const rect = connectCanvasEl.getBoundingClientRect();
    if(!rect || !Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) return null;
    const sx = connectCanvasEl.width / rect.width;
    const sy = connectCanvasEl.height / rect.height;
    return {
      x: (evt.clientX - rect.left) * sx,
      y: (evt.clientY - rect.top) * sy,
    };
  }

  function getConnectNodeById(nodeId){
    if(!connectState || !Array.isArray(connectState.nodes)) return null;
    return connectState.nodes.find(n=> n.id === nodeId) || null;
  }

  function findConnectNodeAt(point, color){
    if(!connectState || !Array.isArray(connectState.nodes) || !point) return null;
    const radius = connectNodeRadiusPx();
    for(const node of connectState.nodes){
      if(color && node.color !== color) continue;
      const nodePx = connectNodeToPx(node);
      if(connectPointDist(point, nodePx) <= radius + 4) return node;
    }
    return null;
  }

  function connectPathToSegments(points){
    const segs = [];
    for(let i=0; i<points.length - 1; i++){
      const p1 = points[i];
      const p2 = points[i + 1];
      if(!p1 || !p2) continue;
      if(connectPointDist(p1, p2) < 0.8) continue;
      segs.push([p1, p2]);
    }
    return segs;
  }

  function orientation(a, b, c){
    const v = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
    if(Math.abs(v) < 1e-6) return 0;
    return v > 0 ? 1 : 2;
  }

  function onSegment(a, b, c){
    return b.x <= Math.max(a.x, c.x) + 1e-6 &&
      b.x + 1e-6 >= Math.min(a.x, c.x) &&
      b.y <= Math.max(a.y, c.y) + 1e-6 &&
      b.y + 1e-6 >= Math.min(a.y, c.y);
  }

  function segmentsIntersect(a1, a2, b1, b2){
    const o1 = orientation(a1, a2, b1);
    const o2 = orientation(a1, a2, b2);
    const o3 = orientation(b1, b2, a1);
    const o4 = orientation(b1, b2, a2);

    if(o1 !== o2 && o3 !== o4) return true;
    if(o1 === 0 && onSegment(a1, b1, a2)) return true;
    if(o2 === 0 && onSegment(a1, b2, a2)) return true;
    if(o3 === 0 && onSegment(b1, a1, b2)) return true;
    if(o4 === 0 && onSegment(b1, a2, b2)) return true;
    return false;
  }

  function distPointToSegment(p, a, b){
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if(Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return connectPointDist(p, a);
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
    const proj = { x: a.x + t * dx, y: a.y + t * dy };
    return connectPointDist(p, proj);
  }

  function pathIntersectsOtherLines(points, ownColor){
    if(!connectState || !connectState.lines) return false;
    const ownSegs = connectPathToSegments(points);
    if(!ownSegs.length) return false;
    const colorKeys = Object.keys(connectState.lines);
    for(const color of colorKeys){
      if(color === ownColor) continue;
      const other = connectState.lines[color];
      if(!Array.isArray(other) || other.length < 2) continue;
      const otherSegs = connectPathToSegments(other);
      for(const [a1, a2] of ownSegs){
        for(const [b1, b2] of otherSegs){
          if(segmentsIntersect(a1, a2, b1, b2)) return true;
        }
      }
    }
    return false;
  }

  function pathTouchesForeignNode(points, ownColor, startId, endId){
    if(!connectState || !Array.isArray(connectState.nodes) || !Array.isArray(points) || points.length < 2) return false;
    const radius = connectNodeRadiusPx();
    const segs = connectPathToSegments(points);
    for(const node of connectState.nodes){
      if(node.id === startId || node.id === endId) continue;
      if(node.color === ownColor) continue;
      const center = connectNodeToPx(node);
      for(const [a, b] of segs){
        if(distPointToSegment(center, a, b) <= radius + 2) return true;
      }
    }
    return false;
  }

  function isColorLineComplete(color){
    if(!connectState || !connectState.lines || !Array.isArray(connectState.nodes)) return false;
    const line = connectState.lines[color];
    if(!Array.isArray(line) || line.length < 2) return false;
    const nodes = connectState.nodes.filter(n=> n.color === color);
    if(nodes.length < 2) return false;
    const pStart = line[0];
    const pEnd = line[line.length - 1];
    const n1 = connectNodeToPx(nodes[0]);
    const n2 = connectNodeToPx(nodes[1]);
    const near = connectNodeRadiusPx() + 6;
    const direct = connectPointDist(pStart, n1) <= near && connectPointDist(pEnd, n2) <= near;
    const reverse = connectPointDist(pStart, n2) <= near && connectPointDist(pEnd, n1) <= near;
    return direct || reverse;
  }

  function connectScoreForMatched(matched){
    return Math.max(0, Number(matched) || 0) * 20;
  }

  function updateConnectProgress(shouldBroadcast = true){
    if(levelMode !== 'connect' || !connectState) return;
    const matched = connectState.colors.filter(c=> isColorLineComplete(c)).length;
    connectState.matched = matched;
    const total = Math.max(1, Number(connectState.totalPairs) || 4);
    const pct = Math.round((matched / total) * 100);
    const score = connectScoreForMatched(matched);
    if(connectScoreEl) connectScoreEl.textContent = `Score: ${score}`;
    if(connectCompletionEl) connectCompletionEl.textContent = `Completion: ${pct}%`;
    if(puzzleScoreEl) puzzleScoreEl.textContent = `Score: ${score}`;
    if(puzzleCompletionEl) puzzleCompletionEl.textContent = `Completion: ${pct}%`;

    if(!isSpectator){
      try{
        const aEl = document.getElementById('scoreA6');
        const bEl = document.getElementById('scoreB6');
        if(cfg.team === 'A'){ if(aEl) aEl.textContent = String(score); }
        if(cfg.team === 'B'){ if(bEl) bEl.textContent = String(score); }
        computeAndSetTotals();
      }catch(e){}
    }

    if(shouldBroadcast && !isSpectator){
      try{
        if(pubWs && pubWs.readyState === WebSocket.OPEN){
          pubWs.send(JSON.stringify({ type: 'progress', payload: { team: cfg.team || 'unknown', matched, pairs: total, remaining, level: 6 } }));
        }
      }catch(e){ console.error('connect progress send failed', e); }
      sendConnectState('progress');
    }

    if(matched === total && !finished && !isSpectator){
      finished = true;
      disableConnectInputs();
      if(connectStatusEl) connectStatusEl.textContent = 'All colors connected!';
      sendConnectState('complete', true);
      recordScoreAndAdvance('complete');
    }
  }

  function renderConnectBoard(){
    if(!connectCanvasEl || !connectState) return;
    const size = Math.max(320, Math.min(900, Number(connectState.canvasSize) || 520));
    connectCanvasEl.width = size;
    connectCanvasEl.height = size;

    const ctx = connectCanvasEl.getContext('2d');
    if(!ctx) return;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#a8e6ef';
    ctx.fillRect(0, 0, size, size);

    const lineWidth = Math.max(8, Math.round(size * 0.03));
    const nodeRadius = connectNodeRadiusPx();

    const drawPath = (path, color)=>{
      if(!Array.isArray(path) || path.length < 2) return;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for(let i=1;i<path.length;i++){
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();
      ctx.restore();
    };

    connectState.colors.forEach(color=>{
      drawPath(connectState.lines[color], color);
    });
    if(connectState.activePath && Array.isArray(connectState.activePath.points)){
      drawPath(connectState.activePath.points, connectState.activePath.color);
    }

    for(const node of connectState.nodes){
      const p = connectNodeToPx(node);
      ctx.beginPath();
      ctx.fillStyle = node.color;
      ctx.arc(p.x, p.y, nodeRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function sendConnectState(reason = 'update', force = false){
    if(levelMode !== 'connect' || isSpectator || !connectState) return;
    try{
      const linesPayload = {};
      connectState.colors.forEach(color=>{
        const line = connectState.lines[color];
        linesPayload[color] = Array.isArray(line) ? line.map(p=> ({ x: Number(p.x), y: Number(p.y) })) : [];
      });
      const payload = {
        team: cfg.team || 'unknown',
        nodes: connectState.nodes.map(n=> ({ ...n })),
        colors: connectState.colors.slice(),
        totalPairs: connectState.totalPairs,
        matched: connectState.matched,
        finished: Boolean(finished),
        reason,
        lines: linesPayload,
      };
      const sig = JSON.stringify(payload);
      if(!force && sig === connectState.lastSig) return;
      connectState.lastSig = sig;
      if(pubWs && pubWs.readyState === WebSocket.OPEN){
        pubWs.send(JSON.stringify({ type: 'connectState', payload }));
      }
    }catch(e){ console.error('connectState send failed', e); }
  }

  function applyConnectSnapshot(snapshot){
    if(!snapshot || !connectState) return;
    const lines = snapshot.lines && typeof snapshot.lines === 'object' ? snapshot.lines : {};
    const nextLines = {};
    connectState.colors.forEach(color=>{
      const src = Array.isArray(lines[color]) ? lines[color] : [];
      nextLines[color] = src.map(p=> ({ x: Number(p.x) || 0, y: Number(p.y) || 0 }));
    });
    connectState.lines = nextLines;
    connectState.matched = Math.max(0, Number(snapshot.matched) || 0);
    if(snapshot.finished){
      finished = true;
      disableConnectInputs();
    }
    renderConnectBoard();
    updateConnectProgress(false);
  }

  function bindConnectCanvasEvents(){
    if(!connectCanvasEl || connectCanvasEl.dataset.bound === '1') return;
    connectCanvasEl.dataset.bound = '1';

    connectCanvasEl.addEventListener('pointerdown', (evt)=>{
      if(levelMode !== 'connect' || isSpectator || !connectState || !connectState.enabled || finished) return;
      const p = canvasPointFromEvent(evt);
      if(!p) return;
      const node = findConnectNodeAt(p);
      if(!node) return;
      connectState.activePath = {
        color: node.color,
        startId: node.id,
        points: [connectNodeToPx(node), p],
      };
      try{ connectCanvasEl.setPointerCapture(evt.pointerId); }catch(e){}
      renderConnectBoard();
    });

    connectCanvasEl.addEventListener('pointermove', (evt)=>{
      if(levelMode !== 'connect' || !connectState || !connectState.activePath) return;
      const p = canvasPointFromEvent(evt);
      if(!p) return;
      const points = connectState.activePath.points;
      const last = points[points.length - 1];
      if(!last || connectPointDist(last, p) < 6) return;
      points.push(p);
      renderConnectBoard();
    });

    connectCanvasEl.addEventListener('pointerup', (evt)=>{
      if(levelMode !== 'connect' || !connectState || !connectState.activePath) return;
      const active = connectState.activePath;
      const p = canvasPointFromEvent(evt);
      const points = active.points.slice();
      if(p) points.push(p);

      const targetNode = p ? findConnectNodeAt(p, active.color) : null;
      const startNode = getConnectNodeById(active.startId);
      let accepted = false;
      if(startNode && targetNode && targetNode.id !== startNode.id){
        const startPx = connectNodeToPx(startNode);
        const targetPx = connectNodeToPx(targetNode);
        if(points.length < 2) points.push(targetPx);
        points[0] = startPx;
        points[points.length - 1] = targetPx;
        if(!pathIntersectsOtherLines(points, active.color) && !pathTouchesForeignNode(points, active.color, startNode.id, targetNode.id)){
          connectState.lines[active.color] = points;
          accepted = true;
        }
      }
      connectState.activePath = null;
      try{ connectCanvasEl.releasePointerCapture(evt.pointerId); }catch(e){}
      renderConnectBoard();
      if(accepted){
        if(connectStatusEl) connectStatusEl.textContent = 'Good path. Connect remaining colors.';
        updateConnectProgress(true);
      } else if(connectStatusEl){
        connectStatusEl.textContent = 'Invalid path. Paths cannot cross.';
      }
    });
  }

  function setupConnectLevel(cfgLevel){
    cfgLevel = cfgLevel || {};
    setCurrentMode('connect');
    setCurrentLevel(Number(cfgLevel.level) || 6);
    scoreRecorded = false;
    finished = false;
    started = false;

    const fallbackPairCount = normalizeConnectPairCount(cfgLevel.pairCount || 4);
    const rawNodes = Array.isArray(cfgLevel.nodes) && cfgLevel.nodes.length ? cfgLevel.nodes : randomConnectNodes(fallbackPairCount);
    const nodes = rawNodes.map((n, idx)=> ({
      id: String(n && n.id ? n.id : `n${idx}`),
      color: String(n && n.color ? n.color : '#3f51b5'),
      x: Math.max(0.05, Math.min(0.95, Number(n && n.x) || 0.5)),
      y: Math.max(0.05, Math.min(0.95, Number(n && n.y) || 0.5)),
    }));
    const colors = Array.from(new Set(nodes.map(n=> n.color))).filter(Boolean);
    const lines = {};
    colors.forEach(c=>{ lines[c] = []; });

    connectState = {
      nodes,
      colors,
      lines,
      totalPairs: colors.length,
      matched: 0,
      enabled: !isSpectator,
      activePath: null,
      canvasSize: Math.max(320, Math.min(900, Number(cfgLevel.canvasSize) || 520)),
      lastSig: '',
    };

    try{
      const tl = Number(cfgLevel.timeLimit) || Number(cfg.timeLimit) || Number(timeLimit) || 90;
      timeLimit = Math.max(20, Math.floor(tl));
      remaining = timeLimit;
      updateTimerDisplays(remaining, timeLimit);
      if(!started) setCountdownVisualMask(true);
    }catch(e){}

    showLevelMode('connect');
    bindConnectCanvasEvents();
    renderConnectBoard();
    updateConnectProgress(false);
    if(connectStatusEl) connectStatusEl.textContent = 'Draw paths between matching dots.';

    if(isSpectator || !started) disableConnectInputs();
    else enableConnectInputs();

    if(!isSpectator) sendConnectState('setup', true);
    if(pendingConnectSnapshot){
      applyConnectSnapshot(pendingConnectSnapshot);
      pendingConnectSnapshot = null;
    }
  }

  // If we are a team page, build board
  if(board){
    makeBoard(board);
    populateBoard(board);
    if(Array.isArray(pendingPuzzleLayout) && pendingPuzzleLayout.length){
      restoreBoardState(pendingPuzzleLayout);
      pendingPuzzleLayout = null;
    }
    updateTimerDisplays(timeLimit, timeLimit);
    if(levelMode === 'puzzle' && !started) setCountdownVisualMask(true);
    updateScores({ broadcast: !isSpectator });
    if(isSpectator) disableMoves();
    else sendPuzzleState('initial', true);
  }

  // Memory level implementation
  function runMemoryInitialPreview(){
    if(levelMode !== 'memory' || !memoryState || !board) return;
    const allCards = Array.from(board.querySelectorAll('.card'));
    if(!allCards.length) return;

    if(memoryState.initialPreviewTimeout){
      try{ clearTimeout(memoryState.initialPreviewTimeout); }catch(e){}
      memoryState.initialPreviewTimeout = null;
    }

    allCards.forEach(c=>{
      c.textContent = c.dataset.val;
      c.disabled = true;
      playMemoryRevealFlip(c);
    });
    sendMemoryState('initialReveal', true);

    memoryState.initialPreviewTimeout = setTimeout(()=>{
      if(levelMode !== 'memory' || !board) {
        memoryState.initialPreviewTimeout = null;
        return;
      }
      const liveCards = Array.from(board.querySelectorAll('.card'));
      liveCards.forEach(c=>{
        if(!c.classList.contains('matched')) c.textContent = '';
        c.disabled = false;
      });
      memoryState.initialPreviewTimeout = null;
      sendMemoryState('initial', true);
    }, 3000);
  }

  function setupMemoryLevel(cfgLevel){
    // cfgLevel: { mode: 'memory', pairs: 5, timeLimit: 60, level: 2, items: optional array }
    setCurrentMode('memory');
    setCurrentLevel(Number(cfgLevel.level) || 2);
    scoreRecorded = false;
    memoryState = { pairs: cfgLevel.pairs || 4, timeLimit: cfgLevel.timeLimit || 60, level: cfgLevel.level || 0 };
    showLevelMode('memory');
    if(board){
      board.classList.remove('hidden');
      board.style.display = 'grid';
      board.style.visibility = '';
      board.style.pointerEvents = '';
      board.style.width = 'var(--board-size)';
      board.style.height = 'var(--board-size)';
    }
    // build a grid of cards (pairs*2)
    if(!board) return;
    // create items array: if provided use items else use numbers
    let items = cfgLevel.items && Array.isArray(cfgLevel.items)
      ? cfgLevel.items.map(v=> String(v || '').trim()).filter(Boolean)
      : null;
    if(items && items.length > 10) items = items.slice(0, 10);
    if(!items || !items.length){
      const pairs = Math.max(2, Math.min(10, Number(memoryState.pairs) || 4));
      items = [];
      for(let i=1;i<=pairs;i++) items.push(String(i));
    }
    memoryState.pairs = items.length;
    // duplicate and shuffle
    const cards = [];
    items.forEach(it=>{ cards.push({val:it}); cards.push({val:it}); });
    shuffleArray(cards);
    // clear and build slots
    board.innerHTML = '';
    const total = cards.length;
    // choose number of columns: use full-width layout (4 columns) for more than 4 cards,
    // otherwise use one column per card so they fill horizontally
    const cols = (total === 8) ? 4 : (total <= 4 ? total : 4);
    const rows = Math.ceil(total / cols);
    board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    board.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    board.style.width = 'var(--board-size)';
    board.style.height = 'var(--board-size)';
    for(let i=0;i<total;i++){
      const slot = document.createElement('div');
      slot.className = 'slot memory-slot';
      slot.dataset.index = i;
      const card = document.createElement('button');
      card.className = 'card';
      card.dataset.val = cards[i].val;
      card.textContent = '';
      card.addEventListener('click', onMemoryClick);
      slot.appendChild(card);
      board.appendChild(slot);
    }
    // start memory state
    const allCards = board.querySelectorAll('.card');
    memoryState.opened = [];
    memoryState.matched = 0;
    memoryState.mistakes = 0;
    memoryState.started = true;
    remaining = memoryState.timeLimit;
    updateTimerDisplays(remaining, memoryState.timeLimit);
    // clear existing local interval; server will broadcast authoritative ticks
    clearInterval(interval);

    if(isSpectator){
      allCards.forEach(c=>{ c.textContent = ''; });
      if(Array.isArray(pendingMemorySnapshot && pendingMemorySnapshot.cards) && pendingMemorySnapshot.cards.length){
        applyMemorySnapshot(pendingMemorySnapshot);
        pendingMemorySnapshot = null;
      }
      disableMoves();
      return;
    }

    // active player waits for Start; keep cards hidden + disabled until timer starts
    allCards.forEach(c=>{
      c.textContent = '';
      c.disabled = true;
    });
    sendMemoryState('initialHidden', true);
  }

  function onMemoryClick(e){
    if(levelMode !== 'memory' || finished) return;
    if(isSpectator) return;
    const btn = e.currentTarget;
    if(btn.disabled) return;
    if(btn.classList.contains('matched')) return;
    // if no card is open -> reveal as preview and auto-hide after 1s
    if(!memoryState.opened || memoryState.opened.length === 0){
      // reveal preview
      btn.textContent = btn.dataset.val;
      playMemoryRevealFlip(btn);
      memoryState.opened = [btn];
      sendMemoryState('reveal');
      // auto-hide preview after 1s unless a second click occurs
      if(memoryState.previewTimeout) clearTimeout(memoryState.previewTimeout);
      memoryState.previewTimeout = setTimeout(()=>{
        try{ if(memoryState.opened && memoryState.opened[0]) memoryState.opened[0].textContent = ''; }catch(e){}
        memoryState.opened = [];
        memoryState.previewTimeout = null;
        sendMemoryState('autoHide');
      }, 1000);
      return;
    }
    // if one preview is open and another card clicked -> cancel preview hide and evaluate
    if(memoryState.opened.length === 1){
      const first = memoryState.opened[0];
      // ignore clicking the same card twice
      if(first === btn) return;
      // cancel auto-hide so both remain visible for match check
      if(memoryState.previewTimeout) { clearTimeout(memoryState.previewTimeout); memoryState.previewTimeout = null; }
      // reveal second card
      btn.textContent = btn.dataset.val;
      playMemoryRevealFlip(btn);
      const a = first, b = btn;
      if(a.dataset.val === b.dataset.val){
        a.classList.add('matched'); b.classList.add('matched');
        memoryState.matched += 1;
        // update visible score immediately
        const currentPoints = (memoryState.matched * 10);
        if(puzzleScoreEl) puzzleScoreEl.textContent = `Score: ${currentPoints}`;
        memoryState.opened = [];
        // send progress update to server/admin
        try{ const m = { type: 'progress', payload: { team: cfg.team || 'unknown', matched: memoryState.matched, pairs: memoryState.pairs, remaining } };
          console.debug('Sending memory progress:', m);
          if(!isSpectator && pubWs && pubWs.readyState === WebSocket.OPEN) pubWs.send(JSON.stringify(m));
        }catch(e){ console.error('memory progress send failed', e); }
        sendMemoryState('match', true);
        if(memoryState.matched === memoryState.pairs){
          // level complete
          if (interval) {
            clearInterval(interval);
            interval = null;
            console.debug('[Memory] Timer stopped by memory completion');
          }
          finished = true;
          roundLocked = true;
          stopHeartbeatSound();
          disableMoves();
          // Show message on team board
          if (typeof statusEl !== 'undefined' && statusEl) statusEl.textContent = 'Ended';
          // Show message on admin control panel
          try {
            const adminStatus = document.querySelector('.admin-page #statusMessage');
            if (adminStatus) adminStatus.textContent = 'Ended';
          } catch(e) {}
          recordScoreAndAdvance('complete');
        }
      }else{
        memoryState.mistakes++;
        sendMemoryState('mismatch');
        // leave visible briefly then hide both
        setTimeout(()=>{ try{ a.textContent=''; b.textContent=''; }catch(e){}; memoryState.opened = []; sendMemoryState('mismatchHide'); }, 700);
      }
    }
  }

  function captureBoardState(){
    if(!board) return null;
    const slots = Array.from(board.children);
    return slots.map(slot=>{
      const piece = slot.firstElementChild;
      return piece ? String(piece.dataset.correct) : null;
    });
  }

  function setBoardToSolved(){
    if(!board) return;
    const slots = Array.from(board.children);
    const piecesByCorrect = new Map();
    Array.from(board.querySelectorAll('.piece')).forEach(piece=>{
      piecesByCorrect.set(String(piece.dataset.correct), piece);
    });
    slots.forEach((slot, idx)=>{
      const solvedPiece = piecesByCorrect.get(String(idx));
      if(solvedPiece) slot.appendChild(solvedPiece);
    });
  }

  function restoreBoardState(snapshot){
    if(!board || !Array.isArray(snapshot)) return;
    const slots = Array.from(board.children);
    const piecesByCorrect = new Map();
    Array.from(board.querySelectorAll('.piece')).forEach(piece=>{
      piecesByCorrect.set(String(piece.dataset.correct), piece);
    });
    slots.forEach((slot, idx)=>{
      const id = snapshot[idx];
      if(id == null) return;
      const piece = piecesByCorrect.get(String(id));
      if(piece) slot.appendChild(piece);
    });
    try{ saveGameSession(); }catch(e){}
  }

  function setSolvedPreviewVisible(isVisible){
    if(levelMode !== 'puzzle' || !board) return;
    if(isVisible){
      if(solvedPreviewActive) return;
      solvedPreviewSnapshot = captureBoardState();
      setBoardToSolved();
      solvedPreviewActive = true;
      sendPuzzleState('previewShow', true);
      return;
    }
    if(!solvedPreviewActive) return;
    restoreBoardState(solvedPreviewSnapshot);
    solvedPreviewSnapshot = null;
    solvedPreviewActive = false;
    sendPuzzleState('previewHide', true);
  }

  if(holdShowBtn){
    const startPreview = (e)=>{
      if(levelMode !== 'puzzle') return;
      if(e && e.cancelable) e.preventDefault();
      setSolvedPreviewVisible(true);
    };
    const stopPreview = (e)=>{
      if(e && e.cancelable) e.preventDefault();
      setSolvedPreviewVisible(false);
    };
    const stopPreviewFromWindow = ()=>{ setSolvedPreviewVisible(false); };

    holdShowBtn.addEventListener('mousedown', startPreview);
    holdShowBtn.addEventListener('touchstart', startPreview, { passive: false });
    holdShowBtn.addEventListener('mouseup', stopPreview);
    holdShowBtn.addEventListener('mouseleave', stopPreview);
    holdShowBtn.addEventListener('touchend', stopPreview);
    holdShowBtn.addEventListener('touchcancel', stopPreview);
    holdShowBtn.addEventListener('blur', stopPreview);

    window.addEventListener('mouseup', stopPreviewFromWindow);
    window.addEventListener('touchend', stopPreviewFromWindow);
    window.addEventListener('touchcancel', stopPreviewFromWindow);
  }

  // If admin controls exist on page, set them up to broadcast via WebSocket (admin page will create its own ws)
  const startBtn = document.getElementById('startBtn');
  const resetBtn = document.getElementById('resetBtn');
  const timeInput = document.getElementById('timeInput');
  const adminWsUrl = cfg.adminWs || cfg.ws;
  if(startBtn && resetBtn && adminWsUrl){
    const adminWs = new WebSocket(adminWsUrl);
    const _adminQueue = [];
    function sendAdmin(msgObj){
      const payload = JSON.stringify(msgObj);
      if(adminWs.readyState === WebSocket.OPEN){
        try{ adminWs.send(payload); }catch(e){ console.error('adminWs send failed', e); }
      }else{
        // queue until open
        _adminQueue.push(payload);
      }
    }
    sendAdminControlMessage = sendAdmin;
    adminWs.addEventListener('open', ()=>{
      console.log('admin ws open');
      try{ const s = document.getElementById('status'); if(s) s.textContent = 'Connected'; }catch(e){}
      try{ adminWs.send(JSON.stringify({ type: 'stateRequest' })); }catch(e){}
      // flush queue
      while(_adminQueue.length){
        const p = _adminQueue.shift();
        try{ adminWs.send(p); }catch(e){ console.error('adminWs queued send failed', e); }
      }
    });
    adminWs.addEventListener('close', ()=> scheduleWsRecovery('Admin connection lost. Reconnecting...'));
    adminWs.addEventListener('error', ()=> scheduleWsRecovery('Admin connection error. Reconnecting...'));
    // image controls (admin page)
    const setImageBtn = document.getElementById('setImageBtn');
    const imageInput = document.getElementById('imageInput');
    const imageFileInput = document.getElementById('imageFileInput');
    const uploadImageBtn = document.getElementById('uploadImageBtn');
    const imagePreview = document.getElementById('imagePreview');
    const promoVideoFileInput = document.getElementById('promoVideoFileInput');
    const promoVideoUrlInput = document.getElementById('promoVideoUrlInput');
    const setPromoVideoBtn = document.getElementById('setPromoVideoBtn');
    const uploadPromoVideoBtn = document.getElementById('uploadPromoVideoBtn');
    const promoVideoPlayBtn = document.getElementById('promoVideoPlayBtn');
    const promoVideoPauseBtn = document.getElementById('promoVideoPauseBtn');
    const promoVideoStopBtn = document.getElementById('promoVideoStopBtn');
    const promoVideoVolDownBtn = document.getElementById('promoVideoVolDownBtn');
    const promoVideoVolUpBtn = document.getElementById('promoVideoVolUpBtn');
    const promoVideoMuteBtn = document.getElementById('promoVideoMuteBtn');
    const promoVideoUnmuteBtn = document.getElementById('promoVideoUnmuteBtn');
    const promoVideoRemoveBtn = document.getElementById('promoVideoRemoveBtn');
    const showPromoOnDashboardBtn = document.getElementById('showPromoOnDashboardBtn');
    const restoreDefaultBoardBtn = document.getElementById('restoreDefaultBoardBtn');
    const refreshDashboardBtn = document.getElementById('refreshDashboardBtn');
    const promoImageUrlInput = document.getElementById('promoImageUrlInput');
    const promoImageFileInput = document.getElementById('promoImageFileInput');
    const setPromoImageBtn = document.getElementById('setPromoImageBtn');
    const uploadPromoImageBtn = document.getElementById('uploadPromoImageBtn');
    const promoImageRemoveBtn = document.getElementById('promoImageRemoveBtn');
    const promoWidthDecreaseBtn = document.getElementById('promoWidthDecreaseBtn');
    const promoWidthIncreaseBtn = document.getElementById('promoWidthIncreaseBtn');
    const promoHeightDecreaseBtn = document.getElementById('promoHeightDecreaseBtn');
    const promoHeightIncreaseBtn = document.getElementById('promoHeightIncreaseBtn');
    const boardHeightDecreaseBtn = document.getElementById('boardHeightDecreaseBtn');
    const boardHeightIncreaseBtn = document.getElementById('boardHeightIncreaseBtn');
    if(imagePreview && imageUrl) imagePreview.src = imageUrl;

    // admin level controls
    const level1Btn = document.getElementById('level1Btn');
    const level2Btn = document.getElementById('level2Btn');
    const level3Btn = document.getElementById('level3Btn');
    const level6Btn = document.getElementById('level6Btn');
    const connectPairCountInput = document.getElementById('connectPairCountInput');
    const connectPairsDecreaseBtn = document.getElementById('connectPairsDecreaseBtn');
    const connectPairsIncreaseBtn = document.getElementById('connectPairsIncreaseBtn');
    const letterInput = document.getElementById('letterInput');
    const memoryItemsInput = document.getElementById('memoryItemsInput');
    const levelNumber = document.getElementById('levelNumber');
    const startLevelBtn = document.getElementById('startLevelBtn');

    function buildMemoryLevelPayload(){
      const raw = (memoryItemsInput && typeof memoryItemsInput.value === 'string') ? memoryItemsInput.value : '';
      const items = String(raw)
        .split(/[\n,]+/)
        .map(v=> v.trim())
        .filter(Boolean)
        .slice(0, 10);
      const pairs = items.length ? items.length : 4;
      const payload = { type: 'level', mode: 'memory', pairs, timeLimit: 60, level: 2 };
      if(items.length) payload.items = items;
      return payload;
    }

    function sendLevelPayload(payload){
      try{ sendAdmin(payload); }catch(e){ console.error('send level failed', e); }
    }

    function getConnectPairCountFromAdmin(){
      const raw = connectPairCountInput ? connectPairCountInput.value : 4;
      const safe = normalizeConnectPairCount(raw);
      if(connectPairCountInput) connectPairCountInput.value = String(safe);
      return safe;
    }

    if(connectPairsDecreaseBtn){
      connectPairsDecreaseBtn.addEventListener('click', ()=>{
        const next = normalizeConnectPairCount(getConnectPairCountFromAdmin() - 1);
        if(connectPairCountInput) connectPairCountInput.value = String(next);
      });
    }
    if(connectPairsIncreaseBtn){
      connectPairsIncreaseBtn.addEventListener('click', ()=>{
        const next = normalizeConnectPairCount(getConnectPairCountFromAdmin() + 1);
        if(connectPairCountInput) connectPairCountInput.value = String(next);
      });
    }
    if(connectPairCountInput){
      connectPairCountInput.addEventListener('change', ()=>{
        connectPairCountInput.value = String(getConnectPairCountFromAdmin());
      });
    }
    if(level1Btn){
      level1Btn.addEventListener('click', ()=>{
        // Level 1 = puzzle: use current image or imageInput
        const url = normalizeSharedImageUrl((imageInput && imageInput.value && imageInput.value.trim()) || imageUrl);
        const payload = { type: 'level', mode: 'puzzle', level: 1, url };
        sendLevelPayload(payload);
        try{ if(typeof applyImage === 'function' && url) applyImage(url); }catch(e){}
        try{ setCurrentLevel(1); resetLocal(); }catch(e){}
        // Update admin level counter
        const adminLevelCounter = document.getElementById('adminLevelCounter');
        if(adminLevelCounter) adminLevelCounter.textContent = '1';
      });
    }
    if(level2Btn){
      level2Btn.addEventListener('click', ()=>{
        const payload = buildMemoryLevelPayload();
        sendLevelPayload(payload);
        try{ setupMemoryLevel(payload); }catch(e){}
        // Update admin level counter
        const adminLevelCounter = document.getElementById('adminLevelCounter');
        if(adminLevelCounter) adminLevelCounter.textContent = '2';
      });
    }
    if(level3Btn){
      level3Btn.addEventListener('click', ()=>{
        const letter = (letterInput && letterInput.value && letterInput.value.trim()) ? letterInput.value.trim().charAt(0).toUpperCase() : randomLetter();
        const payload = { type: 'level', mode: 'word', level: 3, letter, categories: WORD_CATEGORIES.slice() };
        sendLevelPayload(payload);
        try {
          const cl = document.getElementById('currentLevel');
          if(cl) cl.textContent = '3';
        } catch(e){}
        // Update admin level counter
        const adminLevelCounter = document.getElementById('adminLevelCounter');
        if(adminLevelCounter) adminLevelCounter.textContent = '3';
      });
    }
    const level5Btn = document.getElementById('level5Btn');
    if(level5Btn){
      level5Btn.addEventListener('click', ()=>{
        const payload = { type: 'level', mode: 'wordsearch', level: 5 };
        sendLevelPayload(payload);
        try {
          const cl = document.getElementById('currentLevel');
          if(cl) cl.textContent = '5';
        } catch(e){}
        try{ setupWordSearchLevel(payload); }catch(e){}
        // Update admin level counter
        const adminLevelCounter = document.getElementById('adminLevelCounter');
        if(adminLevelCounter) adminLevelCounter.textContent = '5';
      });
    }
    const level4Btn = document.getElementById('level4Btn');
    if(level4Btn){
      level4Btn.addEventListener('click', ()=>{
        const payload = buildPipeLevelPayload();
        sendLevelPayload(payload);
        try{ setupPipeLevel(payload); }catch(e){}
        // Update admin level counter
        const adminLevelCounter = document.getElementById('adminLevelCounter');
        if(adminLevelCounter) adminLevelCounter.textContent = '4';
      });
    }
    if(level6Btn){
      level6Btn.addEventListener('click', ()=>{
        const payload = defaultConnectLevelPayloadWithPairs(getConnectPairCountFromAdmin());
        sendLevelPayload(payload);
        try{ setupConnectLevel(payload); }catch(e){}
        const adminLevelCounter = document.getElementById('adminLevelCounter');
        if(adminLevelCounter) adminLevelCounter.textContent = '6';
      });
    }
    if(startLevelBtn && levelNumber){
      startLevelBtn.addEventListener('click', ()=>{
        const n = parseInt(levelNumber.value,10) || 1;
        if(n===2){
          const payload = buildMemoryLevelPayload();
          sendLevelPayload(payload);
        }else if(n===3){
          const letter = (letterInput && letterInput.value && letterInput.value.trim()) ? letterInput.value.trim().charAt(0).toUpperCase() : randomLetter();
          const payload = { type: 'level', mode: 'word', level: 3, letter, categories: WORD_CATEGORIES.slice() };
          sendLevelPayload(payload);
        }else if(n===4){
          const payload = buildPipeLevelPayload();
          sendLevelPayload(payload);
        }else if(n===5){
          // Level 5: Word Search
          const payload = { type: 'level', mode: 'wordsearch', level: 5 };
          sendLevelPayload(payload);
        }else if(n===6){
          const payload = defaultConnectLevelPayloadWithPairs(getConnectPairCountFromAdmin());
          sendLevelPayload(payload);
        }else{
          const url = normalizeSharedImageUrl((imageInput && imageInput.value && imageInput.value.trim()) || imageUrl);
          const payload = { type: 'level', mode: 'puzzle', level: n, url };
          sendLevelPayload(payload);
        }
        // Update admin level counter
        const adminLevelCounter = document.getElementById('adminLevelCounter');
        if(adminLevelCounter) adminLevelCounter.textContent = String(n);
      });
    }

    if(setImageBtn && imageInput){
      setImageBtn.addEventListener('click', async ()=>{
        const rawUrl = imageInput.value && imageInput.value.trim();
        const url = normalizeSharedImageUrl(rawUrl);
        if(!url) return;
        try{ const s = document.getElementById('status'); if(s) s.textContent = 'Importing image URL...'; }catch(e){}

        let finalUrl = url;
        try{
          finalUrl = await importImageFromUrl(url);
        }catch(err){
          console.warn('image URL import fallback to direct URL:', err);
        }

        if(imageInput) imageInput.value = finalUrl;
        applyImage(finalUrl);
        sendAdmin({type:'image', url: finalUrl});
        try{ const s = document.getElementById('status'); if(s) s.textContent = 'Image queued'; }catch(e){}
      });
    }

    // local file upload -> read as data URL and broadcast
    if(uploadImageBtn && imageFileInput){
      async function handleImageUpload(file){
        if(!file) return alert('Choose a file first');
        try{ const s = document.getElementById('status'); if(s) s.textContent = 'Uploading image...'; }catch(e){}
        try{
          const uploadedUrl = await uploadImageFile(file);
          if(imageInput) imageInput.value = uploadedUrl;
          sendAdmin({type:'image', url: uploadedUrl});
          try{ const s = document.getElementById('status'); if(s) s.textContent = 'Image queued'; }catch(e){}
        }catch(err){
          console.error('image upload failed', err);
          try{ const s = document.getElementById('status'); if(s) s.textContent = 'Image upload failed'; }catch(e){}
        }
      }

      uploadImageBtn.addEventListener('click', ()=>{
        const file = imageFileInput.files && imageFileInput.files[0];
        handleImageUpload(file);
      });

      // preview selected file immediately and auto-send
      imageFileInput.addEventListener('change', ()=>{
        const f = imageFileInput.files && imageFileInput.files[0];
        if(!f) return;
        const objUrl = URL.createObjectURL(f);
        if(imagePreview) imagePreview.src = objUrl;
        // revoke after load to free memory
        if(imagePreview) imagePreview.onload = ()=> URL.revokeObjectURL(objUrl);
        handleImageUpload(f);
      });
    }

    if(uploadPromoVideoBtn && promoVideoFileInput){
      let promoLocalPreviewUrl = null;

      if(setPromoVideoBtn && promoVideoUrlInput){
        setPromoVideoBtn.addEventListener('click', ()=>{
          const rawUrl = (promoVideoUrlInput.value || '').trim();
          const url = normalizeSharedImageUrl(rawUrl);
          if(!url){
            if(promoVideoStatusEl) promoVideoStatusEl.textContent = 'Enter a valid video URL first.';
            return;
          }
          sendAdmin({ type: 'promoVideo', url });
          applyPromoVideo(url);
          if(promoVideoStatusEl) promoVideoStatusEl.textContent = 'Promotion video URL applied to dashboard. Press Play to start.';
        });
      }

      promoVideoFileInput.addEventListener('change', ()=>{
        const f = promoVideoFileInput.files && promoVideoFileInput.files[0];
        if(!f) return;
        if(promoLocalPreviewUrl){
          try{ URL.revokeObjectURL(promoLocalPreviewUrl); }catch(e){}
          promoLocalPreviewUrl = null;
        }
        promoLocalPreviewUrl = URL.createObjectURL(f);
        if(promoVideoAdminPreviewEl) promoVideoAdminPreviewEl.src = promoLocalPreviewUrl;
        if(promoVideoStatusEl) promoVideoStatusEl.textContent = `Selected: ${f.name}. Click Upload Video to go live.`;
      });

      uploadPromoVideoBtn.addEventListener('click', async ()=>{
        const file = promoVideoFileInput.files && promoVideoFileInput.files[0];
        if(!file){
          if(promoVideoStatusEl) promoVideoStatusEl.textContent = 'Choose a video file first.';
          return;
        }
        if(promoVideoStatusEl) promoVideoStatusEl.textContent = 'Uploading promotion video...';
        try{
          const uploadedUrl = await uploadPromoVideoFile(file);
          sendAdmin({ type: 'promoVideo', url: uploadedUrl });
          applyPromoVideo(uploadedUrl);
          if(promoVideoStatusEl) promoVideoStatusEl.textContent = 'Promotion video uploaded to dashboard. Press Play to start.';
        }catch(err){
          console.error('promo video upload failed', err);
          const msg = err && err.message ? err.message : 'Promotion video upload failed.';
          if(promoVideoStatusEl) promoVideoStatusEl.textContent = `Promotion video upload failed: ${msg}`;
        }
      });

      window.addEventListener('beforeunload', ()=>{
        if(promoLocalPreviewUrl){
          try{ URL.revokeObjectURL(promoLocalPreviewUrl); }catch(e){}
          promoLocalPreviewUrl = null;
        }
      });

      if(promoVideoPlayBtn){
        promoVideoPlayBtn.addEventListener('click', ()=>{
          sendAdmin({ type: 'promoVideoControl', action: 'play' });
          controlPromoVideo('play');
        });
      }
      if(promoVideoPauseBtn){
        promoVideoPauseBtn.addEventListener('click', ()=>{
          sendAdmin({ type: 'promoVideoControl', action: 'pause' });
          controlPromoVideo('pause');
        });
      }
      if(promoVideoStopBtn){
        promoVideoStopBtn.addEventListener('click', ()=>{
          sendAdmin({ type: 'promoVideoControl', action: 'stop' });
          controlPromoVideo('stop');
        });
      }
      if(promoVideoVolDownBtn){
        promoVideoVolDownBtn.addEventListener('click', ()=>{
          sendAdmin({ type: 'promoVideoControl', action: 'volumeDown' });
          controlPromoVideo('volumeDown');
        });
      }
      if(promoVideoVolUpBtn){
        promoVideoVolUpBtn.addEventListener('click', ()=>{
          sendAdmin({ type: 'promoVideoControl', action: 'volumeUp' });
          controlPromoVideo('volumeUp');
        });
      }
      if(promoVideoMuteBtn){
        promoVideoMuteBtn.addEventListener('click', ()=>{
          sendAdmin({ type: 'promoVideoControl', action: 'mute' });
          controlPromoVideo('mute');
        });
      }
      if(promoVideoUnmuteBtn){
        promoVideoUnmuteBtn.addEventListener('click', ()=>{
          sendAdmin({ type: 'promoVideoControl', action: 'unmute' });
          controlPromoVideo('unmute');
        });
      }
      if(promoVideoRemoveBtn){
        promoVideoRemoveBtn.addEventListener('click', ()=>{
          sendAdmin({ type: 'promoVideoControl', action: 'stop' });
          sendAdmin({ type: 'promoVideo', url: '' });
          applyPromoVideo('');
          if(promoVideoFileInput) promoVideoFileInput.value = '';
          if(promoVideoStatusEl) promoVideoStatusEl.textContent = 'Promotion video removed from player board.';
        });
      }

      if(showPromoOnDashboardBtn){
        showPromoOnDashboardBtn.addEventListener('click', ()=>{
          sendAdmin({ type: 'promoBoardMode', mode: 'video' });
          if(promoVideoStatusEl) promoVideoStatusEl.textContent = 'Promotion video is shown in the dashboard board area.';
        });
      }

      if(restoreDefaultBoardBtn){
        restoreDefaultBoardBtn.addEventListener('click', ()=>{
          sendAdmin({ type: 'promoBoardMode', mode: 'boards' });
          if(promoVideoStatusEl) promoVideoStatusEl.textContent = 'Dashboard board area restored to Team A and Team B.';
        });
      }

      if(refreshDashboardBtn){
        refreshDashboardBtn.addEventListener('click', ()=>{
          sendAdmin({ type: 'refreshDashboard' });
          if(promoVideoStatusEl) promoVideoStatusEl.textContent = 'Dashboard refresh requested.';
        });
      }
    }

    if(setPromoImageBtn && promoImageUrlInput){
      setPromoImageBtn.addEventListener('click', ()=>{
        const rawUrl = (promoImageUrlInput.value || '').trim();
        const url = normalizeSharedImageUrl(rawUrl);
        if(!url){
          if(promoImageStatusEl) promoImageStatusEl.textContent = 'Enter a valid image URL first.';
          return;
        }
        sendAdmin({ type: 'promoImage', url });
        applyPromoImage(url);
      });
    }

    if(uploadPromoImageBtn && promoImageFileInput){
      uploadPromoImageBtn.addEventListener('click', async ()=>{
        const file = promoImageFileInput.files && promoImageFileInput.files[0];
        if(!file){
          if(promoImageStatusEl) promoImageStatusEl.textContent = 'Choose an image file first.';
          return;
        }
        if(promoImageStatusEl) promoImageStatusEl.textContent = 'Uploading promotion image...';
        try{
          const uploadedUrl = await uploadImageFile(file);
          if(promoImageUrlInput) promoImageUrlInput.value = uploadedUrl;
          sendAdmin({ type: 'promoImage', url: uploadedUrl });
          applyPromoImage(uploadedUrl);
        }catch(err){
          console.error('promo image upload failed', err);
          const msg = err && err.message ? err.message : 'Promotion image upload failed.';
          if(promoImageStatusEl) promoImageStatusEl.textContent = `Promotion image upload failed: ${msg}`;
        }
      });

      promoImageFileInput.addEventListener('change', ()=>{
        const f = promoImageFileInput.files && promoImageFileInput.files[0];
        if(!f || !promoImageAdminPreviewEl) return;
        const objUrl = URL.createObjectURL(f);
        promoImageAdminPreviewEl.src = objUrl;
        promoImageAdminPreviewEl.onload = ()=> URL.revokeObjectURL(objUrl);
      });
    }

    if(promoImageRemoveBtn){
      promoImageRemoveBtn.addEventListener('click', ()=>{
        sendAdmin({ type: 'promoImage', url: '' });
        applyPromoImage('');
        if(promoImageUrlInput) promoImageUrlInput.value = '';
        if(promoImageFileInput) promoImageFileInput.value = '';
      });
    }

    if(promoWidthDecreaseBtn){
      promoWidthDecreaseBtn.addEventListener('click', ()=>{
        const current = clampPromoWidth(parseInt(String((promoWidthValueEl && promoWidthValueEl.textContent) || '380'), 10));
        const next = clampPromoWidth(current - 20);
        sendAdmin({ type: 'promoWidth', width: next });
        applyDashboardPromoWidth(next);
      });
    }
    if(promoWidthIncreaseBtn){
      promoWidthIncreaseBtn.addEventListener('click', ()=>{
        const current = clampPromoWidth(parseInt(String((promoWidthValueEl && promoWidthValueEl.textContent) || '380'), 10));
        const next = clampPromoWidth(current + 20);
        sendAdmin({ type: 'promoWidth', width: next });
        applyDashboardPromoWidth(next);
      });
    }
    if(promoHeightDecreaseBtn){
      promoHeightDecreaseBtn.addEventListener('click', ()=>{
        const current = clampPromoHeight(parseInt(String((promoHeightValueEl && promoHeightValueEl.textContent) || '430'), 10));
        const next = clampPromoHeight(current - 20);
        sendAdmin({ type: 'promoHeight', height: next });
        applyDashboardPromoHeight(next);
      });
    }
    if(promoHeightIncreaseBtn){
      promoHeightIncreaseBtn.addEventListener('click', ()=>{
        const current = clampPromoHeight(parseInt(String((promoHeightValueEl && promoHeightValueEl.textContent) || '430'), 10));
        const next = clampPromoHeight(current + 20);
        sendAdmin({ type: 'promoHeight', height: next });
        applyDashboardPromoHeight(next);
      });
    }
    if(boardHeightDecreaseBtn){
      boardHeightDecreaseBtn.addEventListener('click', ()=>{
        const current = clampBoardHeight(parseInt(String((boardHeightValueEl && boardHeightValueEl.textContent) || '620'), 10));
        const next = clampBoardHeight(current - 30);
        sendAdmin({ type: 'boardHeight', height: next });
        applyDashboardBoardHeight(next);
      });
    }
    if(boardHeightIncreaseBtn){
      boardHeightIncreaseBtn.addEventListener('click', ()=>{
        const current = clampBoardHeight(parseInt(String((boardHeightValueEl && boardHeightValueEl.textContent) || '620'), 10));
        const next = clampBoardHeight(current + 30);
        sendAdmin({ type: 'boardHeight', height: next });
        applyDashboardBoardHeight(next);
      });
    }
    startBtn.addEventListener('click', ()=>{
      const tl = parseInt(timeInput.value,10) || 120;
      const payload = {type:'start', start: Date.now(), timeLimit: tl};
      sendAdmin(payload);
    });
    const pauseBtn = document.getElementById('pauseBtn');
    const forceEndBtn = document.getElementById('forceEndBtn');
    const nextBtn = document.getElementById('nextBtn');
    const resetAllBtn = document.getElementById('resetAllBtn');
    if(pauseBtn){ pauseBtn.addEventListener('click', ()=> sendAdmin({ type: 'pause' })); }
    if(forceEndBtn){ forceEndBtn.addEventListener('click', ()=> sendAdmin({ type: 'forceEnd' })); }
    if(nextBtn){ nextBtn.addEventListener('click', ()=> sendAdmin({ type: 'next' })); }
    if(resetAllBtn){ resetAllBtn.addEventListener('click', ()=> sendAdmin({ type: 'resetAll' })); }
    resetBtn.addEventListener('click', ()=>{
      sendAdmin({type:'reset'});
    });
  }

  if(submitWordsBtn){
    // Always validate on every input change for instant completion detection (no submit button needed)
    if(wordSection){
      wordSection.querySelectorAll('input.word-input').forEach(input => {
        input.addEventListener('input', validateWordSubmission);
      });
    }
  }

  const socket = new WebSocket(cfg.ws || cfg.adminWs || 'ws://localhost:8000');
  socket.addEventListener('open', ()=>{ try{ socket.send(JSON.stringify({ type: 'stateRequest' })); }catch(e){} });
  socket.addEventListener('close', ()=> scheduleWsRecovery('Connection lost. Reconnecting...'));
  socket.addEventListener('error', ()=> scheduleWsRecovery('Connection error. Reconnecting...'));

  // Notify server of team name changes
  if (setTeamANameBtn) {
    setTeamANameBtn.addEventListener('click', () => {
      const newName = (teamANameInput && teamANameInput.value ? teamANameInput.value : '').trim();
      if (newName) {
        setTeamNameUI('A', newName);
        socket.send(JSON.stringify({ type: 'updateTeamName', team: 'A', name: newName }));
      }
    });
  }

  if (setTeamBNameBtn) {
    setTeamBNameBtn.addEventListener('click', () => {
      const newName = (teamBNameInput && teamBNameInput.value ? teamBNameInput.value : '').trim();
      if (newName) {
        setTeamNameUI('B', newName);
        socket.send(JSON.stringify({ type: 'updateTeamName', team: 'B', name: newName }));
      }
    });
  }

  // Listen for team name updates from the server
  socket.addEventListener('message', (event) => {
    let data;
    try{
      data = JSON.parse(event.data);
    }catch(e){
      return;
    }
    if (!data || typeof data.type !== 'string') return;
    const t = data.type;
    if (t === 'updateTeamName') {
      setTeamNameUI(data.team, data.name);
      return;
    }
    if (t === 'gameHistory'){
      try{ renderGameHistory(data.history || []); }catch(e){ console.error('render history failed', e); }
      return;
    }
    if (t === 'gameLogged'){
      try{ renderGameHistory(data.history || []); }catch(e){ console.error('render logged game failed', e); }
      return;
    }
  });
  // Expose a small debug helper to start the local timer from the browser console.
  // Usage (in browser console): `DEBUG_startTimer(90)` to start a 90-second round now.
  try{
    window.DEBUG_startTimer = function(seconds){
      try{ startLocalTimer(Date.now(), Number(seconds) || 120); }catch(e){ console.error('startLocalTimer not available', e); }
    };
  }catch(e){}
})();
