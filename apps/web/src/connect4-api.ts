import { io } from 'socket.io-client';
import type { RoomLookup } from './types';
import type { Connect4Snapshot } from './connect4-types';
import { createCommandId } from './api';

async function post<T>(url:string,body:unknown={}):Promise<T>{
  const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify(body)});
  const data=await response.json();
  if(!response.ok)throw new Error(data.message??data.error??'Request failed');
  return data;
}

export const connect4Api={
  session:()=>post<{guestId:string;room:Connect4Snapshot|null}>('/connect4/api/session'),
  create:(name:string,avatarId:string)=>post<Connect4Snapshot>('/connect4/api/rooms',{name,avatarId}),
  createNew:(name:string,avatarId:string)=>post<Connect4Snapshot>('/connect4/api/rooms/new',{name,avatarId}),
  leave:(roomId:string)=>post<{ok:true}>('/connect4/api/rooms/leave',{roomId}),
  enterTv:(roomId:string)=>post<Connect4Snapshot>('/connect4/api/rooms/tv',{roomId}),
  tvSession:(roomId:string)=>post<Connect4Snapshot>('/connect4/api/rooms/tv/session',{roomId}),
  lookup:(code:string)=>post<RoomLookup>('/connect4/api/rooms/lookup',{code}),
  join:(code:string,name:string,avatarId:string)=>post<Connect4Snapshot>('/connect4/api/rooms/join',{code,name,avatarId}),
  command:(roomId:string,command:Record<string,unknown>)=>post<Connect4Snapshot>('/connect4/api/commands',{roomId,commandId:createCommandId(),...command}),
};

export function connectConnect4(onSnapshot:(room:Connect4Snapshot)=>void,mode:'player'|'tv'='player',roomId?:string,onRemoved?:()=>void){
  const socket=io({path:'/connect4/socket.io',transports:['websocket','polling'],auth:{mode,roomId}});
  socket.on('snapshot',onSnapshot);
  if(onRemoved)socket.on('removed',onRemoved);
  return()=>socket.disconnect();
}
