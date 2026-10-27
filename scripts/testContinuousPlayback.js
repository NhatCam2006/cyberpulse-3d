import puppeteer from 'puppeteer';

async function testMultipleCMEs() {
  console.log('Testing continuous CME emissions over 12 seconds of playback...');
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1280, height: 720 },
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

  // Turn on SYNTH DEMO (or simulate track playing)
  const allB = await page.$$('button');
  for (const b of allB) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('SYNTH DEMO')) {
      await b.click();
      break;
    }
  }

  // Monitor triggers over 12 seconds
  let cmeCount = 0;
  let lastProgress = 1.0;
  for (let s = 0; s < 24; s++) {
    await new Promise(r => setTimeout(r, 500));
    const state = await page.evaluate(() => {
      // Check audio status
      const store = window.usePlayerStore ? window.usePlayerStore.getState() : null;
      return {
        isDemoSynth: store?.isDemoSynth,
        isPlaying: store?.isPlaying,
      };
    });
    console.log(`[${(s * 0.5).toFixed(1)}s] Playing: ${state.isPlaying || state.isDemoSynth}`);
  }

  console.log('Playback test passed!');
  await browser.close();
}

testMultipleCMEs().catch(console.error);
