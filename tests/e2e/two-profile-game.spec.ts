import { expect, test, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import { toDisplay } from '../../packages/engine/src/board';

type TestRoom={phase:'lobby'|'playing'|'finished';yourSeatId:string;round:{turn:number;currentSeatId:string|null;chips:(string|null)[][];lastMove:null|{turn:number;kind:'place'|'remove';removedTeamId?:string}}};

async function shot(page:Page,testInfo:TestInfo,name:string){await page.screenshot({path:testInfo.outputPath(`${name}.png`),animations:'disabled'});}
async function choosePlayable(page:Page){
  const cards=page.locator('.hand-card:not(:disabled)');
  for(let i=0;i<await cards.count();i++){
    await cards.nth(i).click();
    if(await page.locator('.board-cell.valid').count())return;
  }
  throw new Error('No playable card in the current hand');
}
async function close(context:BrowserContext){await context.close().catch(()=>undefined)}

test('the approved arcade landing page routes into Sequence',async({page},testInfo)=>{
  await page.setViewportSize({width:1440,height:1000});await page.goto('/');
  await expect(page.getByRole('heading',{name:/Play together/i})).toBeVisible();
  await expect(page.locator('.pg-game.sequence')).toHaveAttribute('href','/sequence/');
  const desktop=await page.evaluate(()=>Object.fromEntries(['.pg-nav','.pg-hero','.pg-marquee','.pg-library','.pg-how','.pg-footer'].map(selector=>{const rect=document.querySelector(selector)!.getBoundingClientRect();return [selector,{y:rect.y,height:rect.height}]})));
  expect(desktop).toEqual({'.pg-nav':{y:0,height:107.1875},'.pg-hero':{y:107.1875,height:820},'.pg-marquee':{y:927.1875,height:56},'.pg-library':{y:983.1875,height:979},'.pg-how':{y:1962.1875,height:555.78125},'.pg-footer':{y:2517.96875,height:93.109375}});
  await expect(page.locator('.pg-game.sequence small')).toHaveCSS('height','32.7969px');
  await shot(page,testInfo,'00-arcade-landing-desktop');
  await page.setViewportSize({width:390,height:844});await page.reload();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
  const mobile=await page.evaluate(()=>Object.fromEntries(['.pg-nav','.pg-hero','.pg-mobile-actions','.pg-marquee','.pg-library','.pg-how','.pg-footer'].map(selector=>{const rect=document.querySelector(selector)!.getBoundingClientRect();return [selector,{y:rect.y,height:rect.height}]})));
  expect(mobile).toEqual({'.pg-nav':{y:0,height:63.1875},'.pg-hero':{y:63.1875,height:690},'.pg-mobile-actions':{y:753.1875,height:151.1875},'.pg-marquee':{y:904.375,height:44},'.pg-library':{y:948.375,height:774},'.pg-how':{y:1722.375,height:473},'.pg-footer':{y:2195.375,height:100.546875}});
  await shot(page,testInfo,'00b-arcade-landing-mobile');
});

test('an expired room URL returns directly to the games landing page',async({page})=>{
  await page.goto('/sequence/tv/expired-room');await expect(page).toHaveURL(/\/$/);await expect(page.getByRole('heading',{name:/Play together/i})).toBeVisible();await expect(page.getByText('Couldn’t open the game')).toHaveCount(0);
});

test('join-code focus follows the active card and keeps that card visually in front',async({page},testInfo)=>{
  await page.setViewportSize({width:1544,height:983});await page.goto('/sequence/join');
  const input=page.getByRole('textbox',{name:'Game code'});await expect(input).toBeFocused();
  await expect(page.locator('.join-code-card.first')).toHaveClass(/focused/);await expect(page.locator('.join-code-card.first')).toHaveCSS('z-index','3');
  const pageBox=await page.locator('.join-page').boundingBox();const cardsBox=await page.locator('.join-code-cards').boundingBox();const actionsBox=await page.locator('.join-actions').boundingBox();
  expect(pageBox).not.toBeNull();expect(cardsBox).not.toBeNull();expect(actionsBox).not.toBeNull();
  expect(pageBox!.width).toBe(1544);expect(cardsBox!.x+cardsBox!.width/2).toBeCloseTo(772,0);expect(actionsBox!.x+actionsBox!.width/2).toBeCloseTo(772,0);
  await expect(page.locator('.code-caret')).toHaveCSS('animation-name','code-caret-blink');
  await expect.poll(()=>page.locator('.code-caret').evaluate(element=>getComputedStyle(element).opacity)).toBe('0');
  await input.fill('4');await expect(page.locator('.join-code-card.second')).toHaveClass(/focused/);await expect(page.locator('.join-code-card.second')).toHaveCSS('z-index','3');
  await shot(page,testInfo,'join-second-card-focus');
});

test('closing standalone join creates a clean lobby without retaining the join overlay',async({page})=>{
  await page.goto('/sequence/join');
  await expect(page.getByRole('dialog',{name:'Enter the game code'})).toBeVisible();
  await page.getByRole('button',{name:'Close'}).click();
  await expect(page.locator('.lobby-shell')).toBeVisible();
  await expect(page.getByRole('dialog',{name:'Enter the game code'})).toHaveCount(0);
  await expect(page).toHaveURL(/\/sequence\/$/);
});

test('two isolated Chrome profiles complete a synchronized room journey',async({browser},testInfo)=>{
  const hostProfile=await browser.newContext({viewport:{width:1280,height:1040},recordVideo:{dir:testInfo.outputPath('host-video'),size:{width:1280,height:1040}},permissions:['clipboard-read','clipboard-write']});
  const guestProfile=await browser.newContext({viewport:{width:1280,height:1040},recordVideo:{dir:testInfo.outputPath('guest-video'),size:{width:1280,height:1040}}});
  const host=await hostProfile.newPage();const guest=await guestProfile.newPage();
  try{
    await host.goto('/sequence/');
    await expect(host.locator('.lobby-shell')).toBeVisible();
    await expect(host.locator('.code-badge small')).toHaveText('CODE');
    const code=(await host.locator('.code-badge strong').innerText()).trim();expect(code).toMatch(/^\d{2}$/);
    await shot(host,testInfo,'01-host-neutral-lobby');
    await host.locator('.code-badge').click();await expect(host.locator('[data-sonner-toast]')).toContainText('Invite copied');await shot(host,testInfo,'01b-invite-toast');
    expect(await host.evaluate(()=>navigator.clipboard.readText())).toMatch(new RegExp(`/sequence/join\\?code=${code}$`));

    await host.locator('.team-panel').nth(0).getByLabel('Select blue').click();
    await host.locator('.team-panel').nth(1).getByLabel('Select red').click();
    await host.locator('.avatar-button').click();
    await expect(host.locator('.team-panel').nth(0).locator('.player')).toHaveCount(1);
    await expect(host.getByRole('heading',{name:'Choose avatar'})).toBeVisible();
    await host.getByLabel('Avatar 6').click();
    await host.locator('.player-name').dblclick();
    await host.getByLabel('Player name').fill('Amara');await host.getByLabel('Player name').press('Enter');
    await expect(host.locator('.player').first()).toHaveAttribute('title',/Amara/);

    await guest.goto(`/sequence/join?code=${code}`);
    await expect(guest.getByRole('heading',{name:'Enter the game code'})).toBeVisible();
    await expect(guest.getByRole('textbox',{name:'Game code'})).toHaveValue(code);
    await expect(guest.getByRole('button',{name:/Join Game/i})).toBeEnabled();
    await shot(guest,testInfo,'02-join-game');
    await guest.getByRole('button',{name:/Join Game/i}).click();
    await expect(guest.locator('.lobby-shell')).toBeVisible();
    await expect(host.locator('.player')).toHaveCount(2);
    await expect(guest.locator('.player')).toHaveCount(2);
    await shot(host,testInfo,'02-host-balanced-lobby');await shot(guest,testInfo,'03-guest-balanced-lobby');

    await expect(host.getByRole('button',{name:/Start game/})).toBeEnabled();
    await host.getByRole('button',{name:/Start game/}).click();
    await expect(host.locator('.board-grid')).toBeVisible();await expect(guest.locator('.board-grid')).toBeVisible();
    await expect(host.locator('.game-top .player').first().locator('.avatar')).toHaveCSS('border-top-color','rgb(47, 107, 255)');await expect(host.locator('.game-top .player').nth(1).locator('.avatar')).toHaveCSS('border-top-color','rgb(229, 72, 77)');
    await expect(host.locator('.board-cell')).toHaveCount(100);await expect(host.locator('.hand-card')).toHaveCount(7);
    expect(await host.locator('.board-cell img,.hand-card img').evaluateAll(images=>images.every(image=>(image as HTMLImageElement).complete&&(image as HTMLImageElement).naturalWidth>0))).toBe(true);
    expect(await guest.locator('.board-cell img,.hand-card img').evaluateAll(images=>images.every(image=>(image as HTMLImageElement).complete&&(image as HTMLImageElement).naturalWidth>0))).toBe(true);
    await expect(host.getByRole('status')).toHaveCount(0);
    const top=await host.locator('.game-top').boundingBox(),board=await host.locator('.board-wrap').boundingBox(),hand=await host.locator('.hand').boundingBox();
    expect(top).not.toBeNull();expect(board).not.toBeNull();expect(hand).not.toBeNull();
    expect(top!.x).toBe(0);expect(top!.y).toBe(0);expect(top!.width).toBe(1280);
    expect(board!.x).toBeGreaterThan(0);expect(board!.width/board!.height).toBeCloseTo(998/800,2);expect(board!.y).toBeGreaterThan(top!.height);expect(board!.y+board!.height).toBeLessThan(hand!.y);expect(board!.y-top!.height).toBeCloseTo(hand!.y-board!.y-board!.height,0);
    expect(hand!.x).toBe(0);expect(hand!.width).toBe(1280);expect(hand!.y+hand!.height).toBeCloseTo(1040,0);
    await shot(host,testInfo,'04-host-game-rest');await shot(guest,testInfo,'05-guest-game-rest');

    const hostIsCurrent=await host.evaluate(async()=>{const session=await fetch('/sequence/api/session',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}).then(response=>response.json());return session.room.round.currentSeatId===session.room.yourSeatId});
    const mover=hostIsCurrent?host:guest;const observer=hostIsCurrent?guest:host;
    await choosePlayable(mover);
    await expect(mover.locator('.hand-card.selected')).toHaveCount(1);
    await expect(mover.locator('.board-cell.valid').first()).toBeVisible();
    expect(await mover.locator('.board-cell.valid').first().evaluate(element=>{const style=getComputedStyle(element,'::after');return{content:style.content,width:style.borderTopWidth}})).toEqual({content:'none',width:'0px'});
    await expect.poll(()=>mover.locator('.hand-card.selected').evaluate(element=>new DOMMatrixReadOnly(getComputedStyle(element).transform).m42)).toBeLessThan(0);
    await shot(mover,testInfo,'06-selected-card-no-target-hints');
    await mover.locator('.board-cell.valid').first().click();
    await expect(mover.locator('.board-cell.last')).toHaveCount(1);await expect(observer.locator('.board-cell.last')).toHaveCount(1);
    await expect(mover.locator('.hand-card.selected')).toHaveCount(0);
    await shot(mover,testInfo,'07-move-committed');await shot(observer,testInfo,'08-move-synchronized');

    await host.getByRole('button',{name:'Menu'}).click();await expect(host.getByRole('dialog',{name:'Game menu'})).toBeVisible();
    const tvRoomId=await host.evaluate(async()=>{const session=await fetch('/sequence/api/session',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}).then(response=>response.json());return session.room.id});
    await host.getByRole('button',{name:'Copy TV Link'}).click();await expect(host.locator('[data-sonner-toast]')).toContainText('TV link copied');expect(await host.evaluate(()=>navigator.clipboard.readText())).toBe(`${new URL(host.url()).origin}/sequence/tv/${tvRoomId}`);await host.getByRole('button',{name:'Menu'}).click();
    await expect(host.getByRole('switch',{name:/Sound/})).toHaveAttribute('aria-checked','true');await expect(host.getByRole('switch',{name:/Sound/}).locator('.switch')).toHaveClass(/on/);
    await host.getByRole('switch',{name:/Sound/}).click();await expect(host.getByRole('switch',{name:/Sound/})).toHaveAttribute('aria-checked','false');await host.getByRole('switch',{name:/Sound/}).click();await expect(host.getByRole('switch',{name:/Sound/})).toHaveAttribute('aria-checked','true');
    await shot(host,testInfo,'09-menu-overlay');await host.locator('.menu-scrim').click({position:{x:100,y:500}});await expect(host.getByRole('dialog',{name:'Game menu'})).toBeHidden();
    await host.getByRole('button',{name:'Menu'}).click();await host.getByRole('button',{name:'How to play'}).click();
    await expect(host.getByRole('heading',{name:'Make a sequence of five.'})).toBeVisible();await expect(host.getByText('Two-eyed Jacks')).toBeVisible();await host.getByRole('button',{name:'Close'}).click();
    await host.getByRole('button',{name:'Menu'}).click();await host.getByRole('button',{name:'New game'}).click();
    await expect(host.getByRole('heading',{name:'Start a new game?'})).toBeVisible();await host.getByRole('button',{name:'Keep playing'}).click();

    const roomId=await host.evaluate(async()=>{const session=await fetch('/sequence/api/session',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}).then(r=>r.json());return session.room.id});
    await host.evaluate(async id=>{await fetch('/sequence/api/test/fixture',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({roomId:id,kind:'sequence'})})},roomId);
    await expect(host.locator('.board-cell.sequence-cell')).toHaveCount(5);await expect(guest.locator('.board-cell.sequence-cell')).toHaveCount(5);
    await expect(host.locator('.player.current')).toHaveCount(1);
    await expect(host.locator('.player').filter({hasText:'Sequence made'})).toHaveCount(1);
    await shot(host,testInfo,'10-completed-sequence-next-turn');

    await host.evaluate(async id=>{await fetch('/sequence/api/test/fixture',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({roomId:id,kind:'win'})})},roomId);
    await expect(host.getByText(/GAME OVER · .* WINS/)).toBeVisible();await expect(guest.getByText(/GAME OVER · .* WINS/)).toBeVisible();
    await expect(host.locator('.sequence-reveal>svg>circle')).toHaveCount(9);await expect(guest.locator('.sequence-reveal>svg>circle')).toHaveCount(9);
    await host.waitForTimeout(300);const resultBar=await host.locator('.result-bar').boundingBox();expect(resultBar).not.toBeNull();expect(resultBar!.y+resultBar!.height).toBeCloseTo(1040,0);
    await shot(host,testInfo,'11-winner-overlay');await shot(guest,testInfo,'12-result-other-profile');
    await expect(guest.getByRole('button',{name:/Replay/})).toBeVisible();
    await expect(guest.getByRole('button',{name:'New game'})).toBeVisible();
    await guest.getByRole('button',{name:/Replay/}).click();
    await expect(host.getByText(/GAME OVER · .* WINS/)).toBeHidden();await expect(guest.getByText(/GAME OVER · .* WINS/)).toBeHidden();
    await expect(host.locator('.chip')).toHaveCount(0);await expect(guest.locator('.chip')).toHaveCount(0);
    await shot(host,testInfo,'13-replay-fresh-round');
    await host.getByRole('button',{name:'Menu'}).click();await host.getByRole('button',{name:'New game'}).click();await host.getByRole('alertdialog').getByRole('button',{name:'New game'}).click();
    await expect(host.locator('.lobby-shell')).toBeVisible();await expect(guest.locator('.lobby-shell')).toBeVisible();
    await expect(host.locator('.player')).toHaveCount(2);await expect(guest.locator('.player')).toHaveCount(2);await expect(host.locator('.color-control')).toHaveText(['BLUE','RED']);
  }finally{await close(hostProfile);await close(guestProfile)}
});

