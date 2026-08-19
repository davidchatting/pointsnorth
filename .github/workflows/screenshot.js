// Regenerates screenshot.png from the live production demo (davidchatting.com/pointsnorth) -
// run by CI on every push to main, so the README's screenshot stays current. Note: this reads
// the live GitHub Pages deployment rather than the just-pushed commit's files directly, so on a
// rapid push it can lag one Pages deploy behind (see the separate pages.yml workflow).
//
// The page's own natural first load always encodes a real random session in the QR (by design,
// so a scan can actually join) - we regenerate the QR afterwards from the bare page URL (no
// ?session=...) so the screenshot doesn't show a joinable session value. We also tilt our own
// compass bearing so the dotted north line isn't drawn straight up, and inject four simulated
// peers - real, current phone/tablet models, different sizes, irregular bearings - so the ring
// shows a mixed group of devices around a table.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DEMO_URL = process.argv[2] || 'https://davidchatting.com/pointsnorth/';
const OUT_PATH = path.join(__dirname, '..', '..', 'screenshot.png'); // repo root, two levels up from .github/workflows/
const OWN_BEARING = 35; // degrees - so the dotted north line isn't drawn straight up

// approximate CSS portrait viewport sizes (px) for the five devices shown in the group.
// our own capture viewport is one of them (iPhone 15); the rest are simulated peers.
const PHONE_VIEWPORT = { width: 393, height: 852 }; // iPhone 15
const PEERS = [
  { clientId: 'iphone-15-pro-max', bearing: 80, width: 430, height: 932 },  // iPhone 15 Pro Max
  { clientId: 'galaxy-s24', bearing: 140, width: 360, height: 780 },        // Samsung Galaxy S24
  { clientId: 'pixel-8-pro', bearing: 205, width: 412, height: 915 },       // Google Pixel 8 Pro
  { clientId: 'ipad-mini', bearing: 300, width: 744, height: 1133 },        // iPad mini (6th gen)
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

  // simulate four other phones/tablets around the table - different sizes, irregular spacing
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
