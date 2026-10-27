import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputDir = path.join(__dirname, '..', 'snapshots');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function capture() {
  console.log('Launching Puppeteer browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-gl=angle',
      '--use-angle=default',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
    ],
  });

  const page = await browser.newPage();

  // Listen to browser console
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err.toString()));

  console.log('Navigating to http://localhost:3000/...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait 1 second for initial canvas mounting
  await new Promise(r => setTimeout(r, 1000));

  // Click SOLAR SYSTEM tab in HUD
  console.log('Switching to SOLAR SYSTEM mode...');
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('SOLAR SYSTEM')) {
      await btn.click();
      console.log('Clicked SOLAR SYSTEM button');
      break;
    }
  }

  // Wait 2 seconds for Solar System to settle
  await new Promise(r => setTimeout(r, 2000));

  console.log('Capturing 00_overview.png...');
  await page.screenshot({ path: path.join(outputDir, '00_overview.png') });

  // List of planet buttons to click
  const targets = [
    { name: 'Sol', file: '01_sol.png' },
    { name: 'Mercury', file: '02_mercury.png' },
    { name: 'Venus', file: '03_venus.png' },
    { name: 'Earth', file: '04_earth.png' },
    { name: 'Mars', file: '05_mars.png' },
    { name: 'Jupiter', file: '06_jupiter.png' },
    { name: 'Saturn', file: '07_saturn.png' },
    { name: 'Uranus', file: '08_uranus.png' },
    { name: 'Neptune', file: '09_neptune.png' },
    { name: 'Ceres', file: '10_ceres.png' },
    { name: 'Pluto', file: '11_pluto.png' },
  ];

  for (const target of targets) {
    console.log(`Focusing on ${target.name}...`);
    await page.evaluate((pName) => {
      if (window.usePlayerStore) {
        window.usePlayerStore.getState().setSelectedPlanet(pName);
      }
    }, target.name);

    // Wait 2.2 seconds for camera lerp and high-res render
    await new Promise(r => setTimeout(r, 2200));

    const shotPath = path.join(outputDir, target.file);
    await page.screenshot({ path: shotPath });
    console.log(`Captured ${target.file}`);
  }

  console.log('Finished capturing all planet snapshots.');
  await browser.close();
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
