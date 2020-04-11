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

  public state: State;
  public socket: any;
  public playerName: string;
  public players: Player[] = [];
  public clue: string;
  public clues: string[] = [];
  public actingPlayer: Player;
  public timeLeft: number;
  public timerStarted = false;

  constructor(private gameService: GameService, private route: ActivatedRoute) {}

  ngOnInit() {
    this.gameService.setState({ status: 'joining' });

    this.route.params.subscribe((params) => {
      this.gameService.getGame(params.id);
    });

    this.gameService.state$.subscribe((state: State) => {
      this.state = state;
      this.players = Object.values(state.players);
      this.actingPlayer = state.players[state.currentActorId];
      this.timeLeft = state.timeLeft;
      this.timerStarted = state.timerStarted;
    });
  }

  get currentPlayerName() {
    const currentPlayerId = this.state && this.state.currentPlayerId || '';
    const players = this.state && this.state.players || {};
    const player = players[currentPlayerId];
    return player && player.name || '';
  }

  get isActing() {
    return this.state.currentPlayerId === this.state.currentActorId;
  }

  joinGame() {
    this.gameService.joinGame(this.playerName);
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

  startGame() {
    this.gameService.startEnteringClues();
  }

  startTimer() {
    this.gameService.startActing();
  }
}