test('lobby fills the viewport while retaining the approved proportions',async({page})=>{
  await page.setViewportSize({width:1280,height:1040});
  await page.goto('/sequence/');
  const stage=await page.locator('.stage').boundingBox();expect(stage).toEqual({x:0,y:0,width:1280,height:1040});
  expect(await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,innerWidth,innerHeight}))).toEqual({width:1280,height:1040,innerWidth:1280,innerHeight:1040});
  await expect(page.getByText('Select a color for each team to continue')).toHaveCount(0);
  await page.locator('.team-panel').nth(0).getByLabel('Select blue').click();await expect(page.locator('.team-panel').nth(0)).toHaveCSS('box-shadow','none');
});

test('team color control cycles through every unclaimed color and the empty state',async({page})=>{
  await page.goto('/sequence/');const blue=page.locator('.team-panel').nth(0);const red=page.locator('.team-panel').nth(1);
  await blue.getByRole('button',{name:'Select blue'}).click();await red.getByRole('button',{name:'Select red'}).click();
  await expect(blue.locator('.color-control')).toContainText('BLUE');
  await blue.getByRole('button',{name:'Select green'}).click();await expect(blue.locator('.color-control')).toContainText('GREEN');
  await blue.getByRole('button',{name:'Clear team color'}).click();await expect(blue.locator('.color-control')).toContainText('SELECT COLOR');
  await blue.getByRole('button',{name:'Select blue'}).click();await expect(blue.locator('.color-control')).toContainText('BLUE');
});

