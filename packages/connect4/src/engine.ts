import { randomUUID } from 'node:crypto';
import type { Connect4Round, Connect4Seat, Connect4Team } from './types.js';

export const CONNECT4_ROWS = 6;
export const CONNECT4_COLUMNS = 7;

const emptyBoard = () =>
  Array.from({ length: CONNECT4_ROWS }, () =>
    Array<string | null>(CONNECT4_COLUMNS).fill(null),
  );

function alternatingOrder(teams: Connect4Team[], seats: Connect4Seat[]) {
  const byTeam = teams.map((team) =>
    team.seatIds.map((id) => seats.find((seat) => seat.id === id)).filter(Boolean) as Connect4Seat[],
  );
  const result: string[] = [];
  const largest = Math.max(...byTeam.map((team) => team.length));
  for (let index = 0; index < largest; index += 1)
    for (const team of byTeam) if (team[index]) result.push(team[index].id);
  return result;
}

export function createConnect4Round(
  teams: Connect4Team[],
  seats: Connect4Seat[],
  startingTeamIndex = 0,
  id: string = randomUUID(),
): Connect4Round {
  if (teams.length !== 2) throw new Error('TEAM_COUNT');
  if (!teams[0].seatIds.length || teams[0].seatIds.length !== teams[1].seatIds.length)
    throw new Error('TEAMS_UNBALANCED');
  const rotated = startingTeamIndex % 2 ? [teams[1], teams[0]] : teams;
  return {
    id,
    version: 1,
    teams: teams.map((team) => ({ ...team, seatIds: [...team.seatIds] })),
    seats: seats.map((seat) => ({ ...seat })),
    turnOrder: alternatingOrder(rotated, seats),
    currentSeatIndex: 0,
    startingTeamIndex: startingTeamIndex % 2,
    turn: 1,
    board: emptyBoard(),
    lastMove: null,
    result: null,
  };
}

export const currentConnect4SeatId = (round: Connect4Round) =>
  round.currentSeatIndex === null ? null : round.turnOrder[round.currentSeatIndex];

export const legalColumns = (round: Connect4Round) =>
  round.result ? [] : round.board[0].flatMap((cell, col) => (cell === null ? [col] : []));

function winningLine(round: Connect4Round, row: number, col: number, teamId: string) {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ] as const;
  for (const [dr, dc] of directions) {
    const line = [{ row, col }];
    for (const sign of [-1, 1] as const) {
      for (let offset = 1; offset < 4; offset += 1) {
        const next = { row: row + dr * offset * sign, col: col + dc * offset * sign };
        if (round.board[next.row]?.[next.col] !== teamId) break;
        line.push(next);
      }
    }
    if (line.length >= 4) {
      line.sort((a, b) => a.row - b.row || a.col - b.col);
      const pivot = line.findIndex((cell) => cell.row === row && cell.col === col);
      const start = Math.max(0, Math.min(pivot, line.length - 4));
      return line.slice(start, start + 4);
    }
  }
  return [];
}

export function dropDisc(input: Connect4Round, seatId: string, col: number) {
  if (input.result) throw new Error('ROUND_FINISHED');
  if (currentConnect4SeatId(input) !== seatId) throw new Error('NOT_YOUR_TURN');
  if (!Number.isInteger(col) || col < 0 || col >= CONNECT4_COLUMNS) throw new Error('INVALID_COLUMN');
  const row = [...input.board].map((cells) => cells[col]).lastIndexOf(null);
  if (row < 0) throw new Error('COLUMN_FULL');
  const round: Connect4Round = structuredClone(input);
  const seat = round.seats.find((candidate) => candidate.id === seatId);
  if (!seat) throw new Error('SEAT_NOT_FOUND');
  round.board[row][col] = seat.teamId;
  round.lastMove = { seatId, teamId: seat.teamId, row, col, turn: round.turn };
  const cells = winningLine(round, row, col, seat.teamId);
  if (cells.length) {
    round.result = { winnerTeamId: seat.teamId, reason: 'four', cells };
    round.currentSeatIndex = null;
  } else if (!legalColumns(round).length) {
    round.result = { winnerTeamId: null, reason: 'draw', cells: [] };
    round.currentSeatIndex = null;
  } else {
    round.currentSeatIndex = ((round.currentSeatIndex ?? -1) + 1) % round.turnOrder.length;
    round.turn += 1;
  }
  round.version += 1;
  return round;
}

export function chooseConnect4Column(round: Connect4Round, seatId: string) {
  const seat = round.seats.find((candidate) => candidate.id === seatId);
  if (!seat) return null;
  const columns = legalColumns(round);
  for (const col of columns) if (dropDisc(round, seatId, col).result?.winnerTeamId === seat.teamId) return col;
  const nextIndex = ((round.currentSeatIndex ?? -1) + 1) % round.turnOrder.length;
  const opponentSeatId = round.turnOrder[nextIndex];
  if (opponentSeatId) {
    const threat = structuredClone(round);
    threat.currentSeatIndex = nextIndex;
    for (const col of columns) {
      try {
        if (dropDisc(threat, opponentSeatId, col).result?.winnerTeamId) return col;
      } catch { /* try the next legal column */ }
    }
  }
  return [...columns].sort((a, b) => Math.abs(a - 3) - Math.abs(b - 3) || a - b)[0] ?? null;
}
