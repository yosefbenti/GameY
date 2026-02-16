// Simple WebSocket coordinator for game/admin messages.
// Requires: npm install ws
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const WebSocket = require('ws');

const HOST = process.env.WS_HOST || '0.0.0.0';
const PORT = Number(process.env.WS_PORT) || 8000;
const STATIC_DIR = __dirname;

const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const GAME_HISTORY_FILE = path.join(__dirname, 'game-history.json');

function loadGameHistoryFromDisk() {
  try {
    if (!fs.existsSync(GAME_HISTORY_FILE)) return [];
    const raw = fs.readFileSync(GAME_HISTORY_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to read game history:', error);
    return [];
  }
}

function saveGameHistoryToDisk(history) {
  try {
    fs.writeFileSync(GAME_HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to write game history:', error);
  }
}

function sendStaticFile(res, absPath) {
  if (!absPath.startsWith(STATIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }
  if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  const ext = path.extname(absPath).toLowerCase();
  const mimeByExt = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  };

  res.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store, max-age=0',
    'Content-Type': mimeByExt[ext] || 'application/octet-stream',
  });
  fs.createReadStream(absPath).pipe(res);
}

const httpServer = http.createServer((req, res) => {
  try {
    if (req && req.headers && req.headers.host) {
      state.publicHost = req.headers.host;
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    const urlPath = decodeURIComponent((req.url || '').split('?')[0]);

    const routeToFile = {
      '/': 'admin.html',
      '/admin': 'admin.html',
      '/admin.html': 'admin.html',
      '/dashboard': 'dashboard.html',
      '/dashboard.html': 'dashboard.html',
      '/teamA': 'teamA.html',
      '/teamA.html': 'teamA.html',
      '/teamB': 'teamB.html',
      '/teamB.html': 'teamB.html',
      '/index.html': 'index.html',
    };

    if (urlPath === '/upload' && req.method === 'POST') {
      const contentType = String(req.headers['content-type'] || '').split(';')[0].toLowerCase();
      const extByMime = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif',
      };
      const ext = extByMime[contentType];
      if (!ext) {
        res.writeHead(400, {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({ ok: false, error: 'Unsupported image type' }));
        return;
      }

      const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
      let total = 0;
      const chunks = [];

      req.on('data', (chunk) => {
        total += chunk.length;
        if (total > MAX_UPLOAD_BYTES) {
          res.writeHead(413, {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          });
          res.end(JSON.stringify({ ok: false, error: 'Upload too large (max 10MB)' }));
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });

      req.on('end', () => {
        try {
          const buf = Buffer.concat(chunks);
          if (!buf.length) {
            res.writeHead(400, {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            });
            res.end(JSON.stringify({ ok: false, error: 'Empty upload' }));
            return;
          }
          const fileName = `current-${Date.now()}.${ext}`;
          const absPath = path.join(UPLOAD_DIR, fileName);
          fs.writeFileSync(absPath, buf);
          const url = `http://${getPublicHost()}/uploads/${fileName}`;
          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, max-age=0',
          });
          res.end(JSON.stringify({ ok: true, url }));
        } catch (error) {
          res.writeHead(500, {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          });
          res.end(JSON.stringify({ ok: false, error: String(error) }));
        }
      });

      req.on('error', (error) => {
        res.writeHead(500, {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({ ok: false, error: String(error) }));
      });
      return;
    }

    if (urlPath.startsWith('/uploads/')) {
      const fileName = path.basename(urlPath);
      const absPath = path.join(UPLOAD_DIR, fileName);
      if (!absPath.startsWith(UPLOAD_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      if (!fs.existsSync(absPath)) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      const ext = path.extname(absPath).toLowerCase();
      const mimeByExt = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
      };
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      res.setHeader('Content-Type', mimeByExt[ext] || 'application/octet-stream');
      fs.createReadStream(absPath).pipe(res);
      return;
    }

    if (urlPath === '/health' || urlPath === '/api/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, ws: `ws://${getPublicHost()}` }));
      return;
    }

    if (urlPath === '/api/history') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
      });
      res.end(JSON.stringify({ ok: true, history: state.gameHistory || [] }));
      return;
    }

    const mapped = routeToFile[urlPath] || (urlPath.startsWith('/') ? urlPath.slice(1) : urlPath);
    const absPath = path.join(STATIC_DIR, mapped);
    if (absPath.startsWith(STATIC_DIR) && fs.existsSync(absPath) && fs.statSync(absPath).isFile()) {
      sendStaticFile(res, absPath);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: String(error) }));
  }
});

