const { generateHash } = require('../utils/generate-hash');

class Attempt {
  constructor({ playerId, teamId, turnId, clueId, roundId }) {
    this.id = generateHash();
    this.playerId = playerId;
    this.teamId = teamId;
    this.roundId = roundId;
    this.turnId = turnId;
    this.clueId = clueId;
    this.status = 'acting';
  }

  skipped() {
    this.status = 'skipped';
  }

  guessed() {
    this.status = 'guessed';
  }

  timedOut() {
    this.status = 'timed-out';
  }
}

module.exports = { Attempt };
