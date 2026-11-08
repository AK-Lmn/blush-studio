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

describe('Booking Engine Integration Tests', () => {
  let testServiceId: string;
  let testStaffId: string;
  let futureDateStr: string;

  beforeAll(async () => {
    // Pick first available service from seeded database
    const [service] = await db
      .select()
      .from(schema.services)
      .where(eq(schema.services.isActive, true))
      .limit(1);

    expect(service).toBeDefined();
    testServiceId = service.id;

    // Pick a qualified staff member
    const staffList = await getAvailableStaffForService(testServiceId);
    expect(staffList.length).toBeGreaterThan(0);
    testStaffId = staffList[0].id;

    // Calculate a safe future weekday (e.g. 5 days from now)
    const future = new Date();
    future.setDate(future.getDate() + 5);
    // ensure not Sunday if needed (seeded business hours include Sun 10-6 though)
    futureDateStr = future.toISOString().slice(0, 10);
  });

  it('calculates available slots respecting business hours and intervals', async () => {
    const slots = await getAvailableSlots(testServiceId, testStaffId, futureDateStr);
    expect(Array.isArray(slots)).toBe(true);
    expect(slots.length).toBeGreaterThan(0);
    // Each slot should be formatted HH:mm
    expect(slots[0]).toMatch(/^\d{2}:\d{2}$/);
  });

  it('successfully creates an appointment and persists to database', async () => {
    const slots = await getAvailableSlots(testServiceId, testStaffId, futureDateStr);
    const chosenSlot = slots[0];

    const result = await createBooking({
      serviceId: testServiceId,
      staffId: testStaffId,
      date: futureDateStr,
      time: chosenSlot,
      customer: {
        firstName: 'TestClient',
        lastName: 'Automated',
        phone: '09179998877',
        email: 'test.automated@blushstudio.demo',
        notes: 'Automated test booking',
      },
      paymentMethod: 'cash',
    });

    expect(result.success).toBe(true);
    expect(result.referenceNumber).toMatch(/^BLS-\d{8}-[A-Z0-9]{4}$/);
    expect(result.appointmentId).toBeDefined();

    // Verify record exists in DB
    const [saved] = await db
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.referenceNumber, result.referenceNumber!));

    expect(saved).toBeDefined();
    expect(saved.status).toBe('pending');
    expect(saved.paymentStatus).toBe('unpaid');
  });

  it('prevents double-booking / rejects overlapping appointments', async () => {
    // Pick another future date to ensure pristine availability
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 8);
    const testDateStr = testDate.toISOString().slice(0, 10);

    const slots = await getAvailableSlots(testServiceId, testStaffId, testDateStr);
    expect(slots.length).toBeGreaterThan(0);

    // Pick an available slot
    const slotToBook = slots[0];
    expect(slotToBook).toBeDefined();

    // First booking
    const firstResult = await createBooking({
      serviceId: testServiceId,
      staffId: testStaffId,
      date: testDateStr,
      time: slotToBook,
      customer: {
        firstName: 'First',
        lastName: 'Requester',
        phone: '09170001122',
      },
      paymentMethod: 'cash',
    });
    expect(firstResult.success).toBe(true);

    // Second booking on the exact same time slot should fail
    const conflictResult = await createBooking({
      serviceId: testServiceId,
      staffId: testStaffId,
      date: testDateStr,
      time: slotToBook,
      customer: {
        firstName: 'Conflicting',
        lastName: 'Requester',
        phone: '09173334455',
      },
      paymentMethod: 'gcash',
    });

    expect(conflictResult.success).toBe(false);
    expect(conflictResult.error).toContain('no longer available');
  });

  it('rejects booking for invalid or non-existent service ID', async () => {
    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    const result = await createBooking({
      serviceId: fakeUuid,
      staffId: testStaffId,
      date: futureDateStr,
      time: '14:00',
      customer: {
        firstName: 'Invalid',
        lastName: 'Service',
        phone: '09171112233',
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('no longer available');
  });
});
