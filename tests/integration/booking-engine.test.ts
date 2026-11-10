// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import {
  getAvailableSlots,
  createBooking,
  getAvailableStaffForService,
} from '@/server/services/booking-engine';
import { eq } from 'drizzle-orm';

describe('Booking Engine Integration & Concurrency Tests', () => {
  let testServiceId: string;
  let testStaffId: string;
  let incompatibleStaffId: string;
  let futureDateStr: string;

  async function findWorkingDateWithSlots(
    minSlots: number = 2,
    startOffset: number = 3
  ): Promise<{ dateStr: string; slots: string[] }> {
    for (let offset = startOffset; offset < 28; offset++) {
      const d = new Date();
      const manila = new Date(d.getTime() + 8 * 3600 * 1000);
      manila.setUTCDate(manila.getUTCDate() + offset);
      if (manila.getUTCDay() === 0) continue; // Skip Sunday

      const dateStr = manila.toISOString().slice(0, 10);
      const slots = await getAvailableSlots(testServiceId, testStaffId, dateStr);
      if (slots.length >= minSlots) {
        return { dateStr, slots };
      }
    }
    throw new Error(`Could not find future working date with at least ${minSlots} slots`);
  }

  beforeAll(async () => {
    // 0. Clean any lingering visitor test bookings from previous runs
    await db.delete(schema.appointments).where(eq(schema.appointments.isDemoSeed, false));

    // 1. Pick first available active service
    const [service] = await db
      .select()
      .from(schema.services)
      .where(eq(schema.services.isActive, true))
      .limit(1);

    expect(service).toBeDefined();
    testServiceId = service.id;

    // 2. Pick a qualified staff member for this service
    const staffList = await getAvailableStaffForService(testServiceId);
    expect(staffList.length).toBeGreaterThan(0);
    testStaffId = staffList[0].id;

    // 3. Find an active staff member NOT assigned to this service (for incompatibility test)
    const allStaff = await db
      .select({ id: schema.staff.id })
      .from(schema.staff)
      .where(eq(schema.staff.isActive, true));

    const qualifiedIds = new Set(staffList.map((s: { id: string }) => s.id));
    const incompatible = allStaff.find((s: { id: string }) => !qualifiedIds.has(s.id));
    if (incompatible) {
      incompatibleStaffId = incompatible.id;
    }

    // 4. Calculate a safe future working day with slots
    const found = await findWorkingDateWithSlots(2, 3);
    futureDateStr = found.dateStr;
  });

  it('calculates available slots respecting business hours and intervals', async () => {
    const slots = await getAvailableSlots(testServiceId, testStaffId, futureDateStr);
    expect(Array.isArray(slots)).toBe(true);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]).toMatch(/^\d{2}:\d{2}$/);
  });

  it('rejects getAvailableStaffForService for nonexistent service ID with 404', async () => {
    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    await expect(getAvailableStaffForService(fakeUuid)).rejects.toThrow('Service not found');
  });

  it('rejects getAvailableSlots for nonexistent service ID with 404', async () => {
    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    await expect(
      getAvailableSlots(fakeUuid, testStaffId, futureDateStr)
    ).rejects.toThrow('Service not found');
  });

  it('rejects getAvailableSlots for nonexistent staff ID with 404', async () => {
    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    await expect(
      getAvailableSlots(testServiceId, fakeUuid, futureDateStr)
    ).rejects.toThrow('Staff member not found');
  });

  it('rejects getAvailableSlots when staff is incompatible with service', async () => {
    if (!incompatibleStaffId) return; // Skip if all staff do all services
    await expect(
      getAvailableSlots(testServiceId, incompatibleStaffId, futureDateStr)
    ).rejects.toThrow('cannot perform this service');
  });

  it('returns empty availability for past dates', async () => {
    const pastDate = '2020-01-01';
    const slots = await getAvailableSlots(testServiceId, testStaffId, pastDate);
    expect(slots).toEqual([]);
  });

  it('returns empty availability for dates beyond maximum advance booking window', async () => {
    const distantFuture = new Date();
    distantFuture.setDate(distantFuture.getDate() + 180); // 6 months ahead (> 30 days limit)
    const distantDateStr = distantFuture.toISOString().slice(0, 10);

    const slots = await getAvailableSlots(testServiceId, testStaffId, distantDateStr);
    expect(slots).toEqual([]);
  });

  it('successfully creates an appointment and persists to database with visitor ID', async () => {
    const { dateStr, slots } = await findWorkingDateWithSlots(1, 4);
    const chosenSlot = slots[0];

    const result = await createBooking({
      serviceId: testServiceId,
      staffId: testStaffId,
      date: dateStr,
      time: chosenSlot,
      customer: {
        firstName: 'Elena',
        lastName: 'Reyes',
        phone: '09171234567',
        email: 'elena.reyes@example.com',
        notes: 'Quiet appointment requested',
      },
      paymentMethod: 'cash',
      visitorId: 'vst_automated_test_1',
    });

    expect(result.success).toBe(true);
    expect(result.referenceNumber).toMatch(/^BLS-\d{8}-[A-Z0-9]{4}$/);
    expect(result.appointmentId).toBeDefined();

    // Verify record in database
    const [saved] = await db
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.referenceNumber, result.referenceNumber!));

    expect(saved).toBeDefined();
    expect(saved.visitorId).toBe('vst_automated_test_1');
    expect(saved.isDemoSeed).toBe(false);
  });

  it('prevents double-booking / rejects overlapping appointments on same slot', async () => {
    const { dateStr, slots } = await findWorkingDateWithSlots(1, 6);
    const slotToBook = slots[0];

    // First booking
    const firstResult = await createBooking({
      serviceId: testServiceId,
      staffId: testStaffId,
      date: dateStr,
      time: slotToBook,
      customer: {
        firstName: 'ClientA',
        lastName: 'Requester',
        phone: '09170001122',
      },
      paymentMethod: 'cash',
    });
    expect(firstResult.success).toBe(true);

    // Second booking on exact same time slot must fail with conflict error
    const conflictResult = await createBooking({
      serviceId: testServiceId,
      staffId: testStaffId,
      date: dateStr,
      time: slotToBook,
      customer: {
        firstName: 'ClientB',
        lastName: 'Requester',
        phone: '09173334455',
      },
      paymentMethod: 'gcash',
    });

    expect(conflictResult.success).toBe(false);
    expect(conflictResult.error).toContain('no longer available');
  });

  it('prevents concurrent booking race conditions (5 simultaneous requests)', async () => {
    const { dateStr, slots } = await findWorkingDateWithSlots(1, 8);
    const targetSlot = slots[0];

    // Fire 5 simultaneous requests for the exact same slot
    const concurrentRequests = Array.from({ length: 5 }, (_, i) =>
      createBooking({
        serviceId: testServiceId,
        staffId: testStaffId,
        date: dateStr,
        time: targetSlot,
        customer: {
          firstName: `ConcurrentClient${i}`,
          lastName: 'Contender',
          phone: `0917111000${i}`,
        },
      })
    );

    const results = await Promise.all(concurrentRequests);
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    // Exactly one booking must succeed, and all others must fail
    expect(successCount).toBe(1);
    expect(failureCount).toBe(4);
  });

  it('authoritatively rejects booking outside active working hours', async () => {
    const { dateStr } = await findWorkingDateWithSlots(1, 5);

    // 04:00 AM is well before salon opening time (09:00 AM)
    const earlyResult = await createBooking({
      serviceId: testServiceId,
      staffId: testStaffId,
      date: dateStr,
      time: '04:00',
      customer: {
        firstName: 'Night',
        lastName: 'Owl',
        phone: '09179998877',
      },
    });

    expect(earlyResult.success).toBe(false);
    expect(earlyResult.error).toContain('outside active working hours');
  });

  it('authoritatively rejects booking beyond maximum advance booking window', async () => {
    const farFuture = new Date();
    farFuture.setDate(farFuture.getDate() + 90); // 90 days ahead (> 30 days)
    if (farFuture.getDay() === 0) farFuture.setDate(farFuture.getDate() + 1);
    const farDateStr = farFuture.toISOString().slice(0, 10);

    const result = await createBooking({
      serviceId: testServiceId,
      staffId: testStaffId,
      date: farDateStr,
      time: '14:00',
      customer: {
        firstName: 'Future',
        lastName: 'Planner',
        phone: '09179990000',
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('30 days in advance');
  });

  it('protects seeded customer records from being overwritten when a visitor books with the same phone', async () => {
    // 1. Get seeded customer Chloe Santos
    const [chloe] = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.firstName, 'Chloe'))
      .limit(1);

    expect(chloe).toBeDefined();
    const originalChloeEmail = chloe.email;
    const originalChloeLastName = chloe.lastName;

    // 2. A visitor books using Chloe's phone number
    const { dateStr, slots } = await findWorkingDateWithSlots(1, 10);

    const bookingResult = await createBooking({
      serviceId: testServiceId,
      staffId: testStaffId,
      date: dateStr,
      time: slots[0],
      customer: {
        firstName: 'Imposter',
        lastName: 'TryingToOverwrite',
        phone: chloe.phone,
        email: 'imposter@hacker.demo',
      },
      visitorId: 'vst_test_external_visitor_99',
    });

    expect(bookingResult.success).toBe(true);

    // 3. Verify Chloe Santos' original customer record is 100% UNTOUCHED
    const [refreshedChloe] = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.id, chloe.id));

    expect(refreshedChloe.firstName).toBe('Chloe');
    expect(refreshedChloe.lastName).toBe(originalChloeLastName);
    expect(refreshedChloe.email).toBe(originalChloeEmail);

    // 4. Verify a separate customer record was created for the visitor
    const [visitorAppt] = await db
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.id, bookingResult.appointmentId!));

    expect(visitorAppt.customerId).not.toBe(chloe.id);
  });

  it('isolates customers between separate visitors who share the same phone number', async () => {
    const sharedPhone = '09887776655';
    const day1 = await findWorkingDateWithSlots(1, 12);
    const day2 = await findWorkingDateWithSlots(1, 14);

    // Visitor 1 books
    const res1 = await createBooking({
      serviceId: testServiceId,
      staffId: testStaffId,
      date: day1.dateStr,
      time: day1.slots[0],
      customer: {
        firstName: 'VisitorOneName',
        lastName: 'Original',
        phone: sharedPhone,
        email: 'vis1@test.com',
      },
      visitorId: 'vst_user_alpha',
    });
    expect(res1.success).toBe(true);

    // Visitor 2 books with same phone on day 2
    const res2 = await createBooking({
      serviceId: testServiceId,
      staffId: testStaffId,
      date: day2.dateStr,
      time: day2.slots[0],
      customer: {
        firstName: 'VisitorTwoName',
        lastName: 'Different',
        phone: sharedPhone,
        email: 'vis2@test.com',
      },
      visitorId: 'vst_user_beta',
    });
    expect(res2.success).toBe(true);

    // Verify both appointments point to distinct customer records
    const [appt1] = await db
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.id, res1.appointmentId!));
    const [appt2] = await db
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.id, res2.appointmentId!));

    expect(appt1.customerId).not.toBe(appt2.customerId);

    // Verify customer 1 was not overwritten
    const [cust1] = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.id, appt1.customerId));
    expect(cust1.firstName).toBe('VisitorOneName');
  });

  it('aggregates First Available Stylist ("any") across all qualified staff members', async () => {
    const qualified = await getAvailableStaffForService(testServiceId);
    expect(qualified.length).toBeGreaterThanOrEqual(2);

    const { dateStr, slots } = await findWorkingDateWithSlots(2, 16);
    const chosenSlot = slots[0];

    // Check which qualified stylists are free at chosenSlot
    const freeStylists: string[] = [];
    for (const member of qualified) {
      const s = await getAvailableSlots(testServiceId, member.id, dateStr);
      if (s.includes(chosenSlot)) {
        freeStylists.push(member.id);
      }
    }
    expect(freeStylists.length).toBeGreaterThanOrEqual(2);

    // Book ALL but the last free stylist on that exact slot
    for (let i = 0; i < freeStylists.length - 1; i++) {
      const preBook = await createBooking({
        serviceId: testServiceId,
        staffId: freeStylists[i],
        date: dateStr,
        time: chosenSlot,
        customer: {
          firstName: `PreBook${i}`,
          lastName: 'Blocker',
          phone: `0917222111${i}`,
        },
        visitorId: `vst_prebook_${i}`,
      });
      expect(preBook.success).toBe(true);
    }

    // "any" must STILL find chosenSlot available because the last qualified stylist is free
    const aggregatedSlots = await getAvailableSlots(testServiceId, 'any', dateStr);
    expect(aggregatedSlots).toContain(chosenSlot);

    // Booking with staffId='any' must automatically assign the remaining available stylist
    const anyBooking = await createBooking({
      serviceId: testServiceId,
      staffId: 'any',
      date: dateStr,
      time: chosenSlot,
      customer: {
        firstName: 'Flex',
        lastName: 'Guest',
        phone: '09179994444',
      },
      visitorId: 'vst_flex_guest',
    });
    expect(anyBooking.success).toBe(true);
    expect(anyBooking.staffName).toBeTruthy();

    const [bookedAppt] = await db
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.id, anyBooking.appointmentId!));
    expect(bookedAppt.staffId).toBe(freeStylists[freeStylists.length - 1]);

    // Now that ALL qualified stylists are booked on chosenSlot, "any" must no longer include chosenSlot
    const afterSlots = await getAvailableSlots(testServiceId, 'any', dateStr);
    expect(afterSlots).not.toContain(chosenSlot);
  });
});