test('a non-host can change any unclaimed lobby color',async({browser})=>{
  const hostProfile=await browser.newContext({viewport:{width:1280,height:1040}});const guestProfile=await browser.newContext({viewport:{width:1280,height:1040}});const host=await hostProfile.newPage();const guest=await guestProfile.newPage();
  try{
    await host.goto('/sequence/');const code=(await host.locator('.code-badge strong').innerText()).trim();await guest.goto(`/sequence/join?code=${code}`);await guest.getByRole('button',{name:'Join game'}).click();
    const first=guest.locator('.team-panel').nth(0);await expect(first.getByRole('button',{name:'Select blue'})).toBeEnabled();await first.getByRole('button',{name:'Select blue'}).click();await expect(first.locator('.color-control')).toContainText('BLUE');await expect(host.locator('.team-panel').nth(0).locator('.color-control')).toContainText('BLUE');
  }finally{await close(hostProfile);await close(guestProfile)}
});

test('tapping a lobby player opens centered host, move, remove, and leave actions',async({browser})=>{
  const hostProfile=await browser.newContext({viewport:{width:1280,height:1040}});const guestProfile=await browser.newContext({viewport:{width:1280,height:1040}});const host=await hostProfile.newPage();const guest=await guestProfile.newPage();
  try{
    await host.goto('/sequence/');const code=(await host.locator('.code-badge strong').innerText()).trim();await guest.goto(`/sequence/join?code=${code}`);await guest.getByRole('textbox',{name:'Your name'}).fill('Amara');await guest.getByRole('button',{name:'Join game'}).click();
    await host.locator('.player').filter({hasText:'Amara'}).click();const options=host.getByRole('dialog',{name:'Amara options'});await expect(options).toBeVisible();await expect(options.getByRole('button',{name:'Make host'})).toBeVisible();await expect(options.getByRole('button',{name:'Move to unselected team'})).toBeVisible();await expect(options.getByRole('button',{name:'Remove'})).toBeVisible();
    await options.getByRole('button',{name:'Make host'}).click();await expect(guest.locator('.player').filter({hasText:'Amara'}).locator('.host-crown')).toHaveCount(1);
    await guest.locator('.player').filter({hasText:'Amara'}).click();await expect(guest.getByRole('dialog',{name:'Amara options'}).getByRole('button',{name:'Leave game'})).toBeVisible();
  }finally{await close(hostProfile);await close(guestProfile)}
});

