import type { Connect4Color } from '../../../packages/connect4/src/types';

export interface Connect4TeamView { id:string; color:Connect4Color; seatIds:string[] }
export interface Connect4SeatView { id:string; teamId:string; name:string; avatarId:string; computer:boolean }
export interface Connect4MemberView { seatId:string; name:string; avatarId:string; connected:boolean; joinedAt:number; isYou:boolean }
export interface Connect4Snapshot {
  id:string; code:string; version:number; phase:'lobby'|'playing'|'finished'; isHost:boolean; hostSeatId:string|null; tvConnected?:boolean;
  teams:Connect4TeamView[]; seats:Connect4SeatView[]; members:Connect4MemberView[]; yourSeatId:string|null;
  round:null|{id:string;version:number;turn:number;turnOrder:string[];currentSeatId:string|null;board:(string|null)[][];lastMove:null|{seatId:string;teamId:string;row:number;col:number;turn:number};result:null|{winnerTeamId:string|null;reason:'four'|'draw';cells:Array<{row:number;col:number}>}};
}
