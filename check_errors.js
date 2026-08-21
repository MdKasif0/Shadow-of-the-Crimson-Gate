import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('ERROR:', msg.text());
  });
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
  });
  await page.goto('http://localhost:3000/#/game');
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
