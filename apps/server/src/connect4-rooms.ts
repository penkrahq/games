import { randomInt, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  chooseConnect4Column,
  createConnect4Round,
  currentConnect4SeatId,
  dropDisc,
  type Connect4Round,
  type Connect4Seat,
  type Connect4Team,
} from '../../../packages/connect4/src/index.js';

export interface Connect4Member {
  guestId: string;
  seatId: string;
  name: string;
  avatarId: string;
  connected: boolean;
  joinedAt: number;
}

export interface Connect4Room {
  id: string;
  code: string;
  version: number;
  hostGuestId: string;
  phase: 'lobby' | 'playing' | 'finished';
  createdAt: number;
  teams: Connect4Team[];
  seats: Connect4Seat[];
  members: Connect4Member[];
  round: Connect4Round | null;
  receipts: Map<string, unknown>;
}

const nameKey = (name: string) => name.normalize('NFKC').toLocaleLowerCase('en-US');

export class Connect4RoomStore {
  rooms = new Map<string, Connect4Room>();
  byCode = new Map<string, string>();
  guestRoom = new Map<string, string>();

  constructor(private dataFile?: string) {
    if (!dataFile || !existsSync(dataFile)) return;
    const saved = JSON.parse(readFileSync(dataFile, 'utf8')) as Array<
      Omit<Connect4Room, 'receipts'> & { receipts: [string, unknown][] }
    >;
    for (const raw of saved) {
      const room = {
        ...raw,
        members: raw.members.map((member) => ({ ...member, connected: false })),
        receipts: new Map(raw.receipts),
      };
      this.rooms.set(room.id, room);
      if (room.phase === 'lobby' && room.code) this.byCode.set(room.code, room.id);
      for (const member of room.members) this.guestRoom.set(member.guestId, room.id);
    }
  }

  persist() {
    if (!this.dataFile) return;
    mkdirSync(path.dirname(this.dataFile), { recursive: true });
    const temporary = `${this.dataFile}.tmp`;
    writeFileSync(
      temporary,
      JSON.stringify([...this.rooms.values()].map((room) => ({ ...room, receipts: [...room.receipts.entries()] }))),
      'utf8',
    );
    renameSync(temporary, this.dataFile);
  }

  private allocateCode(exclude = '') {
    const start = randomInt(99) + 1;
    for (let offset = 0; offset < 99; offset += 1) {
      const code = String(((start - 1 + offset) % 99) + 1).padStart(2, '0');
      if (code !== exclude && !this.byCode.has(code)) return code;
    }
    if (exclude && !this.byCode.has(exclude)) return exclude;
    const oldest = [...this.byCode.entries()]
      .map(([code, roomId]) => ({ code, room: this.rooms.get(roomId) }))
      .filter((item) => item.room?.phase === 'lobby')
      .sort((a, b) => a.room!.createdAt - b.room!.createdAt)[0];
    if (!oldest?.room) throw new Error('CODES_EXHAUSTED');
    this.byCode.delete(oldest.code);
    oldest.room.code = '';
    oldest.room.version += 1;
    return oldest.code;
  }

  create(guestId: string, name: string, avatarId: string) {
    const existing = this.roomForGuest(guestId);
    if (existing) return existing;
    const id = randomUUID();
    const seatId = randomUUID();
    const code = this.allocateCode();
    const teams: Connect4Team[] = [
      { id: 'team-red', color: 'red', seatIds: [seatId] },
      { id: 'team-yellow', color: 'yellow', seatIds: [] },
    ];
    const seats: Connect4Seat[] = [
      { id: seatId, teamId: teams[0].id, name, avatarId, computer: false },
    ];
    const createdAt = Date.now();
    const room: Connect4Room = {
      id,
      code,
      version: 1,
      hostGuestId: guestId,
      phase: 'lobby',
      createdAt,
      teams,
      seats,
      members: [{ guestId, seatId, name, avatarId, connected: false, joinedAt: createdAt }],
      round: null,
      receipts: new Map(),
    };
    this.rooms.set(id, room);
    this.byCode.set(code, id);
    this.guestRoom.set(guestId, id);
    return room;
  }

  lookup(code: string) {
    const id = this.byCode.get(code);
    return id ? this.rooms.get(id) : undefined;
  }
  roomForGuest(guestId: string) {
    const id = this.guestRoom.get(guestId);
    return id ? this.rooms.get(id) : undefined;
  }
  member(room: Connect4Room, guestId: string) {
    const member = room.members.find((candidate) => candidate.guestId === guestId);
    if (!member) throw new Error('NOT_MEMBER');
    return member;
  }
  private requireHost(room: Connect4Room, guestId: string) {
    this.member(room, guestId);
    if (room.hostGuestId !== guestId) throw new Error('NOT_HOST');
  }
  private assertNameAvailable(room: Connect4Room, name: string, excludeSeatId?: string) {
    if (room.seats.some((seat) => seat.id !== excludeSeatId && nameKey(seat.name) === nameKey(name)))
      throw new Error('NAME_TAKEN');
  }
  private computerName(room: Connect4Room) {
    for (let number = 1; ; number += 1) {
      const name = `Computer ${number}`;
      if (!room.seats.some((seat) => nameKey(seat.name) === nameKey(name))) return name;
    }
  }

