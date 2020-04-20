const { generateHash } = require('../utils/generate-hash');

class Turn {
  constructor({ playerId, roundId }) {
    this.id = generateHash();
    this.playerId = playerId;
    this.roundId = roundId;
    this.attemptIds = [];
  }

  addAttempt(attempt) {
    this.attemptIds.push(attempt.id);
  }
}

module.exports = { Turn };
