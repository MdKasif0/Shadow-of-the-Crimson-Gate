const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', error => errors.push(error.message));
  
  await page.goto('http://localhost:3000/#/game', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  console.log('ERRORS:', JSON.stringify(errors, null, 2));
  await browser.close();
})();
