const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
        
        await page.goto('https://chidyprime.com', { waitUntil: 'networkidle0' });
        
        // Wait for the button
        await page.waitForSelector('#signupBtn');
        
        console.log('Evaluating handleSignupClick...');
        const hasFn = await page.evaluate(() => typeof window.handleSignupClick === 'function');
        console.log('window.handleSignupClick exists:', hasFn);
        
        await browser.close();
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
})();