const wss = new WebSocket.Server({ server: httpServer });

function getLanIPv4List() {
  try {
    const nets = os.networkInterfaces();
    const out = [];
    Object.values(nets).forEach((entries) => {
      (entries || []).forEach((entry) => {
        if (!entry) return;
        if (entry.family !== 'IPv4') return;
        if (entry.internal) return;
        if (!entry.address) return;
        out.push(entry.address);
      });
    });
    return Array.from(new Set(out));
  } catch (error) {
    return [];
  }
}

httpServer.listen(PORT, HOST, () => {
  console.log(`WebSocket server is listening on ws://${HOST}:${PORT}`);
  console.log('Open in your browser:');
  console.log(`  Admin -> http://localhost:${PORT}/admin`);
  console.log(`  Team A -> http://localhost:${PORT}/teamA`);
  console.log(`  Team B -> http://localhost:${PORT}/teamB`);
  console.log(`  Dashboard -> http://localhost:${PORT}/dashboard`);

  const lanIps = getLanIPv4List();
  if (lanIps.length) {
    const ip = lanIps[0];
    console.log('From other computers on the same network:');
    console.log(`  Admin -> http://${ip}:${PORT}/admin`);
    console.log(`  Team A -> http://${ip}:${PORT}/teamA`);
    console.log(`  Team B -> http://${ip}:${PORT}/teamB`);
    console.log(`  Dashboard -> http://${ip}:${PORT}/dashboard`);
  }
});

const state = {
  teamNames: { A: 'A', B: 'B' },
  totals: { A: 0, B: 0 },
  roundScores: { A: 0, B: 0 },
  scoredTeamsThisRound: new Set(),
  levelScores: {
    A: { 1: 0, 2: 0, 3: 0 },
    B: { 1: 0, 2: 0, 3: 0 },
  },
  completedLevels: {
    A: new Set(),
    B: new Set(),
  },
  session: {
    image: null,
    level: null,
    start: null,
    paused: false,
    endAt: null,
    timeLimit: 120,
    pausedRemaining: null,
    countdownEndAt: null,
    countdownTimeLimit: null,
    countdownSeconds: 0,
  },
  puzzleStates: {
    A: null,
    B: null,
  },
  memoryStates: {
    A: null,
    B: null,
  },
  wordStates: {
    A: null,
    B: null,
  },
  publicHost: null,
  gameHistory: loadGameHistoryFromDisk(),
  lastLoggedGameSignature: null,
};

let timerInterval = null;
let startCountdownTimeout = null;

function clearPendingStartCountdown(notify = false) {
  if (startCountdownTimeout) {
    clearTimeout(startCountdownTimeout);
    startCountdownTimeout = null;
  }
  state.session.countdownEndAt = null;
  state.session.countdownTimeLimit = null;
  state.session.countdownSeconds = 0;
  if (notify) {
    broadcast({ type: 'startCountdownCancel' });
  }
}

function computeTeamTotal(teamKey) {
  const byLevel = state.levelScores[teamKey] || {};
  return [1, 2, 3].reduce((sum, level) => sum + (Number(byLevel[level]) || 0), 0);
}

function areAllLevelsCompleteForTeam(teamKey) {
  const done = state.completedLevels[teamKey];
  if (!done || typeof done.has !== 'function') return false;
  return done.has(1) && done.has(2) && done.has(3);
}

function canDeclareFinalWinner() {
  return areAllLevelsCompleteForTeam('A') && areAllLevelsCompleteForTeam('B');
}

function getWinnerSummary(totalA, totalB) {
  if (!canDeclareFinalWinner()) {
    return {
      winnerKey: '',
      winnerName: 'Pending (complete all 3 levels)',
    };
  }
  if (totalA > totalB) {
    return { winnerKey: 'A', winnerName: state.teamNames.A || 'A' };
  }
  if (totalB > totalA) {
    return { winnerKey: 'B', winnerName: state.teamNames.B || 'B' };
  }
  return { winnerKey: '', winnerName: 'No winner (Tie)' };
}

