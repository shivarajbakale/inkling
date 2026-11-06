import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const editor = (page: Page) => page.locator('.cm-content');
const drawing = (page: Page) => page.locator('.ink-linked .ink-stage svg');

/** Replaces everything in the code editor. */
async function setSource(page: Page, text: string) {
  await editor(page).click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.insertText(text);
}

async function openEditor(page: Page) {
  await page.goto('#playground');
  await expect(drawing(page)).toBeVisible();
}

test('typing redraws; an error is underlined and its quick fix clears it', async ({ page }) => {
  await openEditor(page);
  await setSource(page, 'a: box "Alpha"\na -> b : "go"\n');
  await expect(drawing(page)).toContainText('Alpha');

  await page.keyboard.insertText('c: boxx "Gamma"\n');
  await expect(page.locator('.cm-lintRange-error')).toHaveCount(1);
  await expect(page.getByText('No shape called "boxx".')).toBeVisible();

  await page.getByRole('button', { name: 'Change to “box”' }).click();
  await expect(page.locator('.cm-lintRange-error')).toHaveCount(0);
  await expect(editor(page)).toContainText('c: box "Gamma"');
  await expect(drawing(page)).toContainText('Gamma');
});

test('clicking a node selects its line', async ({ page }) => {
  await openEditor(page);
  await setSource(page, 'a: box "Alpha"\nb: box "Beta"\na -> b\n');
  await expect(drawing(page)).toContainText('Beta');
  await page.locator('[data-ink-kind="node"][data-ink-id="b"] text').first().click();
  await expect(page.locator('.cm-activeLine')).toHaveText('b: box "Beta"');
  const selected = await page.evaluate(() => window.getSelection()?.toString());
  expect(selected).toBe('b: box "Beta"');
});

test('double-clicking a label edits it in the source', async ({ page }) => {
  await openEditor(page);
  await setSource(page, 'a: box "Alpha"\na -> b : "go"\n');
  await expect(drawing(page)).toContainText('Alpha');
  await page.locator('[data-ink-kind="node"][data-ink-id="a"] text').first().dblclick();
  const input = page.getByRole('textbox', { name: 'Label' });
  await expect(input).toBeVisible();
  await input.fill('Start here');
  await input.press('Enter');
  await expect(editor(page)).toContainText('a: box "Start here"');
  await expect(drawing(page)).toContainText('Start here');
});

test('right-click a node to circle it', async ({ page }) => {
  await openEditor(page);
  await setSource(page, 'a: box "Alpha"\na -> b\n');
  await expect(drawing(page)).toContainText('Alpha');
  await page.locator('[data-ink-kind="node"][data-ink-id="a"] text').first().click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Circle it' }).click();
  await expect(editor(page)).toContainText('circle a');
  await expect(page.locator('[data-ink-kind="mark"][data-ink-id="a"]')).toHaveCount(1);
});

test('a saved drawing is in the library after a reload', async ({ page }) => {
  await page.goto('#library');
  await page.getByRole('button', { name: 'New drawing' }).first().click();
  await page.getByRole('button', { name: 'Blank' }).click();
  await expect(drawing(page)).toBeVisible();
  const name = page.getByRole('textbox', { name: 'Drawing name' });
  await name.fill('My test drawing');
  await setSource(page, 'title "Kept"\nx -> y\n');
  await page.keyboard.press('ControlOrMeta+s');
  await expect(page.getByTestId('save-status')).toHaveText('Saved');
  await page.reload();
  await page.goto('#library');
  await page.reload();
  const card = page.getByTestId('drawing-card').filter({ hasText: 'My test drawing' });
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Open My test drawing' }).click();
  await expect(editor(page)).toContainText('x -> y');
});

test('using a template creates a library drawing', async ({ page }) => {
  await page.goto('#templates');
  await page.getByRole('button', { name: 'Use Request and reply' }).click();
  await expect(page.getByRole('textbox', { name: 'Drawing name' })).toHaveValue('Request and reply');
  await expect(drawing(page)).toContainText('Server');
  await page.getByRole('link', { name: 'Library' }).or(page.locator('a,button').filter({ hasText: /^Library$/ })).first().click();
  await expect(page.getByTestId('drawing-card').filter({ hasText: 'Request and reply' })).toBeVisible();
});

test('exported SVG embeds the handwriting font', async ({ page }) => {
  // Serve the font requests embedFonts makes, so the test needs no network.
  await page.route(/fonts\.googleapis\.com\/css2.*&text=/, (route) =>
    route.fulfill({
      contentType: 'text/css',
      body: "@font-face { font-family: 'Caveat'; font-weight: 500; src: url(https://fonts.gstatic.com/e2e/caveat.woff2) format('woff2'); }",
    }),
  );
  await page.route('https://fonts.gstatic.com/e2e/**', (route) => route.fulfill({ contentType: 'font/woff2', body: Buffer.from('wOF2fake') }));
  await openEditor(page);
  await page.getByRole('button', { name: 'Export' }).click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: 'SVG file' }).click()]);
  expect(download.suggestedFilename()).toMatch(/\.svg$/);
  const svg = readFileSync((await download.path())!, 'utf8');
  expect(svg).toContain('@font-face');
  expect(svg).toContain('data:font/woff2;base64,');
  expect(svg).not.toContain('@import');
});