test('one human move receives exactly one computer reply after a visible pause',async({page})=>{
  await page.setViewportSize({width:1280,height:1040});await page.goto('/sequence/');
  await page.locator('.team-panel').nth(0).getByLabel('Select blue').click();
  await page.locator('.team-panel').nth(1).getByLabel('Select red').click();
  await page.locator('.team-panel').nth(1).getByRole('button',{name:'Add computer'}).click();
  await page.getByRole('button',{name:/Start game/}).click();
  await expect(page.locator('.player.current').locator('.player-copy small')).toHaveText('Your turn',{timeout:4_000});
  const round=()=>page.evaluate(async()=>{const session=await fetch('/sequence/api/session',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}).then(response=>response.json());return{turn:session.room.round.turn,current:session.room.round.currentSeatId,you:session.room.yourSeatId,last:session.room.round.lastMove}});
  const before=await round();await choosePlayable(page);await page.locator('.board-cell.valid').first().click();
  await expect.poll(async()=>(await round()).turn).toBe(before.turn+1);
  const committed=await round();expect(committed.current).not.toBe(committed.you);
  await page.waitForTimeout(500);expect((await round()).turn).toBe(committed.turn);
  await expect.poll(async()=>(await round()).turn,{timeout:2_500}).toBe(committed.turn+1);
  const replied=await round();expect(replied.current).toBe(replied.you);expect(replied.last?.seatId).not.toBe(replied.you);
  await page.waitForTimeout(1_200);expect((await round()).turn).toBe(replied.turn);
});

test('growing rosters reflow inside the viewport without overflow',async({page},testInfo)=>{
  await page.setViewportSize({width:1280,height:1040});await page.goto('/sequence/');
  const red=page.locator('.team-panel').nth(1);for(let index=0;index<4;index++)await red.getByRole('button',{name:'Add computer'}).click();
  const panel=await red.boundingBox();const add=await red.getByRole('button',{name:'Add computer'}).boundingBox();const footer=await page.locator('.lobby-footer').boundingBox();
  expect(panel).not.toBeNull();expect(add).not.toBeNull();expect(footer).not.toBeNull();
  expect(add!.y+add!.height).toBeLessThanOrEqual(panel!.y+panel!.height);expect(footer!.y).toBeGreaterThanOrEqual(panel!.y+panel!.height);
  await expect(page.getByRole('button',{name:'Invite a friend'})).toHaveCount(0);
  expect(await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,innerWidth,innerHeight}))).toEqual({width:1280,height:1040,innerWidth:1280,innerHeight:1040});
  await shot(page,testInfo,'expanded-roster');
});

test('team headers omit player counts and an empty third team collapses through its neutral swatch',async({page})=>{
  await page.setViewportSize({width:1280,height:1040});await page.goto('/sequence/');
  await page.getByRole('button',{name:'Add third team'}).click();
  await expect(page.locator('.team-panel')).toHaveCount(3);
  await expect(page.getByText(/^\d+ PLAYERS?$/)).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Remove team'})).toHaveCount(0);
  await page.locator('.team-panel').nth(1).getByRole('button',{name:'Remove empty team'}).click();
  await expect(page.locator('.team-panel')).toHaveCount(2);
  await expect(page.getByRole('button',{name:'Add third team'})).toBeVisible();
});

test('the fluid viewport fits narrow browser panes without scrolling',async({page})=>{
  await page.setViewportSize({width:285,height:800});await page.goto('/sequence/');
  await expect(page.locator('.lobby-shell')).toBeVisible();
  expect(await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,innerWidth,innerHeight,bodyScrollWidth:document.body.scrollWidth}))).toEqual({scrollWidth:285,scrollHeight:800,innerWidth:285,innerHeight:800,bodyScrollWidth:285});
  const stage=await page.locator('.stage').boundingBox();expect(stage?.x).toBeGreaterThanOrEqual(0);expect(stage?.width).toBeCloseTo(285,0);
  await page.getByRole('button',{name:'Add third team'}).click();
  await expect(page.locator('.team-panel').nth(1).locator('.color-control')).toContainText('GREEN');
  await expect(page.getByText('0 PLAYERS')).toHaveCount(0);
});

test('the mobile lobby owns its vertical scroll when its content grows',async({page})=>{
  await page.setViewportSize({width:390,height:700});await page.goto('/sequence/');const lobby=page.locator('.lobby-shell');const red=page.locator('.team-panel').nth(1);for(let index=0;index<4;index++)await red.getByRole('button',{name:'Add computer'}).click();
  const before=await lobby.evaluate(element=>({clientHeight:element.clientHeight,scrollHeight:element.scrollHeight,scrollTop:element.scrollTop}));expect(before.clientHeight).toBe(700);expect(before.scrollHeight).toBeGreaterThan(before.clientHeight);
  await lobby.evaluate(element=>element.scrollTo({top:element.scrollHeight,behavior:'instant'}));await expect.poll(()=>lobby.evaluate(element=>element.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,innerWidth,innerHeight}))).toEqual({width:390,height:700,innerWidth:390,innerHeight:700});
});

