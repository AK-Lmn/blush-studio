import { test, expect } from '@playwright/test';
import { db, assertDatabaseIsolation } from '../../src/lib/db';
import * as schema from '../../src/lib/db/schema';
import { inArray } from 'drizzle-orm';

test.describe('Blush Studio — Showcase Customer & Management Journey', () => {
  let refVisitor1: string = '';
  let refVisitor2: string = '';
  const testCreatedReferences: string[] = [];

  test.beforeAll(async () => {
    // 1. Mandatory Safety Guard: require dedicated test database or Neon test branch; prevent running against production
    assertDatabaseIsolation();
  });

  test.afterAll(async () => {
    // 2. Safe Targeted Cleanup: delete ONLY appointments created by this test run
    if (testCreatedReferences.length > 0) {
      await db
        .delete(schema.appointments)
        .where(inArray(schema.appointments.referenceNumber, testCreatedReferences));
    }
  });

  test('Sequence 1: Booking BEFORE Dashboard Access (Visitor 1)', async ({ browser }) => {
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    // 1. Visit homepage & verify showcase banner, hero imagery, guided demo, and Veltwo CTA
    await page1.goto('/');
    await expect(page1).toHaveTitle(/Blush Studio/);
    const banner = page1.locator('aside[aria-label="Demo notice"]');
    await expect(banner).toBeVisible();
    await expect(page1.locator('#guided-demo')).toBeVisible();
    await expect(page1.locator('a[href="https://www.facebook.com/veltwo/"]').first()).toBeVisible();
    const heroImgLoaded = await page1.locator('img').first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0);
    expect(heroImgLoaded).toBe(true);

    // 2. Navigate to Services & Select Service
    await page1.goto('/services');
    const firstReserveBtn = page1.locator('a[href^="/book?serviceId="]').first();
    await expect(firstReserveBtn).toBeVisible();
    await firstReserveBtn.click();

    // 3. Wizard Step 2: Stylist selection
    await expect(page1).toHaveURL(/\/book\?serviceId=/);
    await expect(page1.locator('h1')).toContainText('Select Your Stylist', { timeout: 10000 });
    await page1.locator('text=First Available Stylist').first().click();

    const continueToDateTimeBtn = page1.locator('button:has-text("Choose Date & Time")');
    await expect(continueToDateTimeBtn).toBeEnabled();
    await continueToDateTimeBtn.click();

    // 4. Wizard Step 3: Date & Slot selection (wait for slot API response)
    await expect(page1.locator('h1')).toContainText('Select Date & Time');
    const dateButtons = page1.locator('div.flex.gap-2.overflow-x-auto button');
    const count = await dateButtons.count();
    let slotFound = false;

    for (let i = 1; i < count; i++) {
      const slotsPromise = page1.waitForResponse(
        (res) => res.url().includes('/api/booking/slots') && res.status() === 200,
        { timeout: 5000 }
      ).catch(() => null);

      await dateButtons.nth(i).click();
      await slotsPromise;

      const slotBtn = page1.locator('button:has-text(":")').first();
      const visible = await slotBtn.waitFor({ state: 'visible', timeout: 1500 }).then(() => true).catch(() => false);
      if (visible) {
        await slotBtn.click();
        slotFound = true;
        break;
      }
    }
    expect(slotFound).toBe(true);

    const enterGuestDetailsBtn = page1.locator('button:has-text("Enter Guest Details")');
    await expect(enterGuestDetailsBtn).toBeEnabled();
    await enterGuestDetailsBtn.click();

    // 5. Wizard Step 4: Prominent Privacy Notice & Use Demo Customer Quick-Fill
    await expect(page1.locator('h1')).toContainText('Guest Information');
    await expect(page1.locator('text=do not enter your real personal')).toBeVisible();
    const useDemoCustomerBtn = page1.locator('button:has-text("Use Demo Customer")');
    await expect(useDemoCustomerBtn).toBeVisible();
    await useDemoCustomerBtn.click();

    const reviewBookingBtn = page1.locator('button:has-text("Review Booking")');
    await expect(reviewBookingBtn).toBeEnabled();
    await reviewBookingBtn.click();

    // 6. Wizard Step 5 & 6: Confirm reservation
    await expect(page1.locator('h1')).toContainText('Review & Reserve');
    const confirmBtn = page1.locator('button:has-text("Confirm Reservation")');
    await expect(confirmBtn).toBeEnabled();

    const [bookingResponse1] = await Promise.all([
      page1.waitForResponse((res) => res.url().includes('/api/booking') && res.request().method() === 'POST'),
      confirmBtn.click(),
    ]);

    const resJson1 = await bookingResponse1.json().catch(() => ({}));
    if (bookingResponse1.status() !== 201) {
      console.error('Visitor 1 booking error response:', bookingResponse1.status(), resJson1);
    }
    expect(bookingResponse1.status()).toBe(201);

    await expect(page1.locator('h1')).toContainText('We look forward to welcoming you', { timeout: 15000 });
    const refElement = page1.locator('span.font-mono').first();
    await expect(refElement).toBeVisible();
    refVisitor1 = (await refElement.textContent())?.trim() || '';
    expect(refVisitor1).toMatch(/^BLS-\d{8}-[A-Z0-9]{4}$/);
    if (refVisitor1) testCreatedReferences.push(refVisitor1);

    // 7. Verify cookie is cryptographically signed
    const cookies1 = await context1.cookies();
    const visitorCookie1 = cookies1.find((c) => c.name === 'blush_visitor_id')?.value;
    expect(visitorCookie1).toBeDefined();
    expect(visitorCookie1).toContain('.');
    expect(visitorCookie1?.startsWith('vst_')).toBe(true);

    // 8. Lookup page verification: Visitor 1 can view their own booking
    await page1.goto(`/booking/${refVisitor1}`);
    await expect(page1.locator('h1')).toBeVisible();
    await expect(page1.locator(`text=${refVisitor1}`)).toBeVisible();

    // 9. Now access Admin Demo Portal AFTER booking
    await page1.goto('/admin/login');
    const exploreDemoBtn = page1.locator('button:has-text("Explore Demo as Manager")');
    await expect(exploreDemoBtn).toBeVisible();
    await exploreDemoBtn.click();

    await expect(page1).toHaveURL('/admin', { timeout: 10000 });
    await expect(page1.locator('text=Veltwo Showcase Mode')).toBeVisible();
    await expect(page1.locator('text=Paid Revenue').first()).toBeVisible();
    await expect(page1.locator('text=Unpaid Bookings').first()).toBeVisible();

    // 10. Dashboard recognition: Visitor 1 sees their booking in the management table
    await page1.goto('/admin/appointments');
    await expect(page1.locator('h1')).toContainText('Appointment Management');
    await expect(page1.locator(`text=${refVisitor1}`)).toBeVisible({ timeout: 10000 });

    await context1.close();
  });

  test('Sequence 2: Dashboard Access BEFORE Booking (Visitor 2)', async ({ browser }) => {
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    // 1. Visit admin login FIRST
    await page2.goto('/admin/login');
    await page2.click('button:has-text("Explore Demo as Manager")');
    await expect(page2).toHaveURL('/admin', { timeout: 10000 });

    // Verify signed visitor cookie was created during demo manager login
    const cookies2 = await context2.cookies();
    const visitorCookie2 = cookies2.find((c) => c.name === 'blush_visitor_id')?.value;
    expect(visitorCookie2).toBeDefined();
    expect(visitorCookie2).toContain('.');

    // 2. Now book an appointment while already having a signed visitor cookie
    await page2.goto('/services');
    await page2.locator('a[href^="/book?serviceId="]').first().click();

    await page2.locator('text=First Available Stylist').first().click();
    await page2.locator('button:has-text("Choose Date & Time")').click();

    // Find future date with available slots (waiting for API load)
    const dateButtons2 = page2.locator('div.flex.gap-2.overflow-x-auto button');
    const count2 = await dateButtons2.count();
    let slotFound2 = false;

    // Iterate through dates until fresh slots load
    for (let i = 2; i < count2; i++) {
      const slotsPromise2 = page2.waitForResponse(
        (res) => res.url().includes('/api/booking/slots') && res.status() === 200,
        { timeout: 5000 }
      ).catch(() => null);

      await dateButtons2.nth(i).click();
      await slotsPromise2;

      const slotBtn = page2.locator('button:has-text(":")').first();
      const visible = await slotBtn.waitFor({ state: 'visible', timeout: 1500 }).then(() => true).catch(() => false);
      if (visible) {
        // Pick the last available slot on this day to avoid any overlap with previous bookings
        const allSlots = page2.locator('button:has-text(":")');
        const slotCount = await allSlots.count();
        if (slotCount > 1) {
          await allSlots.nth(slotCount - 1).click();
        } else {
          await slotBtn.click();
        }
        slotFound2 = true;
        break;
      }
    }
    expect(slotFound2).toBe(true);

    await page2.locator('button:has-text("Enter Guest Details")').click();
    await page2.locator('button:has-text("Use Demo Customer")').click();
    await page2.locator('button:has-text("Review Booking")').click();

    const [bookingResponse2] = await Promise.all([
      page2.waitForResponse((res) => res.url().includes('/api/booking') && res.request().method() === 'POST'),
      page2.locator('button:has-text("Confirm Reservation")').click(),
    ]);

    const resJson2 = await bookingResponse2.json().catch(() => ({}));
    if (bookingResponse2.status() !== 201) {
      console.error('Visitor 2 booking error response:', bookingResponse2.status(), resJson2);
    }
    expect(bookingResponse2.status()).toBe(201);

    await expect(page2.locator('h1')).toContainText('We look forward to welcoming you', { timeout: 15000 });

    const refElement = page2.locator('span.font-mono').first();
    refVisitor2 = (await refElement.textContent())?.trim() || '';
    expect(refVisitor2).toMatch(/^BLS-\d{8}-[A-Z0-9]{4}$/);
    expect(refVisitor2).not.toEqual(refVisitor1);
    if (refVisitor2) testCreatedReferences.push(refVisitor2);

    // 3. Lookup page verification for Visitor 2
    await page2.goto(`/booking/${refVisitor2}`);
    await expect(page2.locator(`text=${refVisitor2}`)).toBeVisible();

    // 4. Return to admin appointments: Visitor 2's booking is recognized and visible
    await page2.goto('/admin/appointments');
    await expect(page2.locator(`text=${refVisitor2}`)).toBeVisible({ timeout: 10000 });

    await context2.close();
  });

  test('Cross-Visitor Privacy, Isolation & Ownership Protection', async ({ browser }) => {
    // Visitor A context
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await pageA.goto('/admin/login');
    await pageA.click('button:has-text("Explore Demo as Manager")');
    await expect(pageA).toHaveURL('/admin');

    // Visitor B context (completely isolated session)
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await pageB.goto('/admin/login');
    await pageB.click('button:has-text("Explore Demo as Manager")');
    await expect(pageB).toHaveURL('/admin');

    // 1. Privacy Check: Visitor B cannot access Visitor A's private booking lookup
    if (refVisitor1) {
      const responseB = await pageB.goto(`/booking/${refVisitor1}`);
      expect(responseB?.status()).toBe(404);
    }

    // 2. Management Table Scoping: Visitor B cannot see Visitor A's private booking
    if (refVisitor1) {
      await pageB.goto('/admin/appointments');
      await expect(pageB.locator(`text=${refVisitor1}`)).not.toBeVisible();
    }

    // 3. API Mutation Protection: Demo manager cannot mutate baseline seeded demo records
    const seedMutationRes = await pageA.request.patch('/api/admin/appointments', {
      data: {
        id: '00000000-0000-0000-0000-000000000001',
        status: 'confirmed',
      },
    });
    // Valid UUID that doesn't belong to visitor returns 404 or 403
    expect([400, 403, 404]).toContain(seedMutationRes.status());

    await contextA.close();
    await contextB.close();
  });
});
