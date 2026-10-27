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

async function captureAudioEvents() {
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
      '--autoplay-policy=no-user-gesture-required',
    ],
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

  console.log('Navigating to http://localhost:3000/...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1200));

  // 1. Switch to SOLAR SYSTEM
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

  await new Promise(r => setTimeout(r, 1500));

  // 2. Click SYNTH DEMO to activate real-time audio FFT beat pulses
  console.log('Activating SYNTH DEMO...');
  const allButtons = await page.$$('button');
  for (const btn of allButtons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('SYNTH DEMO')) {
      await btn.click();
      console.log('Clicked SYNTH DEMO button');
      break;
    }
  }

  // Allow synth audio & beat detection to spin up
  await new Promise(r => setTimeout(r, 2000));

  // 3. Capture 3D CME Blast Bubble in Overview mode
  console.log('Capturing event_01_cme_overview.png...');
  await page.screenshot({ path: path.join(outputDir, 'event_01_cme_overview.png') });

  // 4. Focus on Earth to capture Geomagnetic Aurora Oval & Megalopolis lights
  console.log('Focusing on Earth for Aurora Borealis/Australis...');
  await page.evaluate(() => {
    if (window.usePlayerStore) {
      window.usePlayerStore.getState().setSelectedPlanet('Earth');
    }
  });
  await new Promise(r => setTimeout(r, 2600));
  console.log('Capturing event_02_earth_aurora.png...');
  await page.screenshot({ path: path.join(outputDir, 'event_02_earth_aurora.png') });

  // 5. Focus on Jupiter to capture Jovian Polar Aurora & Io Footprint Spot
  console.log('Focusing on Jupiter for Jovian Polar Aurora...');
  await page.evaluate(() => {
    if (window.usePlayerStore) {
      window.usePlayerStore.getState().setSelectedPlanet('Jupiter');
    }
  });
  await new Promise(r => setTimeout(r, 2600));
  console.log('Capturing event_03_jupiter_aurora.png...');
  await page.screenshot({ path: path.join(outputDir, 'event_03_jupiter_aurora.png') });

  // 6. Focus on Saturn to capture Enceladus Cryovolcanic Geysers & Titan
  console.log('Focusing on Saturn for Enceladus Cryovolcanic Geysers...');
  await page.evaluate(() => {
    if (window.usePlayerStore) {
      window.usePlayerStore.getState().setSelectedPlanet('Saturn');
    }
  });
  await new Promise(r => setTimeout(r, 2600));
  console.log('Capturing event_04_saturn_enceladus.png...');
  await page.screenshot({ path: path.join(outputDir, 'event_04_saturn_enceladus.png') });

  console.log('Finished capturing cosmic audio event snapshots.');
  await browser.close();
}

captureAudioEvents().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
