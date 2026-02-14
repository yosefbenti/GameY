// Simple WebSocket coordinator for game/admin messages.
// Requires: npm install ws
const fs = require('fs');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

const HOST = process.env.WS_HOST || '0.0.0.0';
const PORT = Number(process.env.WS_PORT) || 8000;

const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const httpServer = http.createServer((req, res) => {
  try {
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
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, ws: `ws://${HOST}:${PORT}` }));
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: String(error) }));
  }
});

const wss = new WebSocket.Server({ server: httpServer });

httpServer.listen(PORT, HOST, () => {
  console.log(`WebSocket server is listening on ws://${HOST}:${PORT}`);
});

const state = {
  teamNames: { A: 'A', B: 'B' },
  totals: { A: 0, B: 0 },
  roundScores: { A: 0, B: 0 },
  scoredTeamsThisRound: new Set(),
  session: {
    image: null,
    level: null,
    start: null,
    paused: false,
    endAt: null,
    timeLimit: 120,
    pausedRemaining: null,
  },
  publicHost: null,
};

let timerInterval = null;

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

function resetAllScores() {
  state.totals = { A: 0, B: 0 };
  state.roundScores = { A: 0, B: 0 };
  state.scoredTeamsThisRound.clear();
}

function emitScoreUpdate() {
  const a = (Number(state.totals.A) || 0) + (Number(state.roundScores.A) || 0);
  const b = (Number(state.totals.B) || 0) + (Number(state.roundScores.B) || 0);
  let winnerKey = '';
  if (a > b) winnerKey = 'A';
  else if (b > a) winnerKey = 'B';

  broadcast({
    type: 'scoreUpdate',
    totals: { A: a, B: b },
    names: { ...state.teamNames },
    winnerKey,
    winnerName: winnerKey ? (state.teamNames[winnerKey] || winnerKey) : 'No winner',
  });
}

function buildGameStatePayload() {
  const scoreA = (Number(state.totals.A) || 0) + (Number(state.roundScores.A) || 0);
  const scoreB = (Number(state.totals.B) || 0) + (Number(state.roundScores.B) || 0);
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
  const a = (Number(state.totals.A) || 0) + (Number(state.roundScores.A) || 0);
  const b = (Number(state.totals.B) || 0) + (Number(state.roundScores.B) || 0);
  let winnerKey = '';
  if (a > b) winnerKey = 'A';
  else if (b > a) winnerKey = 'B';
  sendToClient(ws, {
    type: 'scoreUpdate',
    totals: { A: a, B: b },
    names: { ...state.teamNames },
    winnerKey,
    winnerName: winnerKey ? (state.teamNames[winnerKey] || winnerKey) : 'No winner',
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
        state.roundScores[teamKey] = Math.max(0, matched * 10);
      }
      console.log('Broadcasting teamProgress message:', payload);
      broadcast({ type: 'teamProgress', payload });
      emitScoreUpdate();
      emitGameState();
      return;
    }

    if (data.type === 'start' || data.type === 'level' || data.type === 'next' || data.type === 'reset') {
      resetRoundScoresOnly();
    }

    if (data.type === 'start') {
      const startValue = Date.now();
      const limitValue = Number(data.timeLimit) || 120;
      data.start = startValue;
      data.timeLimit = limitValue;
      startTimerSync(startValue, limitValue);
    }

    if (data.type === 'pause') {
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
      if (data.mode === 'puzzle' && data.url) {
        data.url = normalizeSharedImageUrl(data.url);
      }
      state.session.level = { ...data };
      if (data.mode === 'puzzle' && data.url) {
        state.session.image = { type: 'image', url: data.url };
      }
    }

    if (data.type === 'next' && data.url) {
      state.session.image = { type: 'image', url: data.url };
    }

    if (data.type === 'reset') {
      stopTimerInterval();
      state.session.start = null;
      state.session.endAt = null;
      state.session.paused = false;
      state.session.pausedRemaining = null;
    }

    if (data.type === 'resetAll') {
      resetAllScores();
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
        payload.team = teamKey;
        payload.teamDisplay = state.teamNames[teamKey] || teamKey;
        // finalized round score overrides any live running score
        const finalScore = Number(payload.score) || 0;
        state.roundScores[teamKey] = Math.max(0, finalScore);
        if (!state.scoredTeamsThisRound.has(teamKey)) {
          state.totals[teamKey] = (Number(state.totals[teamKey]) || 0) + state.roundScores[teamKey];
          state.roundScores[teamKey] = 0;
          state.scoredTeamsThisRound.add(teamKey);
        }
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
