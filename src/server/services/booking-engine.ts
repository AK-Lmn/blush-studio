/**
 * Booking Engine — Server-side availability and appointment creation.
 *
 * All times stored in UTC. Business logic uses Asia/Manila.
 * Concurrency safety via advisory locks on staff+date.
 */
import { db } from '@/lib/db';
import {
  appointments,
  staff,
  staffSchedules,
  staffServices,
  staffUnavailable,
  businessHours,
  businessSettings,
  customers,
  services,
} from '@/lib/db/schema';
import { eq, and, ne, gte, lte, lt, or, sql, inArray } from 'drizzle-orm';
import { generateReferenceNumber } from '@/lib/utils';

const MANILA_TZ = 'Asia/Manila';

// ─── Helpers ─────────────────────────────────────────────────────────

function toManilaDate(utcDate: Date): Date {
  return new Date(
    utcDate.toLocaleString('en-US', { timeZone: MANILA_TZ })
  );
}

function manilaToday(): Date {
  const now = new Date();
  const manila = toManilaDate(now);
  manila.setHours(0, 0, 0, 0);
  return manila;
}

function getDayOfWeek(date: Date): string {
  const days = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  return days[date.getDay()];
}

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

function createManilaDateTime(dateStr: string, timeStr: string): Date {
  // dateStr = 'YYYY-MM-DD', timeStr = 'HH:mm'
  // Create a date in Manila timezone and convert to UTC
  const [year, month, day] = dateStr.split('-').map(Number);
  const { hours, minutes } = parseTime(timeStr);

  // Format an ISO string with the Manila offset
  // Manila is UTC+8
  const pad = (n: number) => String(n).padStart(2, '0');
  const isoStr = `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00+08:00`;
  return new Date(isoStr);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

// ─── Advisory Lock Key ──────────────────────────────────────────────

function staffDateLockKey(staffId: string, dateStr: string): number {
  // Create a deterministic lock key from staff ID + date
  let hash = 0;
  const key = `${staffId}:${dateStr}`;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

// ─── Get Business Settings ──────────────────────────────────────────

export async function getBusinessSettings() {
  const [settings] = await db.select().from(businessSettings).limit(1);
  return settings || {
    bookingIntervalMinutes: 30,
    minAdvanceBookingHours: 2,
    maxAdvanceBookingDays: 30,
    bufferMinutes: 10,
  };
}

// ─── Get Available Staff for Service ─────────────────────────────────

export async function getAvailableStaffForService(serviceId: string) {
  const staffList = await db
    .select({
      id: staff.id,
      firstName: staff.firstName,
      lastName: staff.lastName,
      bio: staff.bio,
      imageUrl: staff.imageUrl,
    })
    .from(staff)
    .innerJoin(staffServices, eq(staffServices.staffId, staff.id))
    .where(and(eq(staffServices.serviceId, serviceId), eq(staff.isActive, true)));

  return staffList;
}

// ─── Get Available Time Slots ────────────────────────────────────────

export async function getAvailableSlots(
  serviceId: string,
  staffId: string,
  dateStr: string // YYYY-MM-DD
): Promise<string[]> {
  // 1. Get service duration
  const [service] = await db
    .select({ durationMinutes: services.durationMinutes })
    .from(services)
    .where(eq(services.id, serviceId));

  if (!service) throw new Error('Service not found');

  // 2. Get business settings
  const settings = await getBusinessSettings();
  const interval = settings.bookingIntervalMinutes;
  const buffer = settings.bufferMinutes;
  const totalDuration = service.durationMinutes + buffer;

  // 3. Determine day of week
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayName = getDayOfWeek(dateObj);

  // 4. Check business hours
  const [bizHours] = await db
    .select()
    .from(businessHours)
    .where(eq(businessHours.dayOfWeek, dayName as any));

  if (!bizHours || bizHours.isClosed) return [];

  // 5. Check staff schedule
  const [staffSched] = await db
    .select()
    .from(staffSchedules)
    .where(
      and(
        eq(staffSchedules.staffId, staffId),
        eq(staffSchedules.dayOfWeek, dayName as any),
        eq(staffSchedules.isActive, true)
      )
    );

  if (!staffSched) return [];

  // 6. Determine working window (intersection of business hours and staff schedule)
  const bizOpen = parseTime(bizHours.openTime);
  const bizClose = parseTime(bizHours.closeTime);
  const staffStart = parseTime(staffSched.startTime);
  const staffEnd = parseTime(staffSched.endTime);

  const windowStart = {
    hours: Math.max(bizOpen.hours * 60 + bizOpen.minutes, staffStart.hours * 60 + staffStart.minutes),
  };
  const windowEnd = {
    hours: Math.min(bizClose.hours * 60 + bizClose.minutes, staffEnd.hours * 60 + staffEnd.minutes),
  };

  const startMinutes = windowStart.hours;
  const endMinutes = windowEnd.hours;

  if (startMinutes >= endMinutes) return [];

  // 7. Check staff unavailability
  const dayStart = createManilaDateTime(dateStr, '00:00');
  const dayEnd = createManilaDateTime(dateStr, '23:59');

  const unavailable = await db
    .select()
    .from(staffUnavailable)
    .where(
      and(
        eq(staffUnavailable.staffId, staffId),
        lte(staffUnavailable.startDate, dayEnd),
        gte(staffUnavailable.endDate, dayStart)
      )
    );

  if (unavailable.length > 0) return [];

  // 8. Get existing appointments (non-cancelled)
  const existingAppts = await db
    .select({
      startTime: appointments.startTime,
      endTime: appointments.endTime,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.staffId, staffId),
        ne(appointments.status, 'cancelled'),
        gte(appointments.startTime, dayStart),
        lt(appointments.startTime, addMinutes(dayEnd, 1))
      )
    );

  // 9. Check minimum advance booking
  const now = new Date();
  const minAdvance = addMinutes(now, settings.minAdvanceBookingHours * 60);

  // 10. Generate available slots
  const slots: string[] = [];

  for (let mins = startMinutes; mins + service.durationMinutes <= endMinutes; mins += interval) {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    const slotStart = createManilaDateTime(dateStr, timeStr);
    const slotEnd = addMinutes(slotStart, totalDuration);

    // Skip if too soon
    if (slotStart < minAdvance) continue;

    // Check for conflicts with existing appointments
    const hasConflict = existingAppts.some((appt: any) => {
      const apptStart = new Date(appt.startTime);
      const apptEndWithBuffer = addMinutes(new Date(appt.endTime), buffer);
      // Overlap check: slot overlaps if slotStart < apptEndWithBuffer AND slotEnd > apptStart
      return slotStart < apptEndWithBuffer && slotEnd > apptStart;
    });

    if (!hasConflict) {
      slots.push(timeStr);
    }
  }

  return slots;
}

// ─── Create Booking ──────────────────────────────────────────────────

export interface CreateBookingInput {
  serviceId: string;
  staffId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    notes?: string;
  };
  paymentMethod?: 'cash' | 'gcash';
}

