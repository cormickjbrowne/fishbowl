import { Status } from './status.interface';
import { Player } from './player.interface';
import { Team } from './team.interface';
import { Round } from './round.interface';
import { Turn } from './turn.interface';
import { Clue } from './clue.interface';
import { Attempt } from './attempt.interface';

export interface Game {
  id: string;
  status: Status;
  currentAttemptId: string;
  currentActorId: string;
  currentTurnId: string;
  currentClueId: string;

  roundIds: string[];
  currentRoundIndex: number;
  rounds: { [id: string]: Round };

  teamIds: string[];
  currentTeamIndex: number;
  teams: { [id: string]: Team };

  players: { [id: string]: Player };
  clues: { [id: string]: Clue };
  turns: { [id: string]: Turn };
  attempts: { [id: string]: Attempt };

  timeRemaining: number;
}
