export interface Round {
  id: string;
  type: 'taboo' | 'charades' | 'single-word' | 'sheet';
  turnIds: string[];
}