export interface BookingResult {
  success: boolean;
  referenceNumber?: string;
  appointmentId?: string;
  error?: string;
}

export async function createBooking(
  input: CreateBookingInput
): Promise<BookingResult> {
  const lockKey = staffDateLockKey(input.staffId, input.date);

  try {
    // Use a transaction with advisory lock for concurrency safety
    const result = await db.transaction(async (tx: any) => {
      // Acquire advisory lock for this staff+date combo
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockKey})`);

      // 1. Verify service exists and is active
      const [service] = await tx
        .select()
        .from(services)
        .where(and(eq(services.id, input.serviceId), eq(services.isActive, true)));

      if (!service) {
        return { success: false, error: 'Service is no longer available' };
      }

      // 2. Verify staff exists, is active, and can perform this service
      const [staffMember] = await tx
        .select()
        .from(staff)
        .where(and(eq(staff.id, input.staffId), eq(staff.isActive, true)));

      if (!staffMember) {
        return { success: false, error: 'Staff member is not available' };
      }

      const [staffService] = await tx
        .select()
        .from(staffServices)
        .where(
          and(
            eq(staffServices.staffId, input.staffId),
            eq(staffServices.serviceId, input.serviceId)
          )
        );

      if (!staffService) {
        return {
          success: false,
          error: 'This staff member cannot perform the selected service',
        };
      }

      // 3. Get business settings
      const [settings] = await tx.select().from(businessSettings).limit(1);
      const buffer = settings?.bufferMinutes ?? 10;

      // 4. Calculate appointment times
      const startTime = createManilaDateTime(input.date, input.time);
      const endTime = addMinutes(startTime, service.durationMinutes);

      // 5. Verify the slot is still available (re-check inside transaction)
      const startWithBuffer = addMinutes(startTime, -(buffer));
      const endWithBuffer = addMinutes(endTime, buffer);

      const conflicts = await tx
        .select({ id: appointments.id })
        .from(appointments)
        .where(
          and(
            eq(appointments.staffId, input.staffId),
            ne(appointments.status, 'cancelled'),
            lt(appointments.startTime, endWithBuffer),
            gte(appointments.endTime, addMinutes(startTime, -buffer))
          )
        );

      if (conflicts.length > 0) {
        return {
          success: false,
          error: 'This time slot is no longer available. Please select another time.',
        };
      }

      // 6. Verify business hours
      const dateObj = new Date(
        parseInt(input.date.split('-')[0]),
        parseInt(input.date.split('-')[1]) - 1,
        parseInt(input.date.split('-')[2])
      );
      const dayName = getDayOfWeek(dateObj);

      const [bizHours] = await tx
        .select()
        .from(businessHours)
        .where(eq(businessHours.dayOfWeek, dayName as any));

      if (!bizHours || bizHours.isClosed) {
        return { success: false, error: 'The salon is closed on this day' };
      }

      // 7. Check minimum advance booking
      const now = new Date();
      const minAdvanceHours = settings?.minAdvanceBookingHours ?? 2;
      const minBookingTime = addMinutes(now, minAdvanceHours * 60);

      if (startTime < minBookingTime) {
        return {
          success: false,
          error: `Appointments must be booked at least ${minAdvanceHours} hours in advance`,
        };
      }

      // 8. Find or create customer
      let customerId: string;

      const normalizedPhone = input.customer.phone.replace(/[\s\-()]/g, '');
      const [existingCustomer] = await tx
        .select()
        .from(customers)
        .where(eq(customers.phone, normalizedPhone));

      if (existingCustomer) {
        customerId = existingCustomer.id;
        // Update name and email if provided
        await tx
          .update(customers)
          .set({
            firstName: input.customer.firstName,
            lastName: input.customer.lastName,
            email: input.customer.email || existingCustomer.email,
            updatedAt: new Date(),
          })
          .where(eq(customers.id, customerId));
      } else {
        const [newCustomer] = await tx
          .insert(customers)
          .values({
            firstName: input.customer.firstName,
            lastName: input.customer.lastName,
            phone: normalizedPhone,
            email: input.customer.email || null,
          })
          .returning({ id: customers.id });

        customerId = newCustomer.id;
      }

      // 9. Create appointment
      const referenceNumber = generateReferenceNumber();

      const [appointment] = await tx
        .insert(appointments)
        .values({
          referenceNumber,
          customerId,
          serviceId: input.serviceId,
          staffId: input.staffId,
          startTime,
          endTime,
          status: 'pending',
          paymentStatus: 'unpaid',
          paymentMethod: input.paymentMethod || null,
          priceCentavos: service.priceCentavos,
          customerNotes: input.customer.notes || null,
        })
        .returning({ id: appointments.id });

      return {
        success: true,
        referenceNumber,
        appointmentId: appointment.id,
      };
    });

    return result;
  } catch (error) {
    console.error('Booking creation failed:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

// ─── Get Available Dates ─────────────────────────────────────────────

export async function getAvailableDates(
  serviceId: string,
  staffId: string
): Promise<string[]> {
  const settings = await getBusinessSettings();
  const maxDays = settings.maxAdvanceBookingDays;

  const today = manilaToday();
  const dates: string[] = [];

  for (let i = 0; i <= maxDays; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().slice(0, 10);

    const slots = await getAvailableSlots(serviceId, staffId, dateStr);
    if (slots.length > 0) {
      dates.push(dateStr);
    }
  }

  return dates;
}
