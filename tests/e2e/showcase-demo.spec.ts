import { test, expect } from '@playwright/test';

test.describe('Blush Studio — Showcase Customer & Management Journey', () => {
  let createdReference: string = '';

  test('Customer Journey: Browse Services -> Book -> Use Demo Customer -> Confirmation', async ({ page }) => {
    // 1. Visit homepage
    await page.goto('/');
    await expect(page).toHaveTitle(/Blush Studio/);

    // Verify demo banner is visible
    const banner = page.locator('aside[aria-label="Demo notice"]');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Interactive Demo');

    // 2. Navigate to Services page
    await page.goto('/services');
    await expect(page).toHaveURL(/\/services/);
    await expect(page.locator('h1')).toContainText('Services & Treatments');

    // 3. Click Reserve on first available service
    const firstReserveBtn = page.locator('a[href^="/book?serviceId="]').first();
    await expect(firstReserveBtn).toBeVisible();
    await firstReserveBtn.click();

    // 4. Wizard Step 2: Pre-selected service automatically advances wizard to Step 2
    await expect(page).toHaveURL(/\/book\?serviceId=/);
    await expect(page.locator('h1')).toContainText('Select Your Stylist', { timeout: 10000 });

    // 5. Select First Available Stylist
    const firstAvailableCard = page.locator('text=First Available Stylist').first();
    await firstAvailableCard.click();

    const continueToDateTimeBtn = page.locator('button:has-text("Choose Date & Time")');
    await expect(continueToDateTimeBtn).toBeEnabled();
    await continueToDateTimeBtn.click();

    // 6. Wizard Step 3: Select Date & Available Slot
    await expect(page.locator('h1')).toContainText('Select Date & Time');

    // Pick future date button
    const dateBtn = page.locator('div.flex.gap-2.overflow-x-auto button').nth(3);
    await dateBtn.click();

    // Wait for slot grid to populate
    const slotBtn = page.locator('button:has-text(":")').first();
    await expect(slotBtn).toBeVisible({ timeout: 10000 });
    await slotBtn.click();

    const enterGuestDetailsBtn = page.locator('button:has-text("Enter Guest Details")');
    await expect(enterGuestDetailsBtn).toBeEnabled();
    await enterGuestDetailsBtn.click();

    // 7. Wizard Step 4: Use Demo Customer Autofill
    await expect(page.locator('h1')).toContainText('Guest Information');
    const useDemoCustomerBtn = page.locator('button:has-text("Use Demo Customer")');
    await expect(useDemoCustomerBtn).toBeVisible();
    await useDemoCustomerBtn.click();

    // Verify fields populated
    const firstNameInput = page.locator('input[placeholder="e.g. Maria Clara"]');
    await expect(firstNameInput).not.toHaveValue('');

    const reviewBookingBtn = page.locator('button:has-text("Review Booking")');
    await expect(reviewBookingBtn).toBeEnabled();
    await reviewBookingBtn.click();

    // 8. Wizard Step 5: Review & Confirm
    await expect(page.locator('h1')).toContainText('Review & Reserve');
    const confirmBtn = page.locator('button:has-text("Confirm Reservation")');
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // 9. Wizard Step 6: Confirmation screen
    await expect(page.locator('h1')).toContainText('We look forward to welcoming you', { timeout: 15000 });
    const refElement = page.locator('span.font-mono').first();
    await expect(refElement).toBeVisible();
    createdReference = (await refElement.textContent())?.trim() || '';
    expect(createdReference).toMatch(/^BLS-\d{8}-[A-Z0-9]{4}$/);

    // Verify Veltwo attribution link is present
    const footerLink = page.locator('a[href="https://www.facebook.com/veltwo/"]').first();
    await expect(footerLink).toBeVisible();
  });

  test('Manager Journey: One-Click Demo Mode -> Explore Appointments', async ({ page }) => {
    // 1. Visit admin login
    await page.goto('/admin/login');
    await expect(page.locator('h1')).toContainText('Studio Administration');

    // Verify privileged password autofill is REMOVED
    const autofillBtn = page.locator('button:has-text("Fill Admin Email & Key")');
    await expect(autofillBtn).not.toBeVisible();

    // 2. Click Explore Demo as Manager
    const exploreDemoBtn = page.locator('button:has-text("Explore Demo as Manager")');
    await expect(exploreDemoBtn).toBeVisible();
    await exploreDemoBtn.click();

    // 3. Lands in dashboard
    await expect(page).toHaveURL('/admin', { timeout: 10000 });
    await expect(page.locator('text=Veltwo Showcase Mode')).toBeVisible();

    // 4. Navigate to Appointments
    await page.goto('/admin/appointments');
    await expect(page.locator('h1')).toContainText('Appointment Management');

    // Appointments table is populated
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });

  test('Multi-Visitor Isolation: Context B cannot see Context A private booking', async ({ browser }) => {
    // Context A (Visitor A)
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await pageA.goto('/admin/login');
    await pageA.click('button:has-text("Explore Demo as Manager")');
    await expect(pageA).toHaveURL('/admin');

    // Context B (Visitor B, fresh session)
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await pageB.goto('/admin/login');
    await pageB.click('button:has-text("Explore Demo as Manager")');
    await expect(pageB).toHaveURL('/admin');

    // Both contexts have isolated visitor IDs
    const cookiesA = await contextA.cookies();
    const cookiesB = await contextB.cookies();

    const visitorA = cookiesA.find((c) => c.name === 'blush_visitor_id')?.value;
    const visitorB = cookiesB.find((c) => c.name === 'blush_visitor_id')?.value;

    expect(visitorA).toBeDefined();
    expect(visitorB).toBeDefined();
    expect(visitorA).not.toEqual(visitorB);

    await contextA.close();
    await contextB.close();
  });
});
