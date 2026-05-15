const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    try {
        console.log('Launching browser...');
        const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 375, height: 812 } }); // Mobile viewport
        const page = await browser.newPage();
        
        console.log('Navigating to chidyprime.com...');
        await page.goto('https://chidyprime.com', { waitUntil: 'networkidle0' });
        
        console.log('Taking screenshot of signup form...');
        await page.screenshot({ path: 'scratch/screenshot_1_signup.png' });
        
        console.log('Filling form...');
        await page.type('#signupName', 'Test User');
        await page.type('#signupPhone', '0712345678');
        
        console.log('Clicking JOIN NOW...');
        await page.click('#signupBtn');
        
        console.log('Waiting for welcome screen...');
        await page.waitForSelector('#welcomeOverlay.show', { timeout: 5000 }).catch(() => console.log('Welcome overlay didnt show'));
        await page.screenshot({ path: 'scratch/screenshot_2_welcome.png' });
        
        console.log('Waiting for games to load and welcome screen to hide...');
        // Wait 6 seconds for welcome to disappear
        await new Promise(r => setTimeout(r, 6000));
        
        await page.screenshot({ path: 'scratch/screenshot_3_storefront.png' });
        
        console.log('Clicking on first game card...');
        await page.waitForSelector('.game-card', { timeout: 10000 });
        await page.evaluate(() => {
            document.querySelector('.game-card').click();
        });
        
        console.log('Waiting for detail overlay to show...');
        await page.waitForSelector('#detailOverlay.show', { timeout: 5000 });
        await new Promise(r => setTimeout(r, 2000)); // wait for detail access to load
        await page.screenshot({ path: 'scratch/screenshot_4_gamedetail.png' });
        
        console.log('Clicking "NUNUA SASA"...');
        // The button has ID startPaymentBtn or similar. Let's find it.
        const payBtnFound = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const payBtn = btns.find(b => b.innerText.includes('LIPA') || b.innerText.includes('NUNUA') || b.innerText.includes('MAOMBI YA KULIPA'));
            if (payBtn) {
                payBtn.click();
                return true;
            }
            return false;
        });
        
        if (payBtnFound) {
            console.log('Waiting for payment overlay...');
            await page.waitForSelector('#paymentOverlay.show', { timeout: 5000 }).catch(e => console.log('payment overlay didnt show'));
            await new Promise(r => setTimeout(r, 1000));
            await page.screenshot({ path: 'scratch/screenshot_5_payment.png' });
        } else {
            console.log('Could not find payment button.');
        }
        
        await browser.close();
        console.log('DONE!');
    } catch (e) {
        console.error('ERROR:', e);
        process.exit(1);
    }
})();
