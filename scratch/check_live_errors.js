const puppeteer = require('puppeteer');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('BROWSER ERROR:', msg.text());
    else if (msg.type() === 'warning') console.log('BROWSER WARN:', msg.text());
    else console.log('BROWSER LOG:', msg.text());
  });
  page.on('pageerror', err => {
    console.log('PAGE ERROR (Uncaught Exception):', err.message);
  });

  console.log('Navigating to https://chidyprime.com ...');
  try {
    await page.goto('https://chidyprime.com', { waitUntil: 'networkidle2' });
    console.log('Page loaded successfully.');
    
    // Check if the signup form exists and if it has onsubmit="return false;"
    const formHtml = await page.$eval('#signupForm', el => el.outerHTML).catch(e => 'Form not found');
    console.log('Form HTML:', formHtml.substring(0, 100));
    
  } catch (err) {
    console.log('Navigation failed:', err.message);
  }
  
  await browser.close();
})();
