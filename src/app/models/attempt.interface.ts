export interface Attempt {
   id: string;
   playerId: string;
   teamId: string;
   roundId: string;
   turnId: string;
   clueId: string;
   status: 'acting' | 'guessed' | 'skipped' | 'timed-out';
}