test('a short wide viewport uses the available height without scrolling',async({page})=>{
  await page.setViewportSize({width:1280,height:700});await page.goto('/sequence/');await expect(page.locator('.lobby-shell')).toBeVisible();
  const stage=await page.locator('.stage').boundingBox();expect(stage).not.toBeNull();expect(stage!.y).toBeCloseTo(0,0);expect(stage!.height).toBeCloseTo(700,0);expect(stage!.width).toBeLessThanOrEqual(1280);
  expect(await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,innerWidth,innerHeight}))).toEqual({scrollWidth:1280,scrollHeight:700,innerWidth:1280,innerHeight:700});
});

test('wide-monitor shell fills every edge while the board retains its aspect ratio and breathing room',async({page},testInfo)=>{
  await page.setViewportSize({width:1663,height:1186});await page.goto('/sequence/');
  await page.locator('.team-panel').nth(0).getByLabel('Select blue').click();await page.locator('.team-panel').nth(1).getByLabel('Select red').click();
  await page.locator('.team-panel').nth(1).getByRole('button',{name:'Add computer'}).click();await page.getByRole('button',{name:/Start game/}).click();
  const top=await page.locator('.game-top').boundingBox(),board=await page.locator('.board-wrap').boundingBox(),hand=await page.locator('.hand').boundingBox();
  expect(top).not.toBeNull();expect(board).not.toBeNull();expect(hand).not.toBeNull();
  expect(top!.x).toBe(0);expect(top!.y).toBe(0);expect(top!.width).toBe(1663);
  expect(board!.x).toBeGreaterThan(0);expect(board!.width/board!.height).toBeCloseTo(998/800,2);expect(board!.x).toBeCloseTo((1663-board!.width)/2,0);expect(board!.y).toBeGreaterThan(top!.height);expect(board!.y+board!.height).toBeLessThan(hand!.y);expect(board!.y-top!.height).toBeCloseTo(hand!.y-board!.y-board!.height,0);
  expect(hand!.x).toBe(0);expect(hand!.width).toBe(1663);expect(hand!.y+hand!.height).toBeCloseTo(1186,0);
  expect(await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,innerWidth,innerHeight}))).toEqual({width:1663,height:1186,innerWidth:1663,innerHeight:1186});
  await shot(page,testInfo,'wide-monitor-fluid-game');
});

test('mobile play fills the viewport without page scrolling and keeps the board pan internal',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/sequence/');
  await page.locator('.team-panel').nth(0).getByLabel('Select blue').click();await page.locator('.team-panel').nth(1).getByLabel('Select red').click();
  await page.locator('.team-panel').nth(1).getByRole('button',{name:'Add computer'}).click();await page.getByRole('button',{name:/Start game/}).click();await expect(page.locator('.board-grid')).toBeVisible();
  const top=await page.locator('.game-top').boundingBox(),stage=await page.locator('.board-stage').boundingBox(),hand=await page.locator('.hand').boundingBox(),board=await page.locator('.board-wrap').boundingBox();
  expect(top).not.toBeNull();expect(stage).not.toBeNull();expect(hand).not.toBeNull();expect(board).not.toBeNull();
  expect(top!.y).toBe(0);expect(stage!.y).toBeCloseTo(top!.height,0);expect(stage!.y+stage!.height).toBeCloseTo(hand!.y,0);expect(hand!.y+hand!.height).toBeCloseTo(844,0);expect(board!.height).toBeCloseTo(stage!.height,0);expect(board!.width).toBeGreaterThan(390);
  await expect(page.locator('.mobile-player-stack img')).toHaveCount(2);
  await expect(page.locator('.mobile-player-stack>span').first()).toHaveCSS('border-top-color','rgb(47, 107, 255)');await expect(page.locator('.mobile-player-stack>span').nth(1)).toHaveCSS('border-top-color','rgb(229, 72, 77)');expect(await page.locator('.mobile-player-stack>span.current').evaluate(element=>getComputedStyle(element).boxShadow)).toContain('rgb(245, 196, 81)');
  const players=await page.locator('.mobile-player-stack').boundingBox(),menuButton=await page.getByRole('button',{name:'Menu'}).boundingBox();expect(players).not.toBeNull();expect(menuButton).not.toBeNull();expect(menuButton!.x-(players!.x+players!.width)).toBeCloseTo(12,0);expect(players!.y+players!.height/2).toBeCloseTo(menuButton!.y+menuButton!.height/2,0);
  const pan=await page.locator('.board-stage').evaluate(element=>({clientWidth:element.clientWidth,scrollWidth:element.scrollWidth}));expect(pan.clientWidth).toBe(390);expect(pan.scrollWidth).toBeGreaterThan(pan.clientWidth);
  expect(await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,innerWidth,innerHeight}))).toEqual({width:390,height:844,innerWidth:390,innerHeight:844});
  const roomId=await page.evaluate(async()=>{const session=await fetch('/sequence/api/session',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}).then(response=>response.json());return session.room.id});await page.evaluate(async id=>{await fetch('/sequence/api/test/fixture',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({roomId:id,kind:'placement'})})},roomId);
  await page.locator('.board-stage').evaluate(element=>element.scrollTo({left:140}));await choosePlayable(page);await page.waitForTimeout(350);expect(await page.locator('.board-stage').evaluate(element=>element.scrollLeft)).toBeCloseTo(140,0);await page.locator('.hand-card.selected').click();await page.waitForTimeout(350);expect(await page.locator('.board-stage').evaluate(element=>element.scrollLeft)).toBeCloseTo(140,0);
  await shot(page,testInfo,'mobile-board-view');
  await page.getByRole('button',{name:'Menu'}).click();await page.getByRole('button',{name:'How to play'}).click();const rules=await page.getByRole('dialog',{name:'Make a sequence of five.'}).boundingBox();expect(rules).not.toBeNull();expect(rules!.x).toBeGreaterThanOrEqual(16);expect(rules!.x+rules!.width).toBeLessThanOrEqual(374);expect(rules!.y).toBeGreaterThanOrEqual(0);expect(rules!.y+rules!.height).toBeLessThanOrEqual(844);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);await shot(page,testInfo,'mobile-how-to-play');await page.getByRole('button',{name:'Close'}).click();
  await page.evaluate(async id=>{await fetch('/sequence/api/test/fixture',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({roomId:id,kind:'win'})})},roomId);
  const result=await page.locator('.result-bar').boundingBox();expect(result).not.toBeNull();expect(result!.x).toBeGreaterThanOrEqual(0);expect(result!.x+result!.width).toBeLessThanOrEqual(390);expect(await page.locator('.result-bar').evaluate(element=>getComputedStyle(element).animationName)).toBe('mobile-result-in');
  await expect(page.getByRole('button',{name:/Play again/})).toBeVisible();await expect(page.getByRole('button',{name:'New game'})).toBeVisible();
  await shot(page,testInfo,'mobile-win-dialog');
});