test('a share link opens read-only and can be copied', async ({ page, context }) => {
  await openEditor(page);
  await setSource(page, 'title "Shared one"\nping -> pong : "hello"\n');
  await expect(drawing(page)).toContainText('pong');
  await page.getByRole('button', { name: 'Share' }).click();
  const field = page.getByTestId('share-url');
  await expect(field).toHaveValue(/#\/d\/z/);
  const url = await field.inputValue();

  const other = await context.newPage();
  await other.goto(url);
  await expect(other.getByRole('heading', { name: 'Shared one' })).toBeVisible();
  await expect(other.locator('.ink-stage svg')).toContainText('hello');
  await other.getByRole('button', { name: 'Make a copy' }).click();
  await expect(other.getByRole('textbox', { name: 'Drawing name' })).toHaveValue('Shared one');
  await expect(other.locator('.cm-content')).toContainText('ping -> pong');
});

test('a broken share link says what went wrong', async ({ page }) => {
  await page.goto('#/d/zNOT-REAL');
  await expect(page.getByText('This share link is damaged or incomplete.')).toBeVisible();
});

test('present mode steps with the keys', async ({ page }) => {
  await openEditor(page);
  await expect(drawing(page)).toContainText('Resolver');
  await page.getByRole('button', { name: 'Present' }).click();
  const caption = page.getByTestId('present-caption');
  await expect(page.getByTestId('present')).toBeVisible();
  await expect(caption).toHaveText('You type a name, not a number');
  await page.keyboard.press('ArrowRight');
  await expect(caption).toHaveText('The resolver starts at the top');
  await page.keyboard.press('Space');
  await expect(caption).toHaveText('Each server points one level down');
  await page.keyboard.press('ArrowLeft');
  await expect(caption).toHaveText('The resolver starts at the top');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('present')).toHaveCount(0);
  await expect(drawing(page)).toBeVisible();
});

test('the app still works when storage is blocked', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { get: () => undefined });
  });
  await page.goto('#library');
  await expect(page.getByTestId('storage-banner')).toBeVisible();
  await expect(page.getByTestId('drawing-card')).toHaveCount(1);
});

test('editor and drawing become tabs on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 860 });
  await page.goto('#playground');
  await expect(editor(page)).toBeVisible();
  await expect(drawing(page)).toBeHidden();
  await page.getByText('Drawing', { exact: true }).click();
  await expect(drawing(page)).toBeVisible();
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(400);
});

test('hovering a line puts a halo on what it draws', async ({ page }) => {
  await openEditor(page);
  await setSource(page, 'a: box "Alpha"\nb: box "Beta"\na -> b\n');
  await expect(drawing(page)).toContainText('Beta');
  await page.locator('.cm-line', { hasText: 'b: box "Beta"' }).hover();
  await expect(page.locator('.ink-halo[data-ink-id="b"]')).toHaveCount(1);
  await page.locator('.cm-line', { hasText: 'a -> b' }).hover();
  await expect(page.locator('.ink-halo[data-ink-kind="edge"]')).toHaveCount(1);
});

test('completions offer papers, and Format tidies the source', async ({ page }) => {
  await openEditor(page);
  await setSource(page, 'a->b\npaper ');
  await expect(page.locator('.cm-tooltip-autocomplete')).toContainText('chalkboard');
  await page.keyboard.press('Escape');
  await page.keyboard.insertText('graph');
  await page.getByRole('button', { name: 'Format' }).click();
  await expect(page.locator('.cm-line').first()).toHaveText('a -> b');
});

test('PNG export downloads an image', async ({ page }) => {
  await page.route(/fonts\.googleapis\.com\/css2.*&text=/, (route) => route.fulfill({ contentType: 'text/css', body: '' }));
  await openEditor(page);
  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByRole('menuitem', { name: 'PNG image…' }).click();
  await page.getByText('3×').click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download PNG' }).click()]);
  expect(download.suggestedFilename()).toMatch(/\.png$/);
  const bytes = readFileSync((await download.path())!);
  expect(bytes.subarray(1, 4).toString()).toBe('PNG');
});

test('a look preset rewrites the setting lines', async ({ page }) => {
  await openEditor(page);
  await setSource(page, 'a -> b\n');
  await page.getByRole('textbox', { name: 'Look' }).click();
  await page.getByRole('option', { name: 'Chalk talk' }).click();
  await expect(editor(page)).toContainText('paper chalkboard');
  await expect(editor(page)).toContainText('pen chalk');
  await expect(editor(page)).toContainText('hand kalam');
  await expect(editor(page)).toContainText('mess 0.5');
});

test('dragging a node in the free layout writes its position', async ({ page }) => {
  await openEditor(page);
  await setSource(page, 'layout free\na: box "Alpha" at 100,100\nb: box "Beta" below a\n');
  const beta = drawing(page).locator('[data-ink-kind="node"][data-ink-id="b"]');
  await expect(beta).toBeVisible();
  const box = (await beta.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 5, { steps: 6 });
  await page.mouse.up();
  const text = await editor(page).innerText();
  const m = text.match(/b: box "Beta" at (-?[\d.]+),(-?[\d.]+)/);
  expect(m, text).not.toBeNull();
  // Beta started directly below Alpha (x = 100) and moved right, so its new x is a bit over 100.
  expect(Number(m![1])).toBeGreaterThan(105);
  expect(Number(m![1])).toBeLessThan(200);
  expect(Number(m![2])).toBeGreaterThan(130);
  expect(Number(m![2])).toBeLessThan(260);
});
