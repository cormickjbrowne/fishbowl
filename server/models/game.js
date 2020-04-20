const EventEmitter = require('events');
const { generateHash, getRandom, last, nextIndex, indexById } = require('../utils');
const { Round } = require('./round');
const { Team } = require('./team');
const { Clue } = require('./clue');
const { Turn } = require('./turn');
const { Attempt } = require('./attempt');

const NUM_CLUES = 2;
const NUM_TEAMS = 2;
const NUM_ROUNDS = 4;
const NUM_SECONDS_PER_TURN = 15;

class Game {
  constructor(id) {
      this.id = id || generateHash();
      this.status = 'waiting-for-players-to-join';
      this.currentAttemptId = null;
      this.currentActorId = null;
      this.currentTurnId = null;
      this.currentClueId = null;

      const rounds = ['taboo', 'charades', 'one-word', 'sheet'].map(type => new Round(type));
      this.roundIds = rounds.map(round => round.id);
      this.currentRoundIndex = 0;
      this.rounds = indexById(rounds);

      const teams = new Array(NUM_TEAMS).fill(1).map((_, i) => new Team(`Team ${i + 1}`));
      this.teamIds = teams.map(team => team.id);
      this.currentTeamIndex = 0;
      this.teams = indexById(teams);

      this.players = {};
      this.clues = {};
      this.turns = {};
      this.attempts = {};

      this.timeRemaining = NUM_SECONDS_PER_TURN;
      this.events = new EventEmitter();
  }

  emitStateChange() {
    this.events.emit('state-change');
  }

  add(type, instance) {
    this[`${type}s`][instance.id] = instance;
  }

  get(type, id) {
    return typeof id !== 'undefined' ? this[`${type}s`][id] : Object.values(this[type]);
  }

  getActor() {
    return this.get('player', this.currentActorId);
  }

  getCurrentRound() {
    return this.get('round', this.roundIds[this.currentRoundIndex]);
  }

  getCurrentTurn() {
    return this.get('turn', this.currentTurnId);
  }

  getCurrentAttempt() {
    return this.get('attempt', this.currentAttemptId);
  }

  getTeamWithLeastPlayers() {
    const teams = this.teamIds.map(id => this.teams[id]);
    let teamId;
    let numPlayers = Number.POSITIVE_INFINITY;
    for (let team of teams) {
      const numPlayersOnTeam = team.playerIds.length;
      if (numPlayersOnTeam < numPlayers) {
        numPlayers = numPlayersOnTeam;
        teamId = team.id;
      }
    }
    return this.teams[teamId];
  }

  addPlayer(player) {
    const team = this.getTeamWithLeastPlayers();
    team.addPlayer(player);
    player.joinTeam(team.id);
    player.joinGame(this.id);
    this.players[player.id] = player;
    this.emitStateChange();
  }

  pickTeams() {
    this.status = 'picking-teams';
    this.emitStateChange();
  }

  changeTeams(teams) {
    Object.values(teams).forEach(team => {
      this.teams[team.id].playerIds = team.playerIds;
    });
    this.emitStateChange();
  }

  removePlayer(player) {
    console.log('player left:', player.name);
    const team = this.teams[player.teamId];
    team.removePlayer(player.id);
    player.leaveGame();
    if (this.status === 'waiting-for-players-to-join') {
      this.deletePlayer(player);
    }
    this.emitStateChange();
  }

  deletePlayer(player) {
    delete this.players[player.id];
  }

  nextPlayer() {
    const team = this.nextTeam();
    const nextPlayer = team.nextPlayer(this);
    this.currentActorId = nextPlayer.id;
    return nextPlayer;
  }

  nextTeam() {
    const nextTeamIndex = nextIndex(this.teamIds, this.currentTeamIndex);
    const nextTeamId = this.teamIds[nextTeamIndex];
    this.currentTeamIndex = nextTeamIndex;
    return this.get('team', nextTeamId);
  }

  getCluesNotGuessedThisRoundThatHaveNotBeenSkipped() {
    return this.getCluesNotGuessedThisRound().filter(clue => {
      const attempts = clue.attemptIds.map(id => this.get('attempt', id));
      const attemptsThisRound = attempts.filter(attempt => attempt.roundId === this.getCurrentRound().id);
      return !attemptsThisRound.find(attempt => attempt.status === 'skipped' && attempt.playerId === this.currentActorId);
    });
  }

  getCluesNotGuessedThisRound() {
    return this.get('clues').filter(clue => {
      const attempts = clue.attemptIds.map(id => this.get('attempt', id));
      const attemptsThisRound = attempts.filter(attempt => attempt.roundId === this.getCurrentRound().id);
      return !attemptsThisRound.find(attempt => attempt.status === 'guessed');
    });
  }

