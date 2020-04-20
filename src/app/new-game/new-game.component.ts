import { Component, OnInit } from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { Game } from '../models/game.interface';
import { State } from '../models/state.interface';
import { Player } from '../models/player.interface';
import { GameService } from '../game.service';

@Component({
  selector: 'app-new-game',
  templateUrl: './new-game.component.html',
  styleUrls: ['./new-game.component.scss']
})
export class NewGameComponent implements OnInit {

  public game: Game;
  public gameId: string;
  public currentPlayerId: string;
  public socket: any;
  public playerName: string;
  public players: Player[] = [];
  public clue: string;
  public clues: string[] = [];
  public actingPlayer: Player;
  public timeLeft: number;
  public numClues = 2;

  constructor(private gameService: GameService, private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this.gameId = params.id;
    });

    this.gameService.state$.subscribe((state: State) => {
      const { game, currentPlayerId } = state;
      this.game = game;
      this.currentPlayerId = currentPlayerId;
      if (!game) return;
      this.players = Object.values(game.players);
      this.actingPlayer = game.players[game.currentActorId];
      this.timeLeft = game.timeRemaining;
    });
  }

  get teams() {
    return this.game.teamIds.map(id => this.game.teams[id]);
  }

  getCluesGuessedThisTurn() {
    return Object.values(this.game.attempts).filter(attempt => {
     return attempt.turnId === this.game.currentTurnId
      && attempt.status === 'guessed';
    }).length;
  }

  getPointsForTeam(teamId) {
    return Object.values(this.game.attempts).filter(attempt => {
     return attempt.teamId === teamId
      && attempt.status === 'guessed';
    }).length;
  }

  get currentPlayer() {
    return this.game.players[this.currentPlayerId];
  }

  getActor() {
    return this.game.players[this.game.currentActorId];
  }

  getCurrentClue() {
    return this.game.clues[this.game.currentClueId];
  }

  get currentPlayerName() {
    const players = this.game && this.game.players || {};
    const player = players[this.currentPlayerId];
    return player && player.name || '';
  }

  get isActor() {
    return this.currentPlayerId === this.game.currentActorId;
  }

  joinGame() {
    this.gameService.joinGame(this.playerName, this.gameId);
    this.playerName = '';
  }

  saveClue() {
    this.clues.push(this.clue);
    this.clue = '';
  }

  submitClues() {
    this.gameService.submitClues(this.clues);
    this.clues = [];
  }

  pickTeams() {
    this.gameService.pickTeams();
  }

  startWritingClues() {
    this.gameService.startEnteringClues();
  }

  startGame() {
    this.gameService.startGame();
  }

  startTurn() {
    this.gameService.startTurn();
  }

  startNextRound() {
    this.gameService.startNextRound();
  }

  startTimer() {
    this.gameService.startActing();
  }

  guessedClue() {
    this.gameService.guessedClue();
  }

  skipClue() {
    this.gameService.skipClue();
  }

  getCurrentRoundId() {
    return this.game.roundIds[this.game.currentRoundIndex];
  }

  get numCluesRemaining() {
     const clues = Object.values(this.game.clues);
     const currentRoundId = this.getCurrentRoundId();
     return clues.filter(clue => !clue.attemptIds.map(id => this.game.attempts[id]).find(attempt => attempt.roundId === currentRoundId && attempt.status === 'guessed')).length;
  }

  get numCluesGuessedThisTurn() {
    const attempts = Object.values(this.game.attempts);
    return attempts.filter(attempt => attempt.turnId === this.game.currentTurnId && attempt.status === 'guessed').length;
  }

  get currentRound() {
    return this.game.rounds[this.getCurrentRoundId()];
  }

  newGame() {
    this.gameService.newGame();
  }
}