function buildLevelScorePayload() {
  return {
    A: { ...state.levelScores.A },
    B: { ...state.levelScores.B },
  };
}

function isTimedRaceLevel(level, mode) {
  const l = Number(level);
  const m = String(mode || '').toLowerCase();
  if (l === 1 || l === 2) return true;
  return m === 'puzzle' || m === 'memory';
}

function buildGameHistoryEntry() {
  const totalA = Number(state.totals.A) || 0;
  const totalB = Number(state.totals.B) || 0;
  const winner = getWinnerSummary(totalA, totalB);
  return {
    id: Date.now(),
    playedAt: new Date().toISOString(),
    teams: {
      A: state.teamNames.A || 'A',
      B: state.teamNames.B || 'B',
    },
    levelScores: buildLevelScorePayload(),
    totals: { A: totalA, B: totalB },
    winnerKey: winner.winnerKey,
    winnerName: winner.winnerName,
  };
}

function maybeLogCompletedGame() {
  if (!canDeclareFinalWinner()) return;
  const entry = buildGameHistoryEntry();
  const signature = JSON.stringify({ teams: entry.teams, levelScores: entry.levelScores, totals: entry.totals });
  if (signature === state.lastLoggedGameSignature) return;

  state.lastLoggedGameSignature = signature;
  state.gameHistory.push(entry);
  if (state.gameHistory.length > 500) {
    state.gameHistory = state.gameHistory.slice(-500);
  }
  saveGameHistoryToDisk(state.gameHistory);
  broadcast({ type: 'gameLogged', entry, history: state.gameHistory });
}

function sendToClient(ws, msgObj) {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msgObj));
    }
  } catch (error) {
    console.error('Send to client failed:', error);
  }
}

function normalizeTeamKey(rawTeam) {
  const value = String(rawTeam || '').trim();
  if (!value) return '';
  if (/^A$/i.test(value) || /^team\s*A$/i.test(value) || /^teamA$/i.test(value)) return 'A';
  if (/^B$/i.test(value) || /^team\s*B$/i.test(value) || /^teamB$/i.test(value)) return 'B';

  const aName = String(state.teamNames.A || '').trim().toLowerCase();
  const bName = String(state.teamNames.B || '').trim().toLowerCase();
  const lower = value.toLowerCase();
  if (aName && lower === aName) return 'A';
  if (bName && lower === bName) return 'B';
  return '';
}

function getPublicHost() {
  if (state.publicHost) return state.publicHost;
  if (HOST && HOST !== '0.0.0.0') return `${HOST}:${PORT}`;
  return `localhost:${PORT}`;
}

function normalizeSharedImageUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;
  try {
    const base = `http://${getPublicHost()}`;
    const u = new URL(rawUrl, base);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
      const host = getPublicHost();
      const parts = host.split(':');
      u.hostname = parts[0];
      if (parts[1]) u.port = parts[1];
    }
    return u.toString();
  } catch (error) {
    return rawUrl;
  }
}

function saveDataUrlImage(dataUrl) {
  const m = String(dataUrl || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m) return null;
  const mime = m[1].toLowerCase();
  const b64 = m[2];
  const extByMime = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  const ext = extByMime[mime] || 'jpg';
  const fileName = `current-${Date.now()}.${ext}`;
  const absPath = path.join(UPLOAD_DIR, fileName);
  fs.writeFileSync(absPath, Buffer.from(b64, 'base64'));
  return `http://${getPublicHost()}/uploads/${fileName}`;
}

function resetRoundScoresOnly() {
  state.scoredTeamsThisRound.clear();
  state.roundScores = { A: 0, B: 0 };
}

function resetPuzzleStates() {
  state.puzzleStates = { A: null, B: null };
}

function resetLiveBoardStates() {
  resetPuzzleStates();
  state.memoryStates = { A: null, B: null };
  state.wordStates = { A: null, B: null };
}

function resetAllScores() {
  state.totals = { A: 0, B: 0 };
  state.roundScores = { A: 0, B: 0 };
  state.scoredTeamsThisRound.clear();
  state.levelScores = {
    A: { 1: 0, 2: 0, 3: 0 },
    B: { 1: 0, 2: 0, 3: 0 },
  };
  state.completedLevels = {
    A: new Set(),
    B: new Set(),
  };
}

