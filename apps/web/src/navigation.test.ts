import { describe,expect,it } from 'vitest';
import { toDisplay, toLogical } from '../../../packages/engine/src/board';
import type { Cell } from '../../../packages/engine/src/types';
import { nextControllerCell } from './navigation';

describe('controller navigation',()=>{
  const origin:Cell={row:4,col:4};
  const cells:Cell[]=[origin,{row:3,col:4},{row:5,col:4},{row:4,col:3},{row:4,col:5}];

  it.each(['left','right','up','down'] as const)('moves %s in the rendered board direction',direction=>{
    const next=nextControllerCell(cells,origin,direction);
    expect(next).not.toBeNull();
    const before=toDisplay(origin);const after=toDisplay(next!);
    if(direction==='left')expect(after.col).toBeLessThan(before.col);
    if(direction==='right')expect(after.col).toBeGreaterThan(before.col);
    if(direction==='up')expect(after.row).toBeLessThan(before.row);
    if(direction==='down')expect(after.row).toBeGreaterThan(before.row);
  });

  it.each([
    ['down',{row:9,col:4},{row:0,col:4}],
    ['up',{row:0,col:4},{row:9,col:4}],
    ['right',{row:4,col:9},{row:4,col:0}],
    ['left',{row:4,col:0},{row:4,col:9}],
  ] as const)('wraps %s to the opposite displayed edge', (direction,displayOrigin,displayTarget)=>{
    const start=toLogical(displayOrigin);const target=toLogical(displayTarget);
    const alternate=toLogical({row:direction==='down'?2:direction==='up'?7:4,col:direction==='right'?2:direction==='left'?7:4});
    expect(nextControllerCell([start,alternate,target],start,direction)).toEqual(target);
  });

  it('prefers a clearly leftward target over a nearer target that is mostly above',()=>{
    const start=toLogical({row:6,col:6});
    const angledLeft=toLogical({row:7,col:2});
    const mostlyAbove=toLogical({row:4,col:5});
    expect(nextControllerCell([start,mostlyAbove,angledLeft],start,'left')).toEqual(angledLeft);
  });

  it('falls back to the nearest target in the requested half-plane when none are directionally aligned',()=>{
    const start=toLogical({row:6,col:6});
    const nearer=toLogical({row:4,col:5});
    const farther=toLogical({row:1,col:4});
    expect(nextControllerCell([start,farther,nearer],start,'left')).toEqual(nearer);
  });
});
