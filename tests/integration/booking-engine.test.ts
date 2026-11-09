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

  function getSafeWorkingDay(offsetDays: number = 3): string {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    if (d.getDay() === 0) {
      d.setDate(d.getDate() + 1); // Skip Sunday
    }
    return d.toISOString().slice(0, 10);
  }

  beforeAll(async () => {
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

    // 4. Calculate a safe future working day
    futureDateStr = getSafeWorkingDay(3);
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
    const dateStr = getSafeWorkingDay(4);

    const slots = await getAvailableSlots(testServiceId, testStaffId, dateStr);
    expect(slots.length).toBeGreaterThan(0);
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
    const testDateStr = getSafeWorkingDay(6);

    const slots = await getAvailableSlots(testServiceId, testStaffId, testDateStr);
    expect(slots.length).toBeGreaterThan(0);
    const slotToBook = slots[0];

    // First booking
    const firstResult = await createBooking({
      serviceId: testServiceId,
      staffId: testStaffId,
      date: testDateStr,
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
      date: testDateStr,
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
    const testDateStr = getSafeWorkingDay(8);

    const slots = await getAvailableSlots(testServiceId, testStaffId, testDateStr);
    expect(slots.length).toBeGreaterThan(0);
    const targetSlot = slots[0];

    // Fire 5 simultaneous requests for the exact same slot
    const concurrentRequests = Array.from({ length: 5 }, (_, i) =>
      createBooking({
        serviceId: testServiceId,
        staffId: testStaffId,
        date: testDateStr,
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
});
