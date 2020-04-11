import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Game } from './models/game.interface';
import { Player } from './models/player.interface';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { State, Status } from './models/state.interface';
import { merge } from 'lodash';
import * as io from 'socket.io-client';

const waitTime = 5;

const initialState: State = {
 status: 'initial',
 currentPlayerId: undefined,
 currentActorId: undefined,
 players: {},
 game: undefined,
 timerStarted: false,
 timeLeft: waitTime
};


@Injectable({
  providedIn: 'root'
})
export class GameService {

  public state$ = new BehaviorSubject<State>(initialState);

  public state: State = initialState;

  public socket: any;

  constructor(private http: HttpClient, private router: Router) { }

  createGame(): void {
    this.http.post<Game>('/server/game', {}).subscribe((game: Game) => {
      this.router.navigateByUrl(`/game/${game.id}`);
    });
  }

  setState(objOrFunc: Function | Partial<State>) {
    const partialState = typeof objOrFunc === 'function' ? objOrFunc(this.state) : objOrFunc;
    merge(this.state, partialState);
    this.state$.next(this.state);
  }

  getGame(id: string): void {
    this.http.get<Game>(`/server/game/${id}`)
    .pipe(catchError((err) => {
      this.router.navigateByUrl('/');
      return throwError(err.error);
    }))
    .subscribe((game: Game) => {
      this.setState({ game });
    });
  }

  joinGame(playerName: string): void {
      const socket = io();
      this.socket = socket;

      socket.on('player', (player: Player) => {
        this.setState((state: State) => ({
          players: {
            ...state.players,
            [player.id]: player
          }
        }));
      });

      socket.on('players', (players: Player[]) => {
        const playerState = players.reduce((agg, player) => {
          agg[player.id] = player;
          return agg;
        }, {});
        this.setState({ players: playerState });
      });

      socket.on('connect', () => {
        this.http.post('/server/player', { name: playerName, id: socket.id }).subscribe((player: Player) => {
          this.setState({ currentPlayerId: player.id });
          this.socket.emit('join', player.id, this.state.game.id)
        });
      });

      socket.on('player-left', (playerId: string) => {
        delete this.state.players[playerId];
        this.state$.next(this.state);
      });

      socket.on('player-ready', (playerId) => {
        this.state.players[playerId].status = 'ready';
      });

      socket.on('playing-waiting', (actingPlayerId: string) => {
        this.setState({
          currentActorId: actingPlayerId,
          status: 'playing-waiting'
        });
      });

      socket.on('acting-started', () => {
        this.setState({
          timerStarted: true,
          timeLeft: waitTime
        });

        const interval = setInterval(() => {
          const { timeLeft } = this.state;

          if (timeLeft < 0) {
            clearInterval(interval);
          } else {
            this.setState({ timeLeft: timeLeft - 1 });
          }
        }, 1000);
      });

      socket.on('acting-finished', (nextActingPlayerId: string) => {
        this.setState({
          timerStarted: false,
          timeLeft: 0,
          currentActorId: nextActingPlayerId,
          status: 'player-ready'
        });
      });

      socket.on('status-change', (statusChange) => {
        const { status, actingPlayerId } = statusChange;
        this.setState({
          status,
          currentActorId: actingPlayerId
        });
      });

      this.setState({ status: 'waiting-for-players' });
  }

  startEnteringClues() {
    const { currentPlayerId, players } = this.state;
    const player = players[currentPlayerId];
    this.http.put(`/server/game/${player.gameId}`, { status: 'writing-clues' }).subscribe();
  }

  submitClues(clues: string[]) {
    const { game, currentPlayerId } = this.state;
    this.http.post('/server/clues', { clues, playerId: currentPlayerId, gameId: game.id }).subscribe((game: Game) => {
      this.setState({ game });
    });
  }

  startActing() {
    this.socket.emit('start-acting', { gameId: this.state.game.id});
  }

  nextClue() { }
  skipClue() { }
}
