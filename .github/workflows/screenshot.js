// Regenerates screenshot.png from the live demo (public/index.html/style.css/script.js) - run
// by CI on every push to main, so the README's screenshot always reflects the current demo.
// Loads with a fixed "?session=demo" query string so the QR code encodes a stable placeholder
// rather than a real random session id, and injects two simulated peers via upsertDevice() so
// the ring shows three phones sitting around a table. Viewport is phone-shaped. See
// screenshot.yml.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.argv[2] || 'http://localhost:8099/';
const DEMO_URL = `${BASE_URL}${BASE_URL.includes('?') ? '&' : '?'}session=demo`;
const OUT_PATH = path.join(__dirname, '..', '..', 'screenshot.png'); // repo root, two levels up from .github/workflows/
const PHONE_VIEWPORT = { width: 390, height: 844 }; // iPhone-ish portrait ratio

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: PHONE_VIEWPORT });

  await page.goto(DEMO_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForTimeout(1500); // let the QR image load and the compass ring draw

  // Simulate two other phones sitting around the table, evenly spaced with our own device.
  await page.evaluate((viewport) => {
    upsertDevice({ clientId: 'demo-peer-1', bearing: 120, width: viewport.width, height: viewport.height });
    upsertDevice({ clientId: 'demo-peer-2', bearing: 240, width: viewport.width, height: viewport.height });
  }, PHONE_VIEWPORT);
  await page.waitForTimeout(200); // let the next draw() frame pick up the simulated peers

  // Read the canvas' own pixels via toDataURL() rather than a page/element screenshot, so the
  // result is exactly the canvas' backing bitmap regardless of viewport chrome or DPR rounding.
  const dataURL = await page.$eval('canvas', (canvas) => canvas.toDataURL('image/png'));
  fs.writeFileSync(OUT_PATH, Buffer.from(dataURL.split(',')[1], 'base64'));
  console.log(`Wrote ${OUT_PATH}`);
  await browser.close();
})();
