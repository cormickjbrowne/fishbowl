export interface Clue {
  id: string;
  createdByPlayerId: string;
  value: string;
  gameId: string;
  attemptIds: string[];
}
