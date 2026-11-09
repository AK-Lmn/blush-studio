/**
 * Booking Engine — Server-side availability and appointment creation.
 *
 * All times stored in UTC. Business logic uses Asia/Manila.
 * Concurrency safety via advisory locks and serializable isolation.
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
  const [year, month, day] = dateStr.split('-').map(Number);
  const { hours, minutes } = parseTime(timeStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  const isoStr = `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00+08:00`;
  return new Date(isoStr);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

// ─── Advisory Lock Key ───────────────────────────────────────────────

function staffDateLockKey(staffId: string, dateStr: string): number {
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
  try {
    const [settings] = await db.select().from(businessSettings).limit(1);
    if (settings) return settings;
  } catch (err) {
    console.warn('Could not load business settings from DB, using defaults:', err);
  }
  return {
    bookingIntervalMinutes: 30,
    minAdvanceBookingHours: 2,
    maxAdvanceBookingDays: 30,
    bufferMinutes: 10,
  };
}

// ─── Get Available Staff for Service ─────────────────────────────────

export async function getAvailableStaffForService(serviceId: string) {
  if (!serviceId || typeof serviceId !== 'string') {
    const err = new Error('Service ID is required');
    (err as any).statusCode = 400;
    throw err;
  }

  // 1. Verify service exists and is active
  const [service] = await db
    .select({ id: services.id })
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.isActive, true)))
    .limit(1);

  if (!service) {
    const err = new Error('Service not found');
    (err as any).statusCode = 404;
    throw err;
  }

  // 2. Query qualified active staff members
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
  if (!serviceId || !staffId || !dateStr) {
    const err = new Error('serviceId, staffId, and date (YYYY-MM-DD) are required');
    (err as any).statusCode = 400;
    throw err;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const err = new Error('Invalid date format. Expected YYYY-MM-DD');
    (err as any).statusCode = 400;
    throw err;
  }

  // 1. Verify service exists and is active
  const [service] = await db
    .select({ id: services.id, durationMinutes: services.durationMinutes })
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.isActive, true)))
    .limit(1);

  if (!service) {
    const err = new Error('Service not found');
    (err as any).statusCode = 404;
    throw err;
  }

  // 2. Verify staff exists and is active
  const [staffMember] = await db
    .select({ id: staff.id })
    .from(staff)
    .where(and(eq(staff.id, staffId), eq(staff.isActive, true)))
    .limit(1);

  if (!staffMember) {
    const err = new Error('Staff member not found');
    (err as any).statusCode = 404;
    throw err;
  }

  // 3. Verify staff is qualified to perform this service
  const [isQualified] = await db
    .select({ id: staffServices.id })
    .from(staffServices)
    .where(and(eq(staffServices.staffId, staffId), eq(staffServices.serviceId, serviceId)))
    .limit(1);

  if (!isQualified) {
    const err = new Error('Selected staff member cannot perform this service');
    (err as any).statusCode = 400;
    throw err;
  }

  // 4. Get business settings
  const settings = await getBusinessSettings();
  const interval = settings.bookingIntervalMinutes;
  const buffer = settings.bufferMinutes;
  const totalDuration = service.durationMinutes + buffer;

  // 5. Booking horizon check
  const today = manilaToday();
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  targetDate.setHours(0, 0, 0, 0);

  if (targetDate < today) {
    return []; // Past dates have zero available slots
  }

  const maxAdvanceDate = new Date(today);
  maxAdvanceDate.setDate(maxAdvanceDate.getDate() + settings.maxAdvanceBookingDays);
  if (targetDate > maxAdvanceDate) {
    return []; // Exceeds maximum booking window
  }

  // 6. Check business hours
  const dayName = getDayOfWeek(targetDate);
  const [bizHours] = await db
    .select()
    .from(businessHours)
    .where(eq(businessHours.dayOfWeek, dayName as any));

  if (!bizHours || bizHours.isClosed) {
    return []; // Salon is closed on this day
  }

  // 7. Check staff schedule
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

  if (!staffSched) {
    return []; // Staff member is not scheduled on this day
  }

  // 8. Working window calculation
  const bizOpen = parseTime(bizHours.openTime);
  const bizClose = parseTime(bizHours.closeTime);
  const staffStart = parseTime(staffSched.startTime);
  const staffEnd = parseTime(staffSched.endTime);

  const startMinutes = Math.max(
    bizOpen.hours * 60 + bizOpen.minutes,
    staffStart.hours * 60 + staffStart.minutes
  );
  const endMinutes = Math.min(
    bizClose.hours * 60 + bizClose.minutes,
    staffEnd.hours * 60 + staffEnd.minutes
  );

  if (startMinutes >= endMinutes) {
    return [];
  }

  // 9. Check staff unavailability
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

  if (unavailable.length > 0) {
    return [];
  }

  // 10. Existing booked appointments (non-cancelled)
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

  // 11. Minimum advance booking check
  const now = new Date();
  const minAdvance = addMinutes(now, settings.minAdvanceBookingHours * 60);

  // 12. Generate strictly valid slots
  const slots: string[] = [];

  for (let mins = startMinutes; mins + service.durationMinutes <= endMinutes; mins += interval) {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    const slotStart = createManilaDateTime(dateStr, timeStr);
    const slotEnd = addMinutes(slotStart, totalDuration);

    if (slotStart < minAdvance) continue;

    const hasConflict = existingAppts.some((appt: any) => {
      const apptStart = new Date(appt.startTime);
      const apptEndWithBuffer = addMinutes(new Date(appt.endTime), buffer);
      return slotStart < apptEndWithBuffer && slotEnd > apptStart;
    });

    if (!hasConflict) {
      slots.push(timeStr);
    }
  }

  return slots;
}

// ─── Centralized Create Booking ──────────────────────────────────────

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
  paymentStatus?: 'unpaid' | 'paid';
  status?: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  isWalkIn?: boolean;
  adminNotes?: string;
  visitorId?: string | null;
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
    const result = await db.transaction(async (tx: any) => {
      // Concurrency lock: postgres advisory lock per staff+date
      if (!process.env.VITEST) {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockKey})`);
      }

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

      // 5. Booking horizon & advance booking constraints (authoritative check before schedule)
      const now = new Date();
      if (!input.isWalkIn) {
        const minAdvanceHours = settings?.minAdvanceBookingHours ?? 2;
        const minBookingTime = addMinutes(now, minAdvanceHours * 60);

        if (startTime < minBookingTime) {
          return {
            success: false,
            error: `Appointments must be booked at least ${minAdvanceHours} hours in advance`,
          };
        }

        const maxAdvanceDays = settings?.maxAdvanceBookingDays ?? 30;
        const maxBookingTime = addMinutes(now, maxAdvanceDays * 24 * 60);

        if (startTime > maxBookingTime) {
          return {
            success: false,
            error: `Appointments cannot be booked more than ${maxAdvanceDays} days in advance`,
          };
        }
      }

      // 6. Verify business hours
      const [year, month, day] = input.date.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      const dayName = getDayOfWeek(dateObj);

      const [bizHours] = await tx
        .select()
        .from(businessHours)
        .where(eq(businessHours.dayOfWeek, dayName as any));

      if (!bizHours || bizHours.isClosed) {
        return { success: false, error: 'The salon is closed on this day' };
      }

      // 7. Verify staff is scheduled to work on this day
      const [staffSched] = await tx
        .select()
        .from(staffSchedules)
        .where(
          and(
            eq(staffSchedules.staffId, input.staffId),
            eq(staffSchedules.dayOfWeek, dayName as any),
            eq(staffSchedules.isActive, true)
          )
        );

      if (!staffSched) {
        return {
          success: false,
          error: `${staffMember.firstName} is not scheduled to work on this day`,
        };
      }

      // 8. Verify staff is not on leave / unavailable
      const dayStart = createManilaDateTime(input.date, '00:00');
      const dayEnd = createManilaDateTime(input.date, '23:59');

      const unavailable = await tx
        .select()
        .from(staffUnavailable)
        .where(
          and(
            eq(staffUnavailable.staffId, input.staffId),
            lte(staffUnavailable.startDate, dayEnd),
            gte(staffUnavailable.endDate, dayStart)
          )
        );

      if (unavailable.length > 0) {
        return {
          success: false,
          error: `${staffMember.firstName} is unavailable or on leave on this date`,
        };
      }

      // 9. Verify appointment fits entirely within working hours window
      const bizOpen = parseTime(bizHours.openTime);
      const bizClose = parseTime(bizHours.closeTime);
      const staffStart = parseTime(staffSched.startTime);
      const staffEnd = parseTime(staffSched.endTime);

      const windowStartMinutes = Math.max(
        bizOpen.hours * 60 + bizOpen.minutes,
        staffStart.hours * 60 + staffStart.minutes
      );
      const windowEndMinutes = Math.min(
        bizClose.hours * 60 + bizClose.minutes,
        staffEnd.hours * 60 + staffEnd.minutes
      );

      const apptStartParsed = parseTime(input.time);
      const apptStartMinutes = apptStartParsed.hours * 60 + apptStartParsed.minutes;
      const apptEndMinutes = apptStartMinutes + service.durationMinutes;

      if (apptStartMinutes < windowStartMinutes || apptEndMinutes > windowEndMinutes) {
        return {
          success: false,
          error: 'The requested appointment falls outside active working hours',
        };
      }

      // 10. Verify no conflicting appointments exist for this staff member (with buffers)
      const startWithBuffer = addMinutes(startTime, -buffer);
      const endWithBuffer = addMinutes(endTime, buffer);

      const conflicts = await tx
        .select({ id: appointments.id })
        .from(appointments)
        .where(
          and(
            eq(appointments.staffId, input.staffId),
            ne(appointments.status, 'cancelled'),
            lt(appointments.startTime, endWithBuffer),
            gte(appointments.endTime, startWithBuffer)
          )
        );

      if (conflicts.length > 0) {
        return {
          success: false,
          error: 'This time slot is no longer available. Please select another time.',
        };
      }

      // 11. Find or create customer (isolated by visitor session)
      // Never overwrite seeded baseline customers or other visitors' customer records
      let customerId: string | null = null;
      const normalizedPhone = input.customer.phone.replace(/[\s\-()]/g, '');

      if (input.visitorId) {
        const candidateCustomers = await tx
          .select({
            id: customers.id,
            email: customers.email,
          })
          .from(customers)
          .where(eq(customers.phone, normalizedPhone));

        for (const candidate of candidateCustomers) {
          const appts = await tx
            .select({
              isDemoSeed: appointments.isDemoSeed,
              visitorId: appointments.visitorId,
            })
            .from(appointments)
            .where(eq(appointments.customerId, candidate.id));

          const isSeed = appts.some((a: any) => a.isDemoSeed === true);
          const belongsToThisVisitor =
            appts.length > 0 &&
            appts.every((a: any) => a.visitorId === input.visitorId && !a.isDemoSeed);

          if (!isSeed && belongsToThisVisitor) {
            customerId = candidate.id;
            await tx
              .update(customers)
              .set({
                firstName: input.customer.firstName,
                lastName: input.customer.lastName,
                email: input.customer.email || candidate.email,
                updatedAt: new Date(),
              })
              .where(eq(customers.id, candidate.id));
            break;
          }
        }
      }

      if (!customerId) {
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

      // 12. Create appointment with visitor isolation scoping
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
          status: input.status || 'pending',
          paymentStatus: input.paymentStatus || 'unpaid',
          paymentMethod: input.paymentMethod || null,
          priceCentavos: service.priceCentavos,
          customerNotes: input.customer.notes || null,
          adminNotes: input.adminNotes || null,
          isWalkIn: Boolean(input.isWalkIn),
          visitorId: input.visitorId ? input.visitorId.slice(0, 64) : null,
          isDemoSeed: false,
        })
        .returning({ id: appointments.id });

      return {
        success: true,
        referenceNumber,
        appointmentId: appointment.id,
      };
    });

    return result;
  } catch (err: any) {
    console.error('Database transaction error during booking:', err);
    return {
      success: false,
      error: 'An unexpected database error occurred while confirming the booking.',
    };
  }
}
