import { expect, test, type Page } from '@playwright/test';

async function chooseColumn(page: Page, column: number) {
  const cell = page.getByRole('button', { name: new RegExp(`^Column ${column},`) }).first();
  await cell.click();
  await expect(cell).toHaveClass(/selected-column/);
  await cell.click();
}

test('two external profiles play, win, and replay Connect 4', async ({ browser }, testInfo) => {
  const hostContext = await browser.newContext({ viewport: { width: 1280, height: 1040 } });
  const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();

  await host.goto('/connect4/');
  await expect(host.getByText('CONNECT 4').first()).toBeVisible();
  await host.locator('.avatar-button').click();
  await expect(host.locator('.avatar-option')).toHaveCount(24);
  await host.getByRole('button', { name: 'Close' }).click();
  await host.locator('.player-name').dblclick();
  await host.locator('.player-copy input').fill('Emmanuel');
  await host.locator('.player-copy input').press('Enter');
  await expect(host.locator('.player-name')).toHaveText('Emmanuel');
  const code = (await host.locator('.code-badge strong').innerText()).trim();
  await host.screenshot({ path: testInfo.outputPath('connect4-lobby-desktop.png') });

  await guest.goto(`/connect4/join?code=${code}`);
  await guest.getByLabel('Your name').fill('Amara');
  await expect(guest.getByText(/Game found/)).toBeVisible();
  await guest.getByRole('button', { name: /Join Game/i }).click();
  await expect(host.locator('.team-players .player')).toHaveCount(2);
  await expect(host.locator('.start')).toBeEnabled();
  await host.locator('.start').click();
  await expect(host.locator('.c4-board')).toBeVisible();
  await expect(guest.locator('.c4-board')).toBeVisible();
  await host.getByRole('button', { name: 'Menu' }).click();
  await host.getByRole('button', { name: 'Leave game' }).click();
  const leaveDialog = host.getByRole('alertdialog');
  await expect(leaveDialog.getByRole('heading', { name: 'Leave this game?' })).toBeVisible();
  await leaveDialog.getByRole('button', { name: 'Stay' }).click();
  await host.screenshot({ path: testInfo.outputPath('connect4-game-desktop.png') });
  await guest.screenshot({ path: testInfo.outputPath('connect4-game-phone.png') });

  for (let turn = 0; turn < 3; turn += 1) {
    await chooseColumn(host, 1);
    await expect(guest.locator('.c4-board .c4-disc.red')).toHaveCount(turn + 1);
    await chooseColumn(guest, 2);
    await expect(host.locator('.c4-board .c4-disc.yellow')).toHaveCount(turn + 1);
  }
  await chooseColumn(host, 1);
  await expect(host.getByText('You win!')).toBeVisible();
  await expect(guest.getByText('You lose')).toBeVisible();
  await expect(guest.getByText('Waiting for the host')).toBeVisible();
  await host.screenshot({ path: testInfo.outputPath('connect4-result-desktop.png') });
  await guest.screenshot({ path: testInfo.outputPath('connect4-result-phone.png') });

  await host.getByRole('button', { name: /Play again/i }).click();
  await expect(host.locator('.c4-result-scrim')).toHaveCount(0);
  await expect(guest.locator('.c4-result-scrim')).toHaveCount(0);
  await expect(host.locator('.c4-board .c4-disc.red')).toHaveCount(0);
  await expect(host.locator('.c4-board .c4-disc.yellow')).toHaveCount(0);

  await hostContext.close();
  await guestContext.close();
});

test('Connect 4 rejects a second move and synchronizes TV view', async ({ browser }) => {
  const hostContext = await browser.newContext();
  const tvContext = await browser.newContext();
  const host = await hostContext.newPage();
  await host.goto('/connect4/');
  await host.locator('.team-panel').nth(1).getByRole('button', { name: /Add computer/i }).click();
  await expect(host.locator('.start')).toBeEnabled();
  const session = await host.evaluate(async () => (await fetch('/connect4/api/session', { method: 'POST' })).json());
  const tv = await tvContext.newPage();
  await tv.goto(`/connect4/tv/${session.room.id}`);
  await host.locator('.start').click();
  await expect(tv.locator('.c4-board')).toBeVisible();
  await chooseColumn(host, 4);
  await expect(tv.locator('.c4-board .c4-disc.red')).toHaveCount(1);
  await expect.poll(async () => tv.locator('.c4-board .c4-disc.yellow').count(), { timeout: 4000 }).toBe(1);
  await expect(host.locator('.c4-board .c4-disc.red')).toHaveCount(1);
  await expect(host.locator('.c4-board .c4-disc.yellow')).toHaveCount(1);
  await hostContext.close();
  await tvContext.close();
});
