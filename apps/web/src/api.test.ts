import {describe,expect,it} from 'vitest';
import {createCommandId} from './api';

describe('createCommandId',()=>{
  it('uses randomUUID when the browser exposes it',()=>{
    expect(createCommandId({randomUUID:()=> 'native-id'})).toBe('native-id');
  });

  it('creates an RFC 4122-shaped id when randomUUID is unavailable',()=>{
    const webCrypto={getRandomValues:(values:Uint8Array)=>{values.forEach((_,index)=>{values[index]=index});return values}};
    expect(createCommandId(webCrypto)).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f');
  });

  it('still creates an opaque id when Web Crypto is unavailable',()=>{
    expect(createCommandId(null)).toMatch(/^[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$/);
  });
});