  join(code: string, guestId: string, name: string, avatarId: string) {
    const room = this.lookup(code);
    if (!room) throw new Error('ROOM_NOT_FOUND');
    if (room.phase !== 'lobby') throw new Error('ROUND_STARTED');
    const existing = room.members.find((member) => member.guestId === guestId);
    if (existing) return room;
    this.assertNameAvailable(room, name);
    const previous = this.roomForGuest(guestId);
    if (previous && previous.id !== room.id) this.leave(previous, guestId);
    if (room.seats.length >= 12) throw new Error('ROOM_FULL');
    const target = [...room.teams].sort((a, b) => a.seatIds.length - b.seatIds.length)[0];
    const seatId = randomUUID();
    const seat: Connect4Seat = { id: seatId, teamId: target.id, name, avatarId, computer: false };
    target.seatIds.push(seatId);
    room.seats.push(seat);
    room.members.push({ guestId, seatId, name, avatarId, connected: false, joinedAt: Date.now() });
    if (!room.hostGuestId) room.hostGuestId = guestId;
    room.version += 1;
    this.guestRoom.set(guestId, room.id);
    return room;
  }

  leave(room: Connect4Room, guestId: string) {
    const member = this.member(room, guestId);
    const seat = room.seats.find((candidate) => candidate.id === member.seatId);
    room.members = room.members.filter((candidate) => candidate.guestId !== guestId);
    this.guestRoom.delete(guestId);
    if (room.phase === 'lobby') {
      room.seats = room.seats.filter((candidate) => candidate.id !== member.seatId);
      for (const team of room.teams) team.seatIds = team.seatIds.filter((id) => id !== member.seatId);
    } else if (seat) seat.computer = true;
    if (room.hostGuestId === guestId)
      room.hostGuestId = [...room.members].sort((a, b) => a.joinedAt - b.joinedAt)[0]?.guestId ?? '';
    if (!room.members.length) {
      this.rooms.delete(room.id);
      if (this.byCode.get(room.code) === room.id) this.byCode.delete(room.code);
    } else room.version += 1;
    return room;
  }

  enterTv(room: Connect4Room, guestId: string) {
    if (room.phase !== 'lobby') throw new Error('ROUND_STARTED');
    const member = this.member(room, guestId);
    room.members = room.members.filter((candidate) => candidate.guestId !== guestId);
    room.seats = room.seats.filter((candidate) => candidate.id !== member.seatId);
    for (const team of room.teams) team.seatIds = team.seatIds.filter((id) => id !== member.seatId);
    this.guestRoom.delete(guestId);
    if (room.hostGuestId === guestId)
      room.hostGuestId = [...room.members].sort((a, b) => a.joinedAt - b.joinedAt)[0]?.guestId ?? '';
    room.version += 1;
    return room;
  }

  addComputer(room: Connect4Room, guestId: string, teamId: string) {
    this.requireHost(room, guestId);
    if (room.phase !== 'lobby') throw new Error('ROUND_STARTED');
    const team = room.teams.find((candidate) => candidate.id === teamId);
    if (!team) throw new Error('TEAM_NOT_FOUND');
    if (team.seatIds.length >= 6) throw new Error('TEAM_FULL');
    const name = this.computerName(room);
    const number = Number(name.split(' ')[1]);
    const seat: Connect4Seat = {
      id: randomUUID(),
      teamId,
      name,
      avatarId: `avataaars-${String((number + 3) % 24 + 1).padStart(2, '0')}`,
      computer: true,
    };
    room.seats.push(seat);
    team.seatIds.push(seat.id);
    room.version += 1;
    return room;
  }

  removeComputer(room: Connect4Room, guestId: string, seatId: string) {
    this.requireHost(room, guestId);
    if (room.phase !== 'lobby') throw new Error('ROUND_STARTED');
    if (!room.seats.some((seat) => seat.id === seatId && seat.computer)) throw new Error('NOT_FOUND');
    room.seats = room.seats.filter((seat) => seat.id !== seatId);
    for (const team of room.teams) team.seatIds = team.seatIds.filter((id) => id !== seatId);
    room.version += 1;
    return room;
  }

  removeSeat(room: Connect4Room, guestId: string, seatId: string) {
    this.requireHost(room, guestId);
    if (room.phase !== 'lobby') throw new Error('ROUND_STARTED');
    if (this.member(room, guestId).seatId === seatId) throw new Error('CANNOT_REMOVE_SELF');
    const target = room.members.find((member) => member.seatId === seatId);
    if (target) this.guestRoom.delete(target.guestId);
    room.members = room.members.filter((member) => member.seatId !== seatId);
    room.seats = room.seats.filter((seat) => seat.id !== seatId);
    for (const team of room.teams) team.seatIds = team.seatIds.filter((id) => id !== seatId);
    room.version += 1;
    return target?.guestId;
  }