test('the Canvas menu overlay remains fully visible in a narrow browser pane',async({page},testInfo)=>{
  await page.setViewportSize({width:285,height:800});await page.goto('/sequence/');
  await page.locator('.team-panel').nth(0).getByLabel('Select blue').click();
  await page.locator('.team-panel').nth(1).getByLabel('Select red').click();
  await page.locator('.team-panel').nth(1).getByRole('button',{name:'Add computer'}).click();
  await page.getByRole('button',{name:/Start game/}).click();
  await page.getByRole('button',{name:'Menu'}).click();
  const menu=await page.getByRole('dialog',{name:'Game menu'}).boundingBox();
  expect(menu).not.toBeNull();expect(menu!.x).toBeGreaterThanOrEqual(0);expect(menu!.x+menu!.width).toBeLessThanOrEqual(285);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(285);
  await shot(page,testInfo,'narrow-menu-overlay');
});

test('the game menu enters fullscreen and Escape restores the browser view',async({page})=>{
  await page.setViewportSize({width:1280,height:1040});await page.goto('/sequence/');
  await page.locator('.team-panel').nth(0).getByLabel('Select blue').click();await page.locator('.team-panel').nth(1).getByLabel('Select red').click();
  await page.locator('.team-panel').nth(1).getByRole('button',{name:'Add computer'}).click();await page.getByRole('button',{name:/Start game/}).click();
  await expect.poll(()=>page.evaluate(()=>Boolean(document.fullscreenElement))).toBe(true);
  await page.keyboard.press('Escape');await expect.poll(()=>page.evaluate(()=>Boolean(document.fullscreenElement))).toBe(false);
  await page.getByRole('button',{name:'Menu'}).click();await page.getByRole('switch',{name:'Full screen'}).click();
  await expect.poll(()=>page.evaluate(()=>Boolean(document.fullscreenElement))).toBe(true);
  await page.keyboard.press('Escape');await expect.poll(()=>page.evaluate(()=>Boolean(document.fullscreenElement))).toBe(false);
});

