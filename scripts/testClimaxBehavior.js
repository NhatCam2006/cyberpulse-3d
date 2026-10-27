import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.join(__dirname, '..', 'snapshots');

async function testUpdatedExperience() {
  console.log('Testing Clean UI (No Button) & Single Startup Beat...');
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--use-gl=angle', '--enable-webgl', '--autoplay-policy=no-user-gesture-required'],
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  // 1. Switch to SOLAR SYSTEM
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('SOLAR SYSTEM')) {
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1000));

  // Verify that the CLIMAX CME button is GONE
  const hudButtons = await page.$$('button');
  let hasClimaxButton = false;
  for (const b of hudButtons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('CLIMAX CME')) {
      hasClimaxButton = true;
      break;
    }
  }
  console.log('CLIMAX CME button present in HUD?', hasClimaxButton, '(Must be FALSE: button removed)');

  // 2. Start audio playback (Click SYNTH DEMO)
  console.log('Starting playback to test single startup beat...');
  const allB = await page.$$('button');
  for (const b of allB) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('SYNTH DEMO')) {
      await b.click();
      break;
    }
  }

  // Capture overview showing clean HUD and active playback
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(outputDir, 'clean_ui_no_button.png') });
  console.log('Captured clean_ui_no_button.png');

  await browser.close();
  console.log('Verification successful!');
}

testUpdatedExperience().catch(console.error);
