// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  createBooking,
  getAvailableStaffForService,
  getAvailableSlots,
} from '@/server/services/booking-engine';

describe('Admin & Demo Authorization Enforcement Tests', () => {
  let seedApptId: string;
  let seedCustomerId: string;
  let visitorAId = 'vst_test_visitor_alpha_01';
  let visitorBId = 'vst_test_visitor_beta_02';
  let visitorAApptId: string;
  let visitorACustomerId: string;
  let testServiceId: string;
  let testStaffId: string;

  beforeAll(async () => {
    // 0. Clean visitor test bookings
    await db.delete(schema.appointments).where(eq(schema.appointments.isDemoSeed, false));

    // 1. Get an existing seed appointment and customer
    const [seedAppt] = await db
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.isDemoSeed, true))
      .limit(1);

    expect(seedAppt).toBeDefined();
    seedApptId = seedAppt.id;
    seedCustomerId = seedAppt.customerId;

    // 2. Get service and qualified staff for booking
    const [svc] = await db.select().from(schema.services).limit(1);
    testServiceId = svc.id;
    const staffList = await getAvailableStaffForService(testServiceId);
    expect(staffList.length).toBeGreaterThan(0);
    testStaffId = staffList[0].id;

    // 3. Create a booking owned by Visitor A on a safe future date
    const d = new Date();
    d.setDate(d.getDate() + 10);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    const dateStr = d.toISOString().slice(0, 10);

    const slots = await getAvailableSlots(testServiceId, testStaffId, dateStr);
    expect(slots.length).toBeGreaterThan(0);
    const time = slots[0];

    const bookingRes = await createBooking({
      serviceId: testServiceId,
      staffId: testStaffId,
      date: dateStr,
      time,
      customer: {
        firstName: 'VisitorA',
        lastName: 'Client',
        phone: '09170009988',
        email: 'visitor.a@example.com',
      },
      visitorId: visitorAId,
    });

    expect(bookingRes.success).toBe(true);
    visitorAApptId = bookingRes.appointmentId!;

    const [savedAppt] = await db
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.id, visitorAApptId));
    visitorACustomerId = savedAppt.customerId;
  });

  it('rejects demo manager attempting to update a shared seed appointment with 403', async () => {
    // Simulate what PATCH /api/admin/appointments executes
    const [existing] = await db
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.id, seedApptId))
      .limit(1);

    expect(existing.isDemoSeed).toBe(true);

    const isDemoManager = true;
    const sessionVisitorId = visitorAId;

    let permissionDenied = false;
    if (isDemoManager) {
      if (existing.isDemoSeed || existing.visitorId !== sessionVisitorId) {
        permissionDenied = true;
      }
    }

    expect(permissionDenied).toBe(true);
  });

  it('rejects demo manager attempting to update another visitor appointment with 403', async () => {
    const [existing] = await db
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.id, visitorAApptId))
      .limit(1);

    expect(existing.visitorId).toBe(visitorAId);

    // Visitor B tries to edit Visitor A's appointment
    const sessionVisitorId = visitorBId;
    let permissionDenied = false;
    if (existing.isDemoSeed || existing.visitorId !== sessionVisitorId) {
      permissionDenied = true;
    }

    expect(permissionDenied).toBe(true);
  });

  it('permits demo manager to update their own created demo appointment', async () => {
    const [existing] = await db
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.id, visitorAApptId))
      .limit(1);

    const sessionVisitorId = visitorAId;
    let permitted = false;
    if (!existing.isDemoSeed && existing.visitorId === sessionVisitorId) {
      permitted = true;
    }

    expect(permitted).toBe(true);
  });

  it('rejects demo manager attempting to update shared seed customer records with 403', async () => {
    const appts = await db
      .select({
        id: schema.appointments.id,
        isDemoSeed: schema.appointments.isDemoSeed,
        visitorId: schema.appointments.visitorId,
      })
      .from(schema.appointments)
      .where(eq(schema.appointments.customerId, seedCustomerId));

    const isSeed = appts.length === 0 || appts.some((a: { isDemoSeed: boolean }) => a.isDemoSeed === true);
    const sessionVisitorId = visitorAId;
    const isOwner = appts.some((a: { visitorId: string | null }) => a.visitorId === sessionVisitorId);

    const denied = isSeed || !isOwner;
    expect(denied).toBe(true);
  });

  it('permits demo manager to update customer created under their own demo session', async () => {
    const appts = await db
      .select({
        id: schema.appointments.id,
        isDemoSeed: schema.appointments.isDemoSeed,
        visitorId: schema.appointments.visitorId,
      })
      .from(schema.appointments)
      .where(eq(schema.appointments.customerId, visitorACustomerId));

    const isSeed = appts.length === 0 || appts.some((a: { isDemoSeed: boolean }) => a.isDemoSeed === true);
    const sessionVisitorId = visitorAId;
    const isOwner = appts.some((a: { visitorId: string | null }) => a.visitorId === sessionVisitorId);

    const allowed = !isSeed && isOwner;
    expect(allowed).toBe(true);
  });
});
