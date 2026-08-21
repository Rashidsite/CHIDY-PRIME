import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('ChidyPrime Storefront End-to-End Test Suite', () => {
  const screenshotsDir = path.join(process.cwd(), 'playwright-screenshots');
  const consoleErrors: string[] = [];
  const networkErrors: { url: string; status?: number; error?: string }[] = [];

  test.beforeAll(async () => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Capture browser console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const errorText = `[Console Error] ${msg.text()} at ${msg.location().url}:${msg.location().lineNumber}`;
        console.error(errorText);
        consoleErrors.push(errorText);
      }
    });

    // Capture failed network requests
    page.on('requestfailed', (request) => {
      const failure = request.failure();
      const failText = `[Request Failed] ${request.method()} ${request.url()} - ${failure?.errorText || 'Unknown error'}`;
      console.warn(failText);
      networkErrors.push({
        url: request.url(),
        error: failure?.errorText,
      });
    });

    // Capture HTTP error responses (>= 400)
    page.on('response', (response) => {
      if (response.status() >= 400) {
        const warnText = `[HTTP Error] ${response.status()} ${response.statusText()} on ${response.url()}`;
        console.warn(warnText);
        networkErrors.push({
          url: response.url(),
          status: response.status(),
        });
      }
    });
  });

  test('Complete Storefront Flow: Homepage, Categories, Games Mpya, Support, and Checkout Payment Dispatch', async ({ page, baseURL }) => {
    const targetUrl = baseURL || 'https://chidyprimetz.com';
    console.log(`\n🚀 Starting Playwright E2E Flow on: ${targetUrl}`);

    // ── 1. Navigate to Storefront Homepage ──
    console.log('📍 1. Navigating to Storefront homepage...');
    const response = await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });

    expect(response?.status()).toBeLessThan(400);
    await page.waitForTimeout(2500); // Allow dynamic hydration

    // Verify main brand header is visible
    const brandElement = page.locator('header').first();
    await expect(brandElement).toBeVisible({ timeout: 15000 });

    // Capture 01 Homepage Screenshot
    const homepageShot = path.join(screenshotsDir, '01-storefront-homepage.png');
    await page.screenshot({ path: homepageShot, fullPage: true });
    console.log(`📸 Saved screenshot: ${homepageShot}`);

    // ── 2. Test Category Filtering and Selection ──
    console.log('📍 2. Testing Category Filtering...');
    
    // Look for category cards or pills in CategoryGrid / Vault
    const categorySection = page.locator('section, div').filter({ hasText: /Kategoria|Categories|Maleo Bus|Simulators|Vault/i }).first();
    await expect(categorySection).toBeVisible({ timeout: 15000 });

    // Find and click on any category card
    const categoryCards = page.locator('div[class*="group cursor-pointer"], button[class*="category"], div[class*="category-vault"], div[class*="aspect-square"]').first();
    if (await categoryCards.count() > 0) {
      await categoryCards.first().click({ force: true });
      await page.waitForTimeout(1500);
      console.log('✓ Category clicked successfully');
    }

    const categoryShot = path.join(screenshotsDir, '02-category-filtering.png');
    await page.screenshot({ path: categoryShot, fullPage: true });
    console.log(`📸 Saved screenshot: ${categoryShot}`);

    // ── 3. Test "GAMES MPYA" (Explore / New Games) Feed ──
    console.log('📍 3. Navigating & Testing "GAMES MPYA" feed...');
    await page.goto(`${targetUrl}/explore`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);

    // Verify Games Mpya header or live feed container is rendered
    const gamesMpyaHeading = page.locator('h1, h2, div').filter({ hasText: /GAMES MPYA|NEW GAMES FEED/i }).first();
    await expect(gamesMpyaHeading).toBeVisible({ timeout: 15000 });
    console.log('✓ Verified "GAMES MPYA" Feed Header');

    const gamesMpyaShot = path.join(screenshotsDir, '03-games-mpya-feed.png');
    await page.screenshot({ path: gamesMpyaShot, fullPage: true });
    console.log(`📸 Saved screenshot: ${gamesMpyaShot}`);

    // ── 4. Test Support Page Modal / Support HQ ──
    console.log('📍 4. Navigating & Testing Support Page...');
    await page.goto(`${targetUrl}/support`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Check presence of key support components
    const supportHeading = page.locator('h1, h2').filter({ hasText: /Kituo cha Msaada|Support/i }).first();
    await expect(supportHeading).toBeVisible({ timeout: 15000 });

    // Verify WhatsApp direct contact channels
    const whatsappSupportCards = page.locator('a[href*="wa.me"]');
    const waCount = await whatsappSupportCards.count();
    console.log(`✓ Support WhatsApp contact options verified: ${waCount} links found`);
    expect(waCount).toBeGreaterThanOrEqual(1);

    // Verify emergency call / SMS options
    const phoneContacts = page.locator('a[href*="tel:"], a[href*="sms:"]');
    expect(await phoneContacts.count()).toBeGreaterThanOrEqual(1);

    const supportShot = path.join(screenshotsDir, '04-support-page.png');
    await page.screenshot({ path: supportShot, fullPage: true });
    console.log(`📸 Saved screenshot: ${supportShot}`);

    // ── 5. Trigger "NUNUA GAME" Checkout Flow & Verify Payment Payload ──
    console.log('📍 5. Navigating to Storefront to test "NUNUA GAME" Checkout Flow...');
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Find any buy button matching "NUNUA" or "⚡ NUNUA" or "LIPA"
    const buyButton = page.locator('button').filter({ hasText: /NUNUA|LIPA/i }).first();
    await expect(buyButton).toBeVisible({ timeout: 15000 });
    console.log('✓ Found game buy button, clicking to open checkout modal...');
    await buyButton.click({ force: true });

    // Locate the active Checkout Modal specifically
    const checkoutModal = page.locator('div[class*="fixed inset-0"]').filter({ hasText: /Jina Lako Kamili|Namba ya Simu|LIPA|Bei/i }).last();
    await expect(checkoutModal).toBeVisible({ timeout: 10000 });
    console.log('✓ Checkout modal opened successfully');

    const checkoutModalShot = path.join(screenshotsDir, '05-checkout-modal-opened.png');
    await page.screenshot({ path: checkoutModalShot });
    console.log(`📸 Saved screenshot: ${checkoutModalShot}`);

    // Fill in modal-scoped checkout details
    const nameInput = checkoutModal.locator('input[placeholder*="Mfano:"]');
    const phoneInput = checkoutModal.locator('input[placeholder*="07XX"], input[type="tel"]');

    await nameInput.click();
    await nameInput.fill('Playwright Test User');

    await phoneInput.click();
    await phoneInput.fill('0796615257');
    console.log('✓ Filled checkout name: "Playwright Test User" and phone: "0796615257"');

    // Setup request interception for /api/checkout payment dispatch
    const checkoutRequestPromise = page.waitForRequest(
      (request) => request.url().includes('/api/checkout') && request.method() === 'POST',
      { timeout: 20000 }
    );

    // Click submit payment button inside the checkout modal
    const submitPaymentButton = checkoutModal.locator('button[type="submit"]');
    await expect(submitPaymentButton).toBeVisible({ timeout: 5000 });
    console.log('✓ Submitting checkout payment request...');
    await submitPaymentButton.click({ force: true });

    // Verify intercepted request payload
    const checkoutRequest = await checkoutRequestPromise;
    console.log('✓ Payment API request intercepted successfully!');

    const postData = checkoutRequest.postDataJSON();
    console.log('📦 Dispatched Payment Payload:', JSON.stringify(postData, null, 2));

    expect(postData).toBeDefined();
    expect(postData.game_id || postData.productId).toBeTruthy();
    expect(postData.visitor_phone || postData.phone).toBeTruthy();

    const dispatchedPhone = String(postData.visitor_phone || postData.phone);
    expect(dispatchedPhone).toMatch(/255796615257|0796615257|796615257/);
    console.log(`✓ Validated phone normalization in payload: ${dispatchedPhone}`);

    // Verify USSD processing step appears in modal UI
    await page.waitForTimeout(2500);
    const ussdStep = checkoutModal.locator('text=/Weka PIN|USSD Push|Inatuma|PIN Kwenye Simu|Thibitisha/i').first();
    await expect(ussdStep).toBeVisible({ timeout: 15000 });
    console.log('✓ USSD Push / Processing step verified in UI');

    const ussdShot = path.join(screenshotsDir, '06-checkout-ussd-processing.png');
    await page.screenshot({ path: ussdShot });
    console.log(`📸 Saved screenshot: ${ussdShot}`);

    // ── 6. Summary of Execution ──
    console.log('\n================ TEST EXECUTION SUMMARY ================');
    console.log(`✅ All critical storefront flows passed successfully.`);
    console.log(`📊 Total Console Errors logged: ${consoleErrors.length}`);
    console.log(`📊 Total Network / HTTP Warnings logged: ${networkErrors.length}`);
    console.log(`📁 Screenshots stored in: ${screenshotsDir}`);
    console.log('========================================================\n');
  });
});