  getNextClue() {
    const currentRound = this.getCurrentRound();
    // find clues that don't have an attempt from this round with a status of guessed
    let clues = this.getCluesNotGuessedThisRoundThatHaveNotBeenSkipped();

    if (!clues.length) {
      clues = this.getCluesNotGuessedThisRound();
    }

    if (!clues.length) {
      throw new Error('All clues guessed this round.');
    }

    return getRandom(clues);
  }

  readyToPlay() {
    return this.get('players')
      .filter(player => player.status === 'playing')
      .every(player => player.hasClues());
  }

  startEnteringClues() {
    this.status = 'entering-clues';
    this.emitStateChange();
  }

  addClues(clueValues, player) {
    const clues = clueValues.map(value => new Clue({ value, playerId: player.id, gameId: this.id }));
    clues.forEach(clue => {
      this.clues[clue.id] = clue;
    });
    player.addClues(clues);

    if (this.readyToPlay()) {
      this.status = 'ready-to-play';
    }
    this.emitStateChange();
  }

  startGame() {
    console.log('start game');
    this.status = 'ready-to-act';
    this.currentActorId = this.teams[this.teamIds[0]].playerIds[0];
    this.emitStateChange();
  }

  startActing() {
    console.log('acting started');
    this.status = 'acting';
    const player = this.getActor();
    const round = this.getCurrentRound();
    const turn = new Turn({ playerId: player.id, roundId: round.id });
    this.currentTurnId = turn.id;
    player.addTurn(turn);
    round.addTurn(turn);
    this.add('turn', turn);
    this.attemptNextClue();
    this.startTimer();
    this.emitStateChange();
  }

  stopActing() {
    console.log('stop acting');
    this.stopTimer();
    this.attempts[this.currentAttemptId].timedOut();
    this.turnOver();
  }

  startTimer() {
    console.log('start timer.');
    const intervalId = setInterval(() => {
      if (this.timeRemaining <= 0) {
        this.stopActing();
      } else {
        this.timeRemaining--;
      }
      this.emitStateChange();
    }, 1000);
    this.getIntervalId = () => intervalId;
  }

  stopTimer() {
    console.log('stop timer.');
    if (typeof this.getIntervalId === 'function') {
      clearInterval(this.getIntervalId());
    }
  }

  turnOver() {
    console.log('Turn ended.');
    this.status = 'ready-to-act';
    this.timeRemaining = NUM_SECONDS_PER_TURN;
    this.nextPlayer();
    this.events.emit('state-change', this);
  }

  attemptNextClue() {
    console.log('attempting next clue');
    let clue;
    try {
      clue = this.getNextClue();
    } catch (err) {
      this.status = 'round-over';
      this.stopTimer();
      this.emitStateChange();
      return;
    }
    this.currentClueId = clue.id;
    const actor = this.getActor();
    const turn = this.get('turn', last(actor.turnIds));
    const round = this.getCurrentRound();
    const attempt = new Attempt({
      playerId: actor.id,
      teamId: actor.teamId,
      turnId: turn.id,
      roundId: round.id,
      clueId: clue.id
    });
    this.currentAttemptId = attempt.id;
    clue.addAttempt(attempt);
    turn.addAttempt(attempt);
    actor.addAttempt(attempt);
    this.add('attempt', attempt);
  }

  clueGuessed() {
    console.log('clue guessed');
    const attempt = this.getCurrentAttempt();
    attempt.guessed();
    this.attemptNextClue();
    this.emitStateChange();
  }

  clueSkipped() {
    console.log('clue skipped');
    const attempt = this.getCurrentAttempt();
    attempt.skipped();
    this.attemptNextClue();
    this.emitStateChange();
  }

  nextRound() {
    console.log('next round');
    const isLastRound = this.currentRoundIndex === this.roundIds.length - 1;
    if (isLastRound) {
      this.status = 'game-over';
      this.events.emit('state-change', this);
      return;
    }

    this.currentRoundIndex++;

    if (!this.timeRemaining) {
      this.nextPlayer();
    }

    this.status = 'ready-to-act';
    this.emitStateChange();
  }

  newGame() {
      this.status = 'picking-teams';
      this.currentAttemptId = null;
      this.currentActorId = null;
      this.currentTurnId = null;
      this.currentClueId = null;

      this.currentRoundIndex = 0;
      this.currentTeamIndex = 0;

      this.clues = {};
      this.turns = {};
      this.attempts = {};

      this.get('players').forEach(player => player.status === 'playing' ? player.reset() : this.deletePlayer(player));
      this.get('teams').forEach(team => team.reset());
      this.get('rounds').forEach(round => round.reset());
      this.emitStateChange();
  }
}

module.exports = {
  Game
};
