// Regenerates screenshot.png from the live demo (public/index.html/style.css/script.js) - run
// by CI on every push to main, so the README's screenshot always reflects the current demo's
// default view (QR code + compass ring, before any peers have connected). See screenshot.yml.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DEMO_URL = process.argv[2] || 'http://localhost:8099/';
const OUT_PATH = path.join(__dirname, '..', '..', 'screenshot.png'); // repo root, two levels up from .github/workflows/

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });

  await page.goto(DEMO_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForTimeout(1500); // let the QR image load and the compass ring draw

  // Read the canvas' own pixels via toDataURL() rather than a page/element screenshot, so the
  // result is exactly the canvas' backing bitmap regardless of viewport chrome or DPR rounding.
  const dataURL = await page.$eval('canvas', (canvas) => canvas.toDataURL('image/png'));
  fs.writeFileSync(OUT_PATH, Buffer.from(dataURL.split(',')[1], 'base64'));
  console.log(`Wrote ${OUT_PATH}`);
  await browser.close();
})();
