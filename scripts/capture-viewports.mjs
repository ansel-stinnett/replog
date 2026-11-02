// Captures the cross-viewport testing evidence for Milestone 2.
//
// Drives a real browser through the app at phone, tablet and desktop widths
// and writes a screenshot of each page at each size. Run with both dev
// servers up:
//
//   npm run dev --prefix server     # terminal 1
//   npm run dev --prefix client     # terminal 2
//   node scripts/capture-viewports.mjs
//
// Output lands in docs/milestone-2/evidence/viewports/.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const OUT = 'docs/milestone-2/evidence/viewports';
const EMAIL = process.env.DEMO_EMAIL || 'demo@replog.test';
const PASSWORD = process.env.DEMO_PASSWORD || 'demo1234';

const VIEWPORTS = [
  { name: 'phone', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

const PAGES = [
  { name: 'history', path: '/' },
  { name: 'history-filtered', path: '/?', action: 'filter' },
  { name: 'progress', path: '/progress' },
  { name: 'log-workout', path: '/workouts/new' },
];

await mkdir(OUT, { recursive: true });
// CHROME_PATH lets this run against a system Chrome instead of Playwright's
// bundled build, which is handy in CI images that already ship one.
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
});

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`, { timeout: 10_000 });
  await page.waitForLoadState('networkidle');

  for (const spec of PAGES) {
    await page.goto(`${BASE}${spec.path}`, { waitUntil: 'networkidle' });

    if (spec.action === 'filter') {
      await page.fill('input[type="search"]', 'bench');
      await page.waitForTimeout(600); // debounce plus request
    }
    await page.waitForTimeout(400); // let the chart settle

    const file = `${OUT}/${vp.name}-${spec.name}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(`captured ${file}  (${vp.width}x${vp.height})`);
  }

  // Horizontal overflow is the failure this evidence is really checking for.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  console.log(`  ${vp.name}: horizontal overflow = ${overflow ? 'YES (problem)' : 'no'}`);

  await context.close();
}

await browser.close();
console.log('\nDone.');
