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

async function captureAuroraComparison() {
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
  await new Promise(r => setTimeout(r, 2000));

  // 3. Focus on Earth - Spectral Mode (557.7nm Atomic Oxygen Emerald + 630nm Crimson)
  console.log('Focusing on Earth (Spectral Mode)...');
  await page.evaluate(() => {
    if (window.usePlayerStore) {
      window.usePlayerStore.getState().setSelectedPlanet('Earth');
      window.usePlayerStore.getState().setAuroraSpectralMode(true);
    }
  });
  await new Promise(r => setTimeout(r, 2600));
  console.log('Capturing aurora_01_earth_spectral.png...');
  await page.screenshot({ path: path.join(outputDir, 'aurora_01_earth_spectral.png') });

  // 4. Earth - Monochrome Mode (Ryoji Ikeda / Nothing OS pure white fibrils)
  console.log('Switching Earth to Monochrome Mode...');
  await page.evaluate(() => {
    if (window.usePlayerStore) {
      window.usePlayerStore.getState().setAuroraSpectralMode(false);
    }
  });
  await new Promise(r => setTimeout(r, 1800));
  console.log('Capturing aurora_02_earth_monochrome.png...');
  await page.screenshot({ path: path.join(outputDir, 'aurora_02_earth_monochrome.png') });

  // 5. Focus on Jupiter - Spectral Mode (Far-UV / Cyan + Io footprint)
  console.log('Focusing on Jupiter (Spectral Mode)...');
  await page.evaluate(() => {
    if (window.usePlayerStore) {
      window.usePlayerStore.getState().setSelectedPlanet('Jupiter');
      window.usePlayerStore.getState().setAuroraSpectralMode(true);
    }
  });
  await new Promise(r => setTimeout(r, 2600));
  console.log('Capturing aurora_03_jupiter_spectral.png...');
  await page.screenshot({ path: path.join(outputDir, 'aurora_03_jupiter_spectral.png') });

  // 6. Jupiter - Monochrome Mode
  console.log('Switching Jupiter to Monochrome Mode...');
  await page.evaluate(() => {
    if (window.usePlayerStore) {
      window.usePlayerStore.getState().setAuroraSpectralMode(false);
    }
  });
  await new Promise(r => setTimeout(r, 1800));
  console.log('Capturing aurora_04_jupiter_monochrome.png...');
  await page.screenshot({ path: path.join(outputDir, 'aurora_04_jupiter_monochrome.png') });

  console.log('All aurora snapshots successfully captured in snapshots/ directory!');
  await browser.close();
}

captureAuroraComparison().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
