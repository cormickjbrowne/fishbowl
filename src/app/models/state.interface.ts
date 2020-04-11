import { Game } from './game.interface';
import { Player } from './player.interface';

export type Status = 'initial'
  | 'joining'
  | 'waiting-for-players'
  | 'writing-clues'
  | 'waiting-for-clues'
  | 'player-ready'
  | 'playing-waiting'
  | 'playing-acting'
  | 'game-over';

export interface State {
  status: Status;
  currentPlayerId?: string;
  currentActorId?: string;
  players: {};
  game?: Game;
  timerStarted: boolean;
  timeLeft: number;
}
