import { io } from 'socket.io-client';
import type { Cell } from '../../../packages/engine/src/types';
import type { Command, RoomLookup, RoomSnapshot } from './types';

let playerSocket:ReturnType<typeof io>|null=null;
export const sendTvFocus=(cell:Cell|null)=>playerSocket?.emit('tv-focus',cell);

type CommandCrypto={randomUUID?:()=>string;getRandomValues?:(values:Uint8Array)=>Uint8Array};
export function createCommandId(webCrypto:CommandCrypto|null|undefined=globalThis.crypto){
  if(typeof webCrypto?.randomUUID==='function')return webCrypto.randomUUID();
  if(typeof webCrypto?.getRandomValues==='function'){
    const bytes=webCrypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&0x0f)|0x40;bytes[8]=(bytes[8]&0x3f)|0x80;
    const hex=Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');return`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }
  return`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

async function post<T>(url:string, body:unknown={}):Promise<T>{
  const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify(body)});
  const data=await response.json(); if(!response.ok)throw new Error(data.message??data.error??'Request failed'); return data;
}
export const api={
  session:()=>post<{guestId:string;room:RoomSnapshot|null}>('/sequence/api/session'),
  create:(name:string,avatarId:string)=>post<RoomSnapshot>('/sequence/api/rooms',{name,avatarId}),
  createNew:(name:string,avatarId:string)=>post<RoomSnapshot>('/sequence/api/rooms/new',{name,avatarId}),
  leave:(roomId:string)=>post<{ok:true}>('/sequence/api/rooms/leave',{roomId}),
  enterTv:(roomId:string)=>post<RoomSnapshot>('/sequence/api/rooms/tv',{roomId}),
  tvSession:(roomId:string)=>post<RoomSnapshot>('/sequence/api/rooms/tv/session',{roomId}),
  lookup:(code:string)=>post<RoomLookup>('/sequence/api/rooms/lookup',{code}),
  join:(code:string,name:string,avatarId:string)=>post<RoomSnapshot>('/sequence/api/rooms/join',{code,name,avatarId}),
  command:(roomId:string,command:Command)=>post<RoomSnapshot>('/sequence/api/commands',{roomId,commandId:createCommandId(),...command}),
};
export const connect=(onSnapshot:(room:RoomSnapshot)=>void,mode:'player'|'tv'='player',roomId?:string,onRemoved?:()=>void)=>{
  const socket=io({path:'/sequence/socket.io',transports:['websocket','polling'],auth:{mode,roomId}});
  if(mode==='player')playerSocket=socket;socket.on('snapshot',onSnapshot);socket.on('tv-focus',cell=>window.dispatchEvent(new CustomEvent('sequence-tv-focus',{detail:cell})));if(onRemoved)socket.on('removed',onRemoved);return()=>{if(playerSocket===socket)playerSocket=null;socket.disconnect()};
};
