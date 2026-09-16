export type Connect4Color = 'red' | 'yellow';

export interface Connect4Team {
  id: string;
  color: Connect4Color;
  seatIds: string[];
}

export interface Connect4Seat {
  id: string;
  teamId: string;
  name: string;
  avatarId: string;
  computer: boolean;
}

export interface Connect4Move {
  seatId: string;
  teamId: string;
  row: number;
  col: number;
  turn: number;
}

export interface Connect4Result {
  winnerTeamId: string | null;
  reason: 'four' | 'draw';
  cells: Array<{ row: number; col: number }>;
}

export interface Connect4Round {
  id: string;
  version: number;
  teams: Connect4Team[];
  seats: Connect4Seat[];
  turnOrder: string[];
  currentSeatIndex: number | null;
  startingTeamIndex: number;
  turn: number;
  board: (string | null)[][];
  lastMove: Connect4Move | null;
  result: Connect4Result | null;
}
