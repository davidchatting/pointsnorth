// Regenerates screenshot.png from the live production demo (davidchatting.com/pointsnorth) -
// run by CI on every push to main, so the README's screenshot stays current. Note: this reads
// the live GitHub Pages deployment rather than the just-pushed commit's files directly, so on a
// rapid push it can lag one Pages deploy behind (see the separate pages.yml workflow).
//
// The page's own natural first load always encodes a real random session in the QR (by design,
// so a scan can actually join) - we regenerate the QR afterwards from the bare page URL (no
// ?session=...) so the screenshot doesn't show a joinable session value. We also tilt our own
// compass bearing so the dotted north line isn't drawn straight up, and inject two simulated
// peers - different sizes, irregular bearings - so the ring shows phones around a table.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DEMO_URL = process.argv[2] || 'https://davidchatting.com/pointsnorth/';
const OUT_PATH = path.join(__dirname, '..', '..', 'screenshot.png'); // repo root, two levels up from .github/workflows/
const PHONE_VIEWPORT = { width: 390, height: 844 }; // iPhone-ish portrait ratio
const OWN_BEARING = 35; // degrees - so the dotted north line isn't drawn straight up
const PEERS = [
  { clientId: 'demo-peer-1', bearing: 95, width: 360, height: 780 },
  { clientId: 'demo-peer-2', bearing: 260, width: 430, height: 932 },
];

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: PHONE_VIEWPORT });

  await page.goto(DEMO_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForTimeout(1500); // let the page's own QR image load and the ring draw

  // regenerate the QR from the bare page URL (no session), and tilt our own bearing
  await page.evaluate((ownBearing) => {
    const cleanUrl = location.origin + location.pathname;
    const prevImg = qrP5Image;
    qrModuleCount = setupQRCode(cleanUrl, 256, 4);

    currentBearing = ownBearing;
    updateDevice({ clientId, bearing: currentBearing });

    return new Promise((resolve) => {
      const poll = () => {
        if (qrP5Image && qrP5Image !== prevImg) resolve();
        else setTimeout(poll, 50);
      };
      poll();
    });
  }, OWN_BEARING);

  // simulate two other phones around the table - different sizes, irregular spacing
  await page.evaluate((peers) => {
    for (const peer of peers) upsertDevice(peer);
  }, PEERS);
  await page.waitForTimeout(200); // let the next draw() frame pick everything up

  // Read the canvas' own pixels via toDataURL() rather than a page/element screenshot, so the
  // result is exactly the canvas' backing bitmap regardless of viewport chrome or DPR rounding.
  const dataURL = await page.$eval('canvas', (canvas) => canvas.toDataURL('image/png'));
  fs.writeFileSync(OUT_PATH, Buffer.from(dataURL.split(',')[1], 'base64'));
  console.log(`Wrote ${OUT_PATH}`);
  await browser.close();
})();