test('TV conversion vacates the current seat and the next joining player becomes host',async({browser},testInfo)=>{
  const tvProfile=await browser.newContext({viewport:{width:1280,height:1040},recordVideo:{dir:testInfo.outputPath('tv-video'),size:{width:1280,height:1040}}});
  const playerProfile=await browser.newContext({viewport:{width:1280,height:1040},recordVideo:{dir:testInfo.outputPath('controller-video'),size:{width:1280,height:1040}}});
  const tv=await tvProfile.newPage();const player=await playerProfile.newPage();
  try{
    await tv.goto('/sequence/');const code=(await tv.locator('.code-badge strong').innerText()).trim();await tv.getByRole('button',{name:'TV View'}).click();
    await expect(tv).toHaveURL(/\/sequence\/tv\//);await expect(tv.locator('.tv-lobby')).toBeVisible();await expect(tv.locator('.player')).toHaveCount(0);
    await player.goto(`/sequence/join?code=${code}`);await player.getByRole('button',{name:'Join game'}).click();await expect(player.locator('.host-crown')).toHaveCount(1);
    await player.locator('.team-panel').nth(0).getByLabel('Select blue').click();await player.locator('.team-panel').nth(1).getByLabel('Select red').click();
    await player.locator('.team-panel').nth(1).getByRole('button',{name:'Add computer'}).click();await player.getByRole('button',{name:/Start game/}).click();
    await expect(tv.locator('.board-grid')).toBeVisible();await expect(tv.locator('.hand-card')).toHaveCount(0);await expect(tv.locator('.tv-status')).toBeVisible();await expect(tv.locator('.tv-status')).toContainText('Player is picking a card…');
    await expect(player.locator('.controller-view')).toBeVisible();await expect(player.locator('.hand-card')).toHaveCount(7);
    await expect(player.getByRole('button',{name:'Place chip on selected space'})).toHaveCount(0);const center=await player.locator('.dpad-select>span').boundingBox();expect(center).not.toBeNull();expect(center!.width).toBeCloseTo(center!.height,1);
    const desktopAction=await player.getByRole('button',{name:'Place chip',exact:true}).boundingBox(),desktopHand=await player.locator('.hand').boundingBox();expect(desktopAction).not.toBeNull();expect(desktopHand).not.toBeNull();expect(desktopHand!.y-(desktopAction!.y+desktopAction!.height)).toBeCloseTo(24,0);
    await player.getByRole('button',{name:'Menu'}).click();await expect(player.getByRole('button',{name:'Controller View'})).toBeVisible();await player.getByRole('button',{name:'Controller View'}).click();await expect(player.locator('.board-grid')).toBeVisible();await player.reload();await expect(player.locator('.board-grid')).toBeVisible();await expect(player.locator('.controller-view')).toHaveCount(0);await player.getByRole('button',{name:'Menu'}).click();await player.getByRole('button',{name:'Controller View'}).click();await expect(player.locator('.controller-view')).toBeVisible();
    await player.evaluate(()=>document.fullscreenElement?document.exitFullscreen():undefined);await player.setViewportSize({width:390,height:844});const mobileAction=await player.getByRole('button',{name:'Place chip',exact:true}).boundingBox(),mobileHand=await player.locator('.hand').boundingBox();expect(mobileAction).not.toBeNull();expect(mobileHand).not.toBeNull();expect(mobileHand!.y-(mobileAction!.y+mobileAction!.height)).toBeCloseTo(24,0);await shot(player,testInfo,'controller-mobile-action-spacing');await player.setViewportSize({width:1280,height:1040});
    await tv.getByRole('button',{name:'Menu'}).click();await expect(tv.getByRole('button',{name:'Close TV view'})).toBeVisible();await expect(tv.getByRole('button',{name:'New game'})).toHaveCount(0);await expect(tv.getByRole('button',{name:'Leave game'})).toHaveCount(0);await expect(tv.getByRole('button',{name:'TV View',exact:true})).toHaveCount(0);await expect(tv.getByRole('button',{name:'Copy TV Link'})).toHaveCount(0);await tv.locator('.menu-scrim').click({position:{x:40,y:400}});
    const roomId=await player.evaluate(async()=>{const session=await fetch('/sequence/api/session',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}).then(response=>response.json());return session.room.id});await player.evaluate(async id=>{await fetch('/sequence/api/test/fixture',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({roomId:id,kind:'placement'})})},roomId);await expect(player.getByRole('heading',{name:'Your turn'})).toBeVisible({timeout:4_000});
    const choice=await player.evaluate(async()=>{const room=(await fetch('/sequence/api/session',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}).then(response=>response.json())).room;const action=room.yourActions.find((candidate:{cells:unknown[]})=>candidate.cells.length);return{action,index:room.yourHand.findIndex((card:{id:string})=>card.id===action.cardId)}});const {action, index:playableIndex}=choice;
    const playable=player.locator('.hand-card').nth(playableIndex);await playable.click();const focused=tv.locator('.board-cell.controller-focus');await expect(focused).toHaveCount(1);
    expect(await focused.evaluate(element=>getComputedStyle(element,'::after').borderTopColor)).toBe('rgb(47, 107, 255)');expect(await focused.locator('.chip')).toHaveCount(action.kind==='remove'?1:0);
    const before=await focused.evaluate(element=>`${element.getAttribute('data-row')},${element.getAttribute('data-col')}`);let after=before;
    if(action.cells.length>1){expect(action.cells).toHaveLength(2);const origin=toDisplay(action.cells[0]);const target=toDisplay(action.cells[1]);const direction=target.col<origin.col?'left':target.col>origin.col?'right':target.row<origin.row?'up':'down';await player.getByRole('button',{name:`Move ${direction}`}).click();after=await focused.evaluate(element=>`${element.getAttribute('data-row')},${element.getAttribute('data-col')}`);const [row,col]=after.split(',').map(Number);const moved=toDisplay({row,col});if(direction==='left')expect(moved.col).toBeLessThan(origin.col);if(direction==='right')expect(moved.col).toBeGreaterThan(origin.col);if(direction==='up')expect(moved.row).toBeLessThan(origin.row);if(direction==='down')expect(moved.row).toBeGreaterThan(origin.row);await player.getByRole('button',{name:`Move ${direction}`}).click();await expect.poll(()=>focused.evaluate(element=>`${element.getAttribute('data-row')},${element.getAttribute('data-col')}`)).toBe(before)}
    expect(action.cells.map((cell:{row:number;col:number})=>`${cell.row},${cell.col}`)).toContain(after);if(action.cells.length>1)expect(after).not.toBe(before);
    await shot(player,testInfo,'controller-view-selected');await shot(tv,testInfo,'tv-view-synchronized-target');
    await playable.click();
    await player.evaluate(async id=>{await fetch('/sequence/api/test/fixture',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({roomId:id,kind:'removal'})})},roomId);
    const jack=player.locator('.hand-card').filter({has:player.locator('img[alt="JH"]')}).first();await expect(jack).toBeEnabled();await jack.click();await expect(player.getByRole('button',{name:'Remove chip'})).toBeVisible();await expect(focused).toHaveCount(1);await expect(focused.locator('.chip')).toHaveCount(1);expect(await focused.evaluate(element=>getComputedStyle(element,'::after').borderTopColor)).toBe('rgb(47, 107, 255)');await shot(player,testInfo,'controller-one-eyed-removal');await shot(tv,testInfo,'tv-one-eyed-removal-target');
    await player.getByRole('button',{name:'Remove chip'}).click();const last=tv.locator('.board-cell.last');await expect(last).toHaveCount(1);await expect(last.locator('.chip')).toHaveCount(0);expect(await last.evaluate(element=>getComputedStyle(element,'::after').borderTopColor)).toBe('rgb(47, 107, 255)');await shot(tv,testInfo,'tv-one-eyed-removal-committed');
    await tv.close();await expect(player.locator('.board-grid')).toBeVisible();
    await player.getByRole('button',{name:'Menu'}).click();await expect(player.getByRole('button',{name:'Controller View'})).toHaveCount(0);
  }finally{await close(tvProfile);await close(playerProfile)}
});