function emitScoreUpdate() {
  const a = Number(state.totals.A) || 0;
  const b = Number(state.totals.B) || 0;
  const winner = getWinnerSummary(Number(state.totals.A) || 0, Number(state.totals.B) || 0);

  broadcast({
    type: 'scoreUpdate',
    totals: { A: a, B: b },
    totalFinal: { A: Number(state.totals.A) || 0, B: Number(state.totals.B) || 0 },
    levelScores: buildLevelScorePayload(),
    completedLevels: {
      A: Array.from(state.completedLevels.A || []),
      B: Array.from(state.completedLevels.B || []),
    },
    names: { ...state.teamNames },
    winnerKey: winner.winnerKey,
    winnerName: winner.winnerName,
  });
}

function buildGameStatePayload() {
  const scoreA = Number(state.totals.A) || 0;
  const scoreB = Number(state.totals.B) || 0;
  const winner = getWinnerSummary(Number(state.totals.A) || 0, Number(state.totals.B) || 0);
  const remaining = computeRemainingSeconds();
  return {
    type: 'gameState',
    level: state.session.level || null,
    imageUrl: state.session.image && state.session.image.url ? state.session.image.url : null,
    timer: {
      running: Boolean(state.session.start) && !state.session.paused && (remaining == null ? false : remaining > 0),
      paused: Boolean(state.session.paused),
      remaining: remaining == null ? null : remaining,
      timeLimit: Number(state.session.timeLimit) || 120,
      start: state.session.start || null,
    },
    scores: { A: scoreA, B: scoreB },
    totalFinal: { A: Number(state.totals.A) || 0, B: Number(state.totals.B) || 0 },
    levelScores: buildLevelScorePayload(),
    completedLevels: {
      A: Array.from(state.completedLevels.A || []),
      B: Array.from(state.completedLevels.B || []),
    },
    winnerKey: winner.winnerKey,
    winnerName: winner.winnerName,
    names: { ...state.teamNames },
  };
}

function emitGameState() {
  broadcast(buildGameStatePayload());
}

