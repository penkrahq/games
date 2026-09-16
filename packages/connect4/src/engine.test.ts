import { describe, expect, it } from 'vitest';
import { createConnect4Round, currentConnect4SeatId, dropDisc, legalColumns } from './index';
import type { Connect4Seat, Connect4Team } from './types';

const teams: Connect4Team[] = [
  { id: 'red', color: 'red', seatIds: ['r'] },
  { id: 'yellow', color: 'yellow', seatIds: ['y'] },
];
const seats: Connect4Seat[] = [
  { id: 'r', teamId: 'red', name: 'Red', avatarId: 'avataaars-01', computer: false },
  { id: 'y', teamId: 'yellow', name: 'Yellow', avatarId: 'avataaars-02', computer: false },
];

describe('Connect 4 engine', () => {
  it('alternates turns and applies gravity', () => {
    let round = createConnect4Round(teams, seats, 0, 'round');
    round = dropDisc(round, 'r', 3);
    expect(round.board[5][3]).toBe('red');
    expect(currentConnect4SeatId(round)).toBe('y');
    round = dropDisc(round, 'y', 3);
    expect(round.board[4][3]).toBe('yellow');
  });

  it('finds a horizontal four and closes the round', () => {
    let round = createConnect4Round(teams, seats);
    for (const col of [0, 1, 2]) {
      round = dropDisc(round, 'r', col);
      round = dropDisc(round, 'y', col);
    }
    round = dropDisc(round, 'r', 3);
    expect(round.result).toMatchObject({ winnerTeamId: 'red', reason: 'four' });
    expect(round.result?.cells).toHaveLength(4);
    expect(() => dropDisc(round, 'y', 4)).toThrow('ROUND_FINISHED');
  });

  it('rejects full columns', () => {
    let round = createConnect4Round(teams, seats);
    for (let index = 0; index < 6; index += 1)
      round = dropDisc(round, currentConnect4SeatId(round)!, 0);
    expect(legalColumns(round)).not.toContain(0);
    expect(() => dropDisc(round, currentConnect4SeatId(round)!, 0)).toThrow('COLUMN_FULL');
  });
});
