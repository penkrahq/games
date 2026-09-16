import { toDisplay } from '../../../packages/engine/src/board';
import type { Cell } from '../../../packages/engine/src/types';

export type BoardDirection='up'|'right'|'down'|'left';

const cellKey=(cell:Cell)=>`${cell.row},${cell.col}`;

/** Finds the nearest legal cell in the direction the player sees on screen. */
export function nextControllerCell(cells:Cell[],focused:Cell|null,direction:BoardDirection):Cell|null{
  if(!cells.length)return null;
  const origin=focused??cells[0];
  const displayOrigin=toDisplay(origin);
  const currentKey=cellKey(origin);
  const candidates=cells.map((cell,index)=>{
    const display=toDisplay(cell);
    const dx=display.col-displayOrigin.col;
    const dy=display.row-displayOrigin.row;
    const eligible=direction==='up'?dy<0:direction==='down'?dy>0:direction==='left'?dx<0:dx>0;
    const distance=dx*dx+dy*dy;
    const cross=direction==='up'||direction==='down'?Math.abs(dx):Math.abs(dy);
    const forward=direction==='up'||direction==='down'?Math.abs(dy):Math.abs(dx);
    const aligned=forward>=cross;
    return{cell,index,display,distance:eligible?distance:Infinity,cross,aligned};
  }).filter(item=>cellKey(item.cell)!==currentKey);
  const direct=candidates.filter(item=>Number.isFinite(item.distance)).sort((a,b)=>Number(b.aligned)-Number(a.aligned)||a.distance-b.distance||a.cross-b.cross||a.index-b.index)[0];
  if(direct)return direct.cell;
  const edge=(cell:Cell)=>direction==='down'?cell.row:direction==='up'?-cell.row:direction==='right'?cell.col:-cell.col;
  return [...candidates].sort((a,b)=>edge(a.display)-edge(b.display)||a.cross-b.cross||a.index-b.index)[0]?.cell??null;
}
