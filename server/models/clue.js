const { generateHash } = require('../utils/generate-hash');

class Clue {
  constructor({ value, playerId, gameId }) {
    this.id = generateHash();
    this.createdByPlayerId = playerId;
    this.value = value;
    this.gameId = gameId;
    this.attemptIds = [];
  }

  addAttempt(attempt) {
    this.attemptIds.push(attempt.id);
  }

  attemptsThisRound(game) {
    const attempts = this.attemptIds.map(id => game.attempts[id]);
    return attempts.filter(attempt => attempt.fromThisRound(game));
  }

  attemptsWithStatus(attempt, status) {
    return attempts.find(attempt => attempt.status === status);
  }

  guessedThisRound(game) {
    return this.attemptsWithStatus(this.attemptsThisRound(game), 'guessed');
  }

  skippedByCurrentPlayerThisRound(game) {
    const skippedAttempts = this.attemptsWithStatus(this.attemptsThisRound(game), 'skipped');
    return skippedAttempts.filter(attempt => attempt.playerId === game.currentActorId);
  }
}

module.exports = {
  Clue
};
