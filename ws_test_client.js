const WebSocket = require('ws');

const ws = new WebSocket('ws://127.0.0.1:8010');

ws.on('open', () => {
  console.log('Connected to WebSocket server');

  // Simulate sending an updateTeamName message
  const teamMessage = {
    type: 'updateTeamName',
    team: 'A',
    name: 'Team Alpha'
  };
  ws.send(JSON.stringify(teamMessage));
  console.log('Sent:', teamMessage);

  // Simulate sending a level message
  const levelMessage = {
    type: 'level',
    mode: 'puzzle',
    level: 1,
    url: 'https://example.com/puzzle.jpg'
  };
  ws.send(JSON.stringify(levelMessage));
  console.log('Sent:', levelMessage);
});

ws.on('message', (data) => {
  console.log('Received:', data);
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('WebSocket connection closed');
});