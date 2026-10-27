import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.join(__dirname, '..', 'snapshots');

async function testCMEProgress() {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--use-gl=angle', '--enable-webgl', '--autoplay-policy=no-user-gesture-required'],
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  // Switch to SOLAR SYSTEM
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('SOLAR SYSTEM')) {
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1000));

  // Click SYNTH DEMO
  const allB = await page.$$('button');
  for (const b of allB) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('SYNTH DEMO')) {
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 500));

  // Monitor over 4 seconds, take 6 screenshots
  for (let i = 0; i < 8; i++) {
    await new Promise(r => setTimeout(r, 400));
    const info = await page.evaluate(() => {
      // Find audio energy if any
      const audio = window.usePlayerStore ? window.usePlayerStore.getState() : null;
      return { time: Date.now() };
    });
    console.log(`Frame ${i}: capturing...`);
    await page.screenshot({ path: path.join(outputDir, `cme_frame_${i}.png`) });
  }

  await browser.close();
}

testCMEProgress().catch(console.error);
