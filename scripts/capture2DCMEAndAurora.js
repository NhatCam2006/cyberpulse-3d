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

async function captureVerification() {
  console.log('Launching Puppeteer for 2D CME & Transient Aurora verification...');
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

  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));

  // 1. Switch to SOLAR SYSTEM
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('SOLAR SYSTEM')) {
      await btn.click();
      console.log('Clicked SOLAR SYSTEM button');
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1200));

  // 2. Click SYNTH DEMO to activate beats
  const allButtons = await page.$$('button');
  for (const btn of allButtons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('SYNTH DEMO')) {
      await btn.click();
      console.log('Clicked SYNTH DEMO button');
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1200));

  // Enable Spectral Mode & Overview
  await page.evaluate(() => {
    if (window.usePlayerStore) {
      window.usePlayerStore.getState().setAuroraSpectralMode(true);
      window.usePlayerStore.getState().setSelectedPlanet(null);
    }
  });

  // Capture Overview during 2D circular wave expansion
  console.log('Waiting for CME circular wave expansion...');
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outputDir, 'cme_2d_planar_blast.png') });
  console.log('Captured cme_2d_planar_blast.png');

  // Focus Earth during active storm
  console.log('Focusing on Earth...');
  await page.evaluate(() => {
    if (window.usePlayerStore) {
      window.usePlayerStore.getState().setSelectedPlanet('Earth');
    }
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(outputDir, 'aurora_storm_active.png') });
  console.log('Captured aurora_storm_active.png');

  // Wait for storm to expire
  console.log('Waiting for storm to expire (5.0s)...');
  await new Promise(r => setTimeout(r, 5000));
  await page.screenshot({ path: path.join(outputDir, 'aurora_storm_ended.png') });
  console.log('Captured aurora_storm_ended.png');

  // Focus Jupiter to show its aurora too
  console.log('Focusing on Jupiter...');
  await page.evaluate(() => {
    if (window.usePlayerStore) {
      window.usePlayerStore.getState().setSelectedPlanet('Jupiter');
    }
  });
  await new Promise(r => setTimeout(r, 1800));
  await page.screenshot({ path: path.join(outputDir, 'jupiter_aurora_view.png') });
  console.log('Captured jupiter_aurora_view.png');

  await browser.close();
  console.log('Verification completed!');
}

captureVerification().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