function stopTimerInterval() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function computeRemainingSeconds() {
  if (state.session.paused && Number.isFinite(state.session.pausedRemaining)) {
    return Math.max(0, Math.floor(state.session.pausedRemaining));
  }
  if (!state.session.endAt) return null;
  const remainingMs = state.session.endAt - Date.now();
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

function broadcastTimerTick() {
  const remaining = computeRemainingSeconds();
  if (remaining == null) return;
  const payload = {
    type: 'timer',
    remaining,
    timeLimit: Number(state.session.timeLimit) || 120,
    start: Number(state.session.start) || null,
    status: remaining <= 0 ? 'finished' : (state.session.paused ? 'paused' : 'running'),
  };
  broadcast(payload);
  if (remaining <= 0) {
    stopTimerInterval();
    state.session.start = null;
    state.session.endAt = null;
    state.session.paused = false;
    state.session.pausedRemaining = null;
    broadcast({ type: 'timerFinished', reason: 'timeout' });
    emitGameState();
  }
}

function startTimerSync(startMs, timeLimitSec) {
  const safeLimit = Math.max(1, Number(timeLimitSec) || 120);
  const safeStart = Number(startMs) || Date.now();
  state.session.start = safeStart;
  state.session.timeLimit = safeLimit;
  state.session.endAt = safeStart + safeLimit * 1000;
  state.session.paused = false;
  state.session.pausedRemaining = null;
  stopTimerInterval();
  timerInterval = setInterval(broadcastTimerTick, 1000);
  broadcastTimerTick();
}

function pauseTimerSync() {
  if (!state.session.start) return;
  const remaining = computeRemainingSeconds();
  state.session.paused = true;
  state.session.pausedRemaining = remaining == null ? null : remaining;
  stopTimerInterval();
}

function replayStateToClient(ws) {
  sendToClient(ws, buildGameStatePayload());
  // team names
  sendToClient(ws, { type: 'updateTeamName', team: 'A', name: state.teamNames.A || 'A' });
  sendToClient(ws, { type: 'updateTeamName', team: 'B', name: state.teamNames.B || 'B' });

  // totals / winner
  const a = Number(state.totals.A) || 0;
  const b = Number(state.totals.B) || 0;
  const winner = getWinnerSummary(Number(state.totals.A) || 0, Number(state.totals.B) || 0);
  sendToClient(ws, {
    type: 'scoreUpdate',
    totals: { A: a, B: b },
    totalFinal: { A: Number(state.totals.A) || 0, B: Number(state.totals.B) || 0 },
    levelScores: buildLevelScorePayload(),
    completedLevels: {
      A: Array.from(state.completedLevels.A || []),
      B: Array.from(state.completedLevels.B || []),
    },
    names: { ...state.teamNames },
    winnerKey: winner.winnerKey,
    winnerName: winner.winnerName,
  });

  sendToClient(ws, {
    type: 'gameHistory',
    history: state.gameHistory || [],
  });

  // game state snapshot
  if (state.session.level) sendToClient(ws, state.session.level);
  if (state.session.image) sendToClient(ws, state.session.image);
  if (state.session.start) {
    sendToClient(ws, {
      type: 'start',
      start: Number(state.session.start) || Date.now(),
      timeLimit: Number(state.session.timeLimit) || 120,
    });
  } else if (Number(state.session.countdownEndAt) > Date.now()) {
    sendToClient(ws, {
      type: 'startCountdown',
      seconds: Math.max(1, Math.ceil((Number(state.session.countdownEndAt) - Date.now()) / 1000)),
      endsAt: Number(state.session.countdownEndAt),
      timeLimit: Number(state.session.countdownTimeLimit) || Number(state.session.timeLimit) || 120,
    });
  }
  if (state.session.paused) sendToClient(ws, { type: 'pause' });
  const remaining = computeRemainingSeconds();
  if (remaining != null) {
    sendToClient(ws, {
      type: 'timer',
      remaining,
      timeLimit: Number(state.session.timeLimit) || 120,
      start: Number(state.session.start) || null,
      status: remaining <= 0 ? 'finished' : (state.session.paused ? 'paused' : 'running'),
    });
  }

  if (state.puzzleStates && state.puzzleStates.A && Array.isArray(state.puzzleStates.A.layout)) {
    sendToClient(ws, { type: 'puzzleState', payload: { ...state.puzzleStates.A } });
  }
  if (state.puzzleStates && state.puzzleStates.B && Array.isArray(state.puzzleStates.B.layout)) {
    sendToClient(ws, { type: 'puzzleState', payload: { ...state.puzzleStates.B } });
  }
  if (state.memoryStates && state.memoryStates.A && Array.isArray(state.memoryStates.A.cards)) {
    sendToClient(ws, { type: 'memoryState', payload: { ...state.memoryStates.A } });
  }
  if (state.memoryStates && state.memoryStates.B && Array.isArray(state.memoryStates.B.cards)) {
    sendToClient(ws, { type: 'memoryState', payload: { ...state.memoryStates.B } });
  }
  if (state.wordStates && state.wordStates.A && state.wordStates.A.letter) {
    sendToClient(ws, { type: 'wordState', payload: { ...state.wordStates.A } });
  }
  if (state.wordStates && state.wordStates.B && state.wordStates.B.letter) {
    sendToClient(ws, { type: 'wordState', payload: { ...state.wordStates.B } });
  }
}

function broadcast(msgObj) {
  const payload = JSON.stringify(msgObj);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

wss.on('connection', (ws, req) => {
  console.log('Client connected');
  if (req && req.headers && req.headers.host) {
    state.publicHost = req.headers.host;
  }
  replayStateToClient(ws);

  ws.on('message', (message) => {
    const raw = Buffer.isBuffer(message) ? message.toString('utf8') : String(message);
    console.log('Received message:', raw); // Log received messages
    let data;
    try {
      data = JSON.parse(raw);
    } catch (error) {
      console.error('Invalid JSON message:', error);
      return;
    }

    if (!data || typeof data !== 'object' || !data.type) {
      return;
    }

    if (data.type === 'stateRequest') {
      replayStateToClient(ws);
      return;
    }

    if (data.type === 'updateTeamName') {
      const teamKey = normalizeTeamKey(data.team);
      if (teamKey && typeof data.name === 'string' && data.name.trim()) {
        state.teamNames[teamKey] = data.name.trim();
      }
      console.log('Broadcasting updateTeamName message:', data);
      broadcast({
        type: 'updateTeamName',
        team: data.team,
        name: data.name,
      });
      emitScoreUpdate();
      emitGameState();
      return;
    }

    // Clients send `progress`, but admin listeners expect `teamProgress`.
    if (data.type === 'progress') {
      const payload = data.payload || {};
      const teamKey = normalizeTeamKey(payload.team);
      if (teamKey) {
        payload.team = teamKey;
        payload.teamDisplay = state.teamNames[teamKey] || teamKey;
        // live score shown during a running round
        const matched = Number(payload.matched) || 0;
        // Ignore late progress after this team has already finalized the round.
        if (!state.scoredTeamsThisRound.has(teamKey)) {
          state.roundScores[teamKey] = Math.max(0, matched * 10);
        }
      }
      console.log('Broadcasting teamProgress message:', payload);
      broadcast({ type: 'teamProgress', payload });
      emitScoreUpdate();
      emitGameState();
      return;
    }

    if (data.type === 'puzzleState') {
      const payload = data.payload || {};
      const teamKey = normalizeTeamKey(payload.team || data.team);
      const layout = Array.isArray(payload.layout)
        ? payload.layout.map((id) => (id == null ? null : String(id)))
        : null;
      if (!teamKey || !layout || !layout.length) return;

      const statePayload = {
        team: teamKey,
        teamDisplay: state.teamNames[teamKey] || teamKey,
        layout,
        timestamp: Date.now(),
      };
      state.puzzleStates[teamKey] = statePayload;
      broadcast({ type: 'puzzleState', payload: statePayload });
      return;
    }

    if (data.type === 'memoryState') {
      const payload = data.payload || {};
      const teamKey = normalizeTeamKey(payload.team || data.team);
      const cards = Array.isArray(payload.cards) ? payload.cards : null;
      if (!teamKey || !cards || !cards.length) return;
      const normalizedCards = cards.map((c) => {
        const card = c || {};
        return {
          val: String(card.val || ''),
          revealed: Boolean(card.revealed),
          matched: Boolean(card.matched),
        };
      });
      const statePayload = {
        team: teamKey,
        teamDisplay: state.teamNames[teamKey] || teamKey,
        pairs: Math.max(0, Number(payload.pairs) || 0),
        matched: Math.max(0, Number(payload.matched) || 0),
        cards: normalizedCards,
        timestamp: Date.now(),
      };
      state.memoryStates[teamKey] = statePayload;
      broadcast({ type: 'memoryState', payload: statePayload });
      return;
    }

    if (data.type === 'wordState') {
      const payload = data.payload || {};
      const teamKey = normalizeTeamKey(payload.team || data.team);
      const letter = String(payload.letter || '').toUpperCase();
      const categories = Array.isArray(payload.categories) ? payload.categories.map((c) => String(c || '')) : [];
      const inputs = Array.isArray(payload.inputs)
        ? payload.inputs.map((row) => ({
            value: String((row && row.value) || ''),
            invalid: Boolean(row && row.invalid),
            skipped: Boolean(row && row.skipped),
          }))
        : [];
      if (!teamKey || !letter) return;
      const statePayload = {
        team: teamKey,
        teamDisplay: state.teamNames[teamKey] || teamKey,
        letter,
        categories,
        inputs,
        correctCount: Math.max(0, Number(payload.correctCount) || 0),
        total: Math.max(0, Number(payload.total) || categories.length || inputs.length || 0),
        status: String(payload.status || ''),
        finished: Boolean(payload.finished),
        timestamp: Date.now(),
      };
      state.wordStates[teamKey] = statePayload;
      broadcast({ type: 'wordState', payload: statePayload });
      return;
    }

    if (data.type === 'deleteHistoryEntry') {
      const rawEntryId = data.entryId;
      if (rawEntryId == null) return;
      const targetKey = String(rawEntryId);
      const before = Array.isArray(state.gameHistory) ? state.gameHistory.length : 0;
      state.gameHistory = (state.gameHistory || []).filter((entry) => String(entry && entry.id) !== targetKey);
      const after = state.gameHistory.length;
      if (after !== before) {
        saveGameHistoryToDisk(state.gameHistory);
        state.lastLoggedGameSignature = null;
      }
      broadcast({
        type: 'gameHistory',
        history: state.gameHistory || [],
      });
      return;
    }

    if (data.type === 'start' || data.type === 'level' || data.type === 'next' || data.type === 'reset') {
      resetRoundScoresOnly();
    }

    if (data.type === 'reset' || data.type === 'resetAll' || data.type === 'level' || data.type === 'image' || data.type === 'next') {
      resetLiveBoardStates();
    }

    if (data.type === 'start') {
      clearPendingStartCountdown(true);
      stopTimerInterval();
      state.session.start = null;
      state.session.endAt = null;
      state.session.paused = false;
      state.session.pausedRemaining = null;

      const countdownSeconds = Math.max(1, Math.floor(Number(data.countdownSeconds) || 5));
      const limitValue = Number(data.timeLimit) || 120;
      data.timeLimit = limitValue;
      const countdownEndAt = Date.now() + (countdownSeconds * 1000);
      state.session.countdownEndAt = countdownEndAt;
      state.session.countdownTimeLimit = limitValue;
      state.session.countdownSeconds = countdownSeconds;

      broadcast({
        type: 'startCountdown',
        seconds: countdownSeconds,
        endsAt: countdownEndAt,
        timeLimit: limitValue,
      });

      startCountdownTimeout = setTimeout(() => {
        startCountdownTimeout = null;
        const startValue = Date.now();
        clearPendingStartCountdown(false);
        startTimerSync(startValue, limitValue);
        broadcast({ type: 'start', start: startValue, timeLimit: limitValue });
        emitGameState();
      }, countdownSeconds * 1000);

      emitGameState();
      return;
    }

    if (data.type === 'pause') {
      clearPendingStartCountdown(true);
      pauseTimerSync();
    }

    if (data.type === 'image' && data.url) {
      let sharedUrl = data.url;
      if (typeof data.url === 'string' && data.url.startsWith('data:image/')) {
        const saved = saveDataUrlImage(data.url);
        if (saved) sharedUrl = saved;
      } else {
        sharedUrl = normalizeSharedImageUrl(data.url);
      }
      data.url = sharedUrl;
      state.session.image = { type: 'image', url: sharedUrl };
    }

    if (data.type === 'level') {
      clearPendingStartCountdown(true);
      if (data.mode === 'puzzle' && data.url) {
        data.url = normalizeSharedImageUrl(data.url);
      }
      state.session.level = { ...data };
      if (data.mode === 'puzzle' && data.url) {
        state.session.image = { type: 'image', url: data.url };
      }
    }

    if (data.type === 'next' && data.url) {
      clearPendingStartCountdown(true);
      state.session.image = { type: 'image', url: data.url };
    }

    if (data.type === 'reset') {
      clearPendingStartCountdown(true);
      stopTimerInterval();
      state.session.start = null;
      state.session.endAt = null;
      state.session.paused = false;
      state.session.pausedRemaining = null;
    }

    if (data.type === 'resetAll') {
      clearPendingStartCountdown(true);
      resetAllScores();
      state.lastLoggedGameSignature = null;
      stopTimerInterval();
      state.session.start = null;
      state.session.endAt = null;
      state.session.paused = false;
      state.session.pausedRemaining = null;
      broadcast(data);
      emitScoreUpdate();
      emitGameState();
      return;
    }

    if (data.type === 'roundComplete') {
      const payload = data.payload || {};
      const teamKey = normalizeTeamKey(payload.team || data.team);
      if (teamKey) {
        // Make round completion idempotent for each team in the current round.
        if (state.scoredTeamsThisRound.has(teamKey)) {
          broadcast({ type: 'roundComplete', payload: { ...payload, team: teamKey, teamDisplay: state.teamNames[teamKey] || teamKey } });
          emitGameState();
          return;
        }

        payload.team = teamKey;
        payload.teamDisplay = state.teamNames[teamKey] || teamKey;
        const levelFromPayload = Number(payload.level);
        const activeLevel = Number(state.session.level && state.session.level.level);
        const mode = String(payload.mode || (state.session.level && state.session.level.mode) || '').toLowerCase();
        let level = Number.isFinite(levelFromPayload) && levelFromPayload > 0
          ? levelFromPayload
          : (Number.isFinite(activeLevel) && activeLevel > 0 ? activeLevel : null);
        if (!level) {
          if (mode === 'memory') level = 2;
          else if (mode === 'word') level = 3;
          else level = 1;
        }

        const isFirstFinisherThisRound = state.scoredTeamsThisRound.size === 0;
        let speedBonus = 0;
        if (
          isFirstFinisherThisRound &&
          isTimedRaceLevel(level, mode) &&
          String(payload.reason || '').toLowerCase() === 'complete'
        ) {
          const clientRemaining = Number(payload.remaining);
          const serverRemaining = computeRemainingSeconds();
          const remaining = Number.isFinite(clientRemaining) ? clientRemaining : serverRemaining;
          const levelTimeLimit = Math.max(
            1,
            Number(payload.timeLimit)
            || Number(state.session.level && state.session.level.timeLimit)
            || Number(state.session.timeLimit)
            || 120
          );
          const halfTime = Math.ceil(levelTimeLimit / 2);
          speedBonus = (Number.isFinite(remaining) && remaining >= halfTime)
            ? Math.max(0, Math.floor(remaining))
            : 0;
        }

        payload.level = level;
        payload.mode = mode || payload.mode;
        payload.bonus = speedBonus;

        // finalized score contributes to cumulative total by level (L1 + L2 + L3)
        const finalScore = Math.max(0, (Number(payload.score) || 0) + (Number(payload.bonus) || 0));
        if (level && [1, 2, 3].includes(level)) {
          if (!state.levelScores[teamKey]) state.levelScores[teamKey] = { 1: 0, 2: 0, 3: 0 };
          state.levelScores[teamKey][level] = finalScore;
          if (!state.completedLevels[teamKey]) state.completedLevels[teamKey] = new Set();
          state.completedLevels[teamKey].add(level);
        }

        // If one team completes level 1/2 first, end this level immediately for everyone.
        if (isFirstFinisherThisRound && isTimedRaceLevel(level, mode)) {
          stopTimerInterval();
          state.session.start = null;
          state.session.endAt = null;
          state.session.paused = false;
          state.session.pausedRemaining = null;

          // Finalize opponent score immediately from latest progress snapshot,
          // so round totals are complete even before loser client submits.
          const otherTeamKey = teamKey === 'A' ? 'B' : 'A';
          if (!state.scoredTeamsThisRound.has(otherTeamKey)) {
            const opponentBaseScore = Math.max(0, Number(state.roundScores[otherTeamKey]) || 0);
            if (!state.levelScores[otherTeamKey]) state.levelScores[otherTeamKey] = { 1: 0, 2: 0, 3: 0 };
            state.levelScores[otherTeamKey][level] = opponentBaseScore;
            if (!state.completedLevels[otherTeamKey]) state.completedLevels[otherTeamKey] = new Set();
            state.completedLevels[otherTeamKey].add(level);
            state.scoredTeamsThisRound.add(otherTeamKey);
            state.roundScores[otherTeamKey] = 0;
            state.totals[otherTeamKey] = computeTeamTotal(otherTeamKey);
          }

          broadcast({
            type: 'timerFinished',
            reason: 'opponentComplete',
            winnerTeam: teamKey,
            level,
          });
        }

        state.scoredTeamsThisRound.add(teamKey);
        state.roundScores[teamKey] = 0;
        state.totals[teamKey] = computeTeamTotal(teamKey);
        maybeLogCompletedGame();
      }
      broadcast({ type: 'roundComplete', payload });
      emitScoreUpdate();
      emitGameState();
      return;
    }

    // Forward all other control messages as-is (start/reset/level/image/pause/etc.).
    console.log(`Broadcasting ${data.type} message`);
    broadcast(data);
    if (['start', 'pause', 'image', 'level', 'next', 'reset'].includes(data.type)) {
      emitGameState();
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('Client socket error:', error);
  });
});

wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

console.log(`WebSocket coordinator running on ws://${HOST}:${PORT}`);
