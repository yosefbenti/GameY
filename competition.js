// competition.js
// Core algorithm for 6-level two-player competition

const gameState = {
  currentLevel: 1,
  maxLevel: 6,
  status: "running", // running | ended
  scores: {
    A: 0,
    B: 0
  }
};

// Called when a level ends
function endLevel({ winner, scoreA, scoreB }) {
  if (gameState.status === "ended") return;

  // Update scores
  if (winner === "A") {
    gameState.scores.A += scoreA;
    gameState.scores.B += scoreB;
  } else if (winner === "B") {
    gameState.scores.B += scoreB;
    gameState.scores.A += scoreA;
  } else {
    // DRAW: award partial points
    gameState.scores.A += scoreA;
    gameState.scores.B += scoreB;
  }

  gameState.currentLevel++;
  checkGameCompletion();
}

function checkGameCompletion() {
  if (gameState.currentLevel > gameState.maxLevel) {
    endGame();
  }
}

function endGame() {
  gameState.status = "ended";

  let finalWinner;
  if (gameState.scores.A > gameState.scores.B) {
    finalWinner = "TEAM A";
  } else if (gameState.scores.B > gameState.scores.A) {
    finalWinner = "TEAM B";
  } else {
    finalWinner = "DRAW";
  }

  displayResultOnAllBoards(finalWinner);
  // Protection: stop timers, disable boards, prevent updates
  stopTimersAndDisableBoards();
}

function displayResultOnAllBoards(finalWinner) {
  // Implement board update logic here
  // Audience board mirrors current level, scores, and final winner
}

function stopTimersAndDisableBoards() {
  // Implement timer stop and board disable logic here
}

// Export functions for use in game logic
module.exports = {
  gameState,
  endLevel,
  checkGameCompletion,
  endGame
};