test('three-team lobby assigns the remaining color and preserves its configuration for a new game',async({page},testInfo)=>{
  await page.setViewportSize({width:1280,height:1040});await page.goto('/sequence/');
  const original=(await page.locator('.code-badge strong').innerText()).trim();
  await page.locator('.team-panel').nth(0).getByLabel('Select blue').click();
  await page.locator('.team-panel').nth(1).getByLabel('Select red').click();
  await page.getByRole('button',{name:'Add third team'}).click();
  await expect(page.locator('.team-panel')).toHaveCount(3);await expect(page.locator('.team-panel').nth(1).locator('.color-control')).toContainText('GREEN');
  await page.locator('.team-panel').nth(1).getByRole('button',{name:'Add computer'}).click();
  await expect(page.locator('.color-control')).toHaveText(['BLUE','GREEN','RED']);
  await page.locator('.team-panel').nth(0).getByRole('button',{name:'Add computer'}).click();
  await page.locator('.team-panel').nth(1).getByRole('button',{name:'Add computer'}).click();
  await page.locator('.team-panel').nth(2).getByRole('button',{name:'Add computer'}).click();await page.locator('.team-panel').nth(2).getByRole('button',{name:'Add computer'}).click();
  await expect(page.getByRole('button',{name:/Start game/})).toBeEnabled();await shot(page,testInfo,'three-team-ready-lobby');
  await page.getByRole('button',{name:/Start game/}).click();await expect(page.locator('.board-grid')).toBeVisible();await expect(page.locator('.hand-card')).toHaveCount(5);
  const roomId=await page.evaluate(async()=>{const session=await fetch('/sequence/api/session',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}).then(response=>response.json());return session.room.id});
  await page.evaluate(async id=>{await fetch('/sequence/api/test/fixture',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({roomId:id,kind:'win'})})},roomId);
  await expect(page.locator('.sequence-reveal>svg>circle')).toHaveCount(5);await expect(page.locator('.result-score-three')).toBeVisible();await expect(page.locator('.sequence-tag')).toContainText('BLUE · ONE SEQUENCE');await expect(page.locator('body>canvas')).toHaveCount(1);await page.screenshot({path:testInfo.outputPath('three-team-confetti-motion.png'),animations:'allow'});await shot(page,testInfo,'three-team-winner-overlay');
  await page.getByRole('button',{name:'New game'}).click();
  const confirm=page.getByRole('alertdialog');await expect(confirm.getByRole('heading',{name:'Start a new game?'})).toBeVisible();await confirm.getByRole('button',{name:'New game'}).click();
  await expect(page.locator('.lobby-shell')).toBeVisible();await expect(page.locator('.code-badge strong')).not.toHaveText(original);
  await expect(page.locator('.team-panel')).toHaveCount(3);await expect(page.locator('.player')).toHaveCount(6);
  await expect(page.locator('.color-control')).toHaveText(['BLUE','GREEN','RED']);
});

test('a complete human-versus-computer game preserves every chip except explicit Jack removals',async({page},testInfo)=>{
  test.setTimeout(150_000);await page.setViewportSize({width:1280,height:1040});await page.goto('/sequence/');
  await page.locator('.team-panel').nth(0).getByLabel('Select blue').click();await page.locator('.team-panel').nth(1).getByLabel('Select red').click();await page.locator('.team-panel').nth(1).getByRole('button',{name:'Add computer'}).click();await page.getByRole('button',{name:/Start game/}).click();
  const state=():Promise<TestRoom>=>page.evaluate(async()=>{const session=await fetch('/sequence/api/session',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}).then(response=>response.json());return session.room});
  const count=(chips:(string|null)[][])=>chips.flat().filter(Boolean).length;
  const assertTransition=(before:TestRoom,after:TestRoom)=>{const beforeCount=count(before.round.chips),afterCount=count(after.round.chips);const changed=before.round.chips.flatMap((row,r)=>row.flatMap((chip,c)=>chip===after.round.chips[r][c]?[]:[[r,c,chip,after.round.chips[r][c]]]));const move=after.round.lastMove;if(move?.turn===before.round.turn){expect(changed).toHaveLength(1);if(move.kind==='place')expect(afterCount).toBe(beforeCount+1);else{expect(move.removedTeamId).toBeTruthy();expect(afterCount).toBe(beforeCount-1)}}else{expect(afterCount).toBe(beforeCount);expect(changed).toHaveLength(0)}};
  const takeHumanTurn=async()=>{for(let attempts=0;attempts<16;attempts++){const pass=page.getByRole('button',{name:'Pass'});if(await pass.isVisible().catch(()=>false)){await pass.click();return}const cards=page.locator('.hand-card:not(:disabled)');for(let i=0;i<await cards.count();i++){await cards.nth(i).click();const valid=page.locator('.board-cell.valid');if(await valid.count()){await valid.first().click();return}const replace=page.getByRole('button',{name:'Replace dead card'});if(await replace.isVisible().catch(()=>false)){await replace.click();break}}}throw new Error('Human turn exposed neither a play, exchange, nor pass')};
  await expect(page.locator('.player.current').locator('.player-copy small')).toHaveText('Your turn',{timeout:4_000});let removals=0;
  for(let cycle=0;cycle<55;cycle++){
    const before=await state();if(before.phase==='finished')break;expect(before.round.currentSeatId).toBe(before.yourSeatId);await takeHumanTurn();await expect.poll(async()=>{const next=await state();return next.phase==='finished'||next.round.currentSeatId!==next.yourSeatId}).toBe(true);const afterHuman=await state();assertTransition(before,afterHuman);expect(await page.locator('.chip').count()).toBe(count(afterHuman.round.chips));if(cycle===0)await shot(page,testInfo,'full-game-human-first-move');if(afterHuman.phase==='finished')break;
    await page.waitForTimeout(500);const paused=await state();expect(paused.round.turn).toBe(afterHuman.round.turn);
    await expect.poll(async()=>{const next=await state();return next.phase==='finished'||next.round.currentSeatId===next.yourSeatId},{timeout:2_500}).toBe(true);const afterComputer=await state();assertTransition(afterHuman,afterComputer);expect(await page.locator('.chip').count()).toBe(count(afterComputer.round.chips));if(afterComputer.round.lastMove?.kind==='remove'){removals++;expect(afterComputer.round.lastMove.removedTeamId).toBeTruthy();await expect(page.locator('.board-cell.removed')).toHaveCount(1)}if(cycle===0)await shot(page,testInfo,'full-game-computer-first-reply');if(afterComputer.phase==='finished')break;
  }
  const finished=await state();expect(finished.phase).toBe('finished');await expect(page.locator('.result-bar')).toBeVisible();expect(await page.locator('.result-bar').evaluate(element=>getComputedStyle(element).animationName)).toBe('result-in');await expect.poll(async()=>{const result=await page.locator('.result-bar').boundingBox();return result?Math.round(result.y+result.height):0}).toBe(1040);await shot(page,testInfo,`full-game-finished-${removals}-removals`);
});

test('credits route renders directly with local-asset attribution',async({page})=>{
  await page.goto('/sequence/credits');
  await expect(page.getByRole('heading',{name:'Made for the table.'})).toBeVisible();
  await expect(page.getByText('Public Domain Deck')).toBeVisible();
  await expect(page.getByText(/Avataaars was created by Pablo Stanley/)).toBeVisible();
  await expect(page.getByRole('link',{name:'Back to game'})).toHaveAttribute('href','/sequence/');
});
