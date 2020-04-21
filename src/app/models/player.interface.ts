export interface Player {
  id: string;
  name: string;
  teamId: string;
  gameId: string;
  clueIds: string[];
  turnIds: string[];
  attemptIds: string[];
  status: string;
}