  makeHost(room: Connect4Room, guestId: string, seatId: string) {
    this.requireHost(room, guestId);
    const target = room.members.find((member) => member.seatId === seatId);
    if (!target) throw new Error('NOT_MEMBER');
    room.hostGuestId = target.guestId;
    room.version += 1;
    return room;
  }

  moveSeat(room: Connect4Room, guestId: string, seatId: string, teamId: string) {
    const member = this.member(room, guestId);
    if (room.phase !== 'lobby') throw new Error('ROUND_STARTED');
    if (room.hostGuestId !== guestId && member.seatId !== seatId) throw new Error('NOT_HOST');
    const seat = room.seats.find((candidate) => candidate.id === seatId);
    const target = room.teams.find((candidate) => candidate.id === teamId);
    if (!seat || !target) throw new Error('NOT_FOUND');
    if (target.seatIds.length >= 6) throw new Error('TEAM_FULL');
    for (const team of room.teams) team.seatIds = team.seatIds.filter((id) => id !== seatId);
    target.seatIds.push(seatId);
    seat.teamId = target.id;
    room.version += 1;
    return room;
  }

  updateProfile(room: Connect4Room, guestId: string, name: string, avatarId: string) {
    const member = this.member(room, guestId);
    this.assertNameAvailable(room, name, member.seatId);
    member.name = name;
    member.avatarId = avatarId;
    const seat = room.seats.find((candidate) => candidate.id === member.seatId)!;
    seat.name = name;
    seat.avatarId = avatarId;
    if (room.round) {
      const roundSeat = room.round.seats.find((candidate) => candidate.id === seat.id);
      if (roundSeat) Object.assign(roundSeat, { name, avatarId });
    }
    room.version += 1;
    return room;
  }

  reclaimMember(room: Connect4Room, guestId: string) {
    const member = this.member(room, guestId);
    const seat = room.seats.find((candidate) => candidate.id === member.seatId);
    if (seat?.computer) {
      seat.computer = false;
      const roundSeat = room.round?.seats.find((candidate) => candidate.id === seat.id);
      if (roundSeat) roundSeat.computer = false;
      room.version += 1;
    }
    return room;
  }

  start(room: Connect4Room, guestId: string) {
    this.requireHost(room, guestId);
    room.round = createConnect4Round(room.teams, room.seats);
    room.phase = 'playing';
    if (this.byCode.get(room.code) === room.id) this.byCode.delete(room.code);
    room.version += 1;
    return room;
  }

  drop(room: Connect4Room, guestId: string, col: number) {
    const member = this.member(room, guestId);
    if (!room.round) throw new Error('NO_ROUND');
    room.round = dropDisc(room.round, member.seatId, col);
    room.phase = room.round.result ? 'finished' : 'playing';
    room.version += 1;
    return room;
  }

  computerTurn(room: Connect4Room) {
    if (!room.round || room.round.result) return false;
    const seatId = currentConnect4SeatId(room.round);
    const seat = room.seats.find((candidate) => candidate.id === seatId);
    if (!seat?.computer) return false;
    const col = chooseConnect4Column(room.round, seat.id);
    if (col === null) return false;
    room.round = dropDisc(room.round, seat.id, col);
    room.phase = room.round.result ? 'finished' : 'playing';
    room.version += 1;
    return true;
  }

  replay(room: Connect4Room, guestId: string) {
    this.requireHost(room, guestId);
    if (!room.round?.result) throw new Error('ROUND_NOT_FINISHED');
    room.round = createConnect4Round(room.teams, room.seats, room.round.startingTeamIndex + 1);
    room.phase = 'playing';
    room.version += 1;
    return room;
  }

  newGame(room: Connect4Room, guestId: string) {
    this.requireHost(room, guestId);
    const priorCode = room.code;
    if (this.byCode.get(priorCode) === room.id) this.byCode.delete(priorCode);
    room.code = this.allocateCode(priorCode);
    room.phase = 'lobby';
    room.round = null;
    room.receipts.clear();
    room.createdAt = Date.now();
    room.version += 1;
    this.byCode.set(room.code, room.id);
    return room;
  }

  snapshot(room: Connect4Room, guestId: string) {
    const member = room.members.find((candidate) => candidate.guestId === guestId);
    return {
      id: room.id,
      code: room.code,
      version: room.version,
      phase: room.phase,
      isHost: room.hostGuestId === guestId,
      hostSeatId: room.members.find((candidate) => candidate.guestId === room.hostGuestId)?.seatId ?? null,
      teams: room.teams,
      seats: room.seats,
      members: room.members.map(({ guestId: id, ...candidate }) => ({ ...candidate, isYou: id === guestId })),
      yourSeatId: member?.seatId ?? null,
      round: room.round
        ? {
            id: room.round.id,
            version: room.round.version,
            turn: room.round.turn,
            turnOrder: room.round.turnOrder,
            currentSeatId: currentConnect4SeatId(room.round),
            board: room.round.board,
            lastMove: room.round.lastMove,
            result: room.round.result,
          }
        : null,
    };
  }
  publicSnapshot(room: Connect4Room) {
    return { ...this.snapshot(room, ''), isHost: false, yourSeatId: null };
  }
}
