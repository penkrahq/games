import { describe, expect, it } from 'vitest';
import { Connect4RoomStore } from './connect4-rooms';

const ready = () => {
  const store = new Connect4RoomStore();
  const room = store.create('host', 'Host', 'avataaars-01');
  store.join(room.code, 'guest', 'Guest', 'avataaars-02');
  return { store, room };
};

describe('Connect 4 rooms', () => {
  it('balances players, starts, and releases its code', () => {
    const { store, room } = ready();
    const code = room.code;
    expect(room.teams.map((team) => team.seatIds.length)).toEqual([1, 1]);
    store.start(room, 'host');
    expect(store.lookup(code)).toBeUndefined();
  });

  it('applies one authoritative move and rejects a duplicate turn', () => {
    const { store, room } = ready();
    store.start(room, 'host');
    store.drop(room, 'host', 3);
    expect(room.round?.board[5][3]).toBe('team-red');
    expect(() => store.drop(room, 'host', 4)).toThrow('NOT_YOUR_TURN');
  });

  it('keeps the configured teams and players when the host starts a new game', () => {
    const { store, room } = ready();
    const before = { teams: structuredClone(room.teams), seats: structuredClone(room.seats) };
    store.start(room, 'host');
    store.newGame(room, 'host');
    expect(room.phase).toBe('lobby');
    expect(room.teams).toEqual(before.teams);
    expect(room.seats).toEqual(before.seats);
  });

  it('waits for the timer caller to perform exactly one computer turn', () => {
    const store = new Connect4RoomStore();
    const room = store.create('host', 'Host', 'avataaars-01');
    store.addComputer(room, 'host', room.teams[1].id);
    store.start(room, 'host');
    store.drop(room, 'host', 3);
    expect(store.computerTurn(room)).toBe(true);
    expect(store.computerTurn(room)).toBe(false);
  });
});
