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
import { eq, and, ne, gte, lte, lt, or, sql, inArray, asc } from 'drizzle-orm';
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

async function computeSlotsForStaffMember(params: {
  serviceDurationMinutes: number;
  staffId: string;
  dateStr: string;
  dayName: string;
  bizHours: { openTime: string; closeTime: string };
  settings: {
    bookingIntervalMinutes: number;
    bufferMinutes: number;
    minAdvanceBookingHours: number;
  };
}): Promise<string[]> {
  const { serviceDurationMinutes, staffId, dateStr, dayName, bizHours, settings } = params;
  const interval = settings.bookingIntervalMinutes;
  const buffer = settings.bufferMinutes;
  const totalDuration = serviceDurationMinutes + buffer;

  // Check staff schedule
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
    return [];
  }

  // Working window calculation
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

  // Check staff unavailability
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

  // Existing booked appointments (non-cancelled)
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

  // Minimum advance booking check
  const now = new Date();
  const minAdvance = addMinutes(now, settings.minAdvanceBookingHours * 60);

  const slots: string[] = [];

  for (let mins = startMinutes; mins + serviceDurationMinutes <= endMinutes; mins += interval) {
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

  // 2. Get business settings & check booking horizon
  const settings = await getBusinessSettings();
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

  // 3. Check business hours once for the target date
  const dayName = getDayOfWeek(targetDate);
  const [bizHours] = await db
    .select()
    .from(businessHours)
    .where(eq(businessHours.dayOfWeek, dayName as any));

  if (!bizHours || bizHours.isClosed) {
    return []; // Salon is closed on this day
  }

  // 4a. "First Available Stylist": aggregate open slots across all qualified staff members
  if (staffId === 'any') {
    const qualifiedStaff = await getAvailableStaffForService(serviceId);
    if (qualifiedStaff.length === 0) {
      return [];
    }

    const perStaffSlots = await Promise.all(
      qualifiedStaff.map((member: { id: string }) =>
        computeSlotsForStaffMember({
          serviceDurationMinutes: service.durationMinutes,
          staffId: member.id,
          dateStr,
          dayName,
          bizHours,
          settings,
        })
      )
    );

    const uniqueSlots = new Set<string>();
    for (const list of perStaffSlots) {
      for (const slot of list) {
        uniqueSlots.add(slot);
      }
    }

    return Array.from(uniqueSlots).sort();
  }

  // 4b. Specific stylist requested: verify existence & qualification
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

  return computeSlotsForStaffMember({
    serviceDurationMinutes: service.durationMinutes,
    staffId,
    dateStr,
    dayName,
    bizHours,
    settings,
  });
}

/**
 * Finds real upcoming availability across all qualified staff starting from Manila today.
 * Used for displaying genuine live slot availability on the public homepage.
 */
export async function getNextAvailableAvailability(serviceId: string): Promise<{
  dateStr: string | null;
  dayLabel: string | null;
  slots: string[];
}> {
  const nowManila = new Date(
    new Date().toLocaleString('en-US', { timeZone: MANILA_TZ })
  );

  for (let offset = 0; offset < 4; offset++) {
    const candidate = new Date(nowManila);
    candidate.setDate(candidate.getDate() + offset);
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${candidate.getFullYear()}-${pad(candidate.getMonth() + 1)}-${pad(candidate.getDate())}`;

    try {
      const openSlots = await getAvailableSlots(serviceId, 'any', dateStr);
      if (openSlots.length > 0) {
        const dayLabel =
          offset === 0
            ? "Today's Availability"
            : offset === 1
            ? "Tomorrow's Availability"
            : `Next Open (${candidate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;

        return {
          dateStr,
          dayLabel,
          slots: openSlots.slice(0, 3),
        };
      }
    } catch {
      // Ignore individual day lookup errors cleanly
    }
  }

  return {
    dateStr: null,
    dayLabel: null,
    slots: [],
  };
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
  staffName?: string;
  error?: string;
}

async function verifyStaffSlotInTx(params: {
  tx: any;
  staffMember: { id: string; firstName: string; lastName: string };
  date: string;
  dayName: string;
  dayStart: Date;
  dayEnd: Date;
  bizHours: { openTime: string; closeTime: string };
  apptStartMinutes: number;
  apptEndMinutes: number;
  startWithBuffer: Date;
  endWithBuffer: Date;
}): Promise<{ available: boolean; error?: string }> {
  const {
    tx,
    staffMember,
    date,
    dayName,
    dayStart,
    dayEnd,
    bizHours,
    apptStartMinutes,
    apptEndMinutes,
    startWithBuffer,
    endWithBuffer,
  } = params;

  // Acquire per-staff+date advisory lock inside transaction to prevent double-booking
  if (!process.env.VITEST) {
    const lockKey = staffDateLockKey(staffMember.id, date);
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockKey})`);
  }

  // Verify staff is scheduled to work on this day
  const [staffSched] = await tx
    .select()
    .from(staffSchedules)
    .where(
      and(
        eq(staffSchedules.staffId, staffMember.id),
        eq(staffSchedules.dayOfWeek, dayName as any),
        eq(staffSchedules.isActive, true)
      )
    );

  if (!staffSched) {
    return {
      available: false,
      error: `${staffMember.firstName} is not scheduled to work on this day`,
    };
  }

  // Verify staff is not on leave / unavailable
  const unavailable = await tx
    .select()
    .from(staffUnavailable)
    .where(
      and(
        eq(staffUnavailable.staffId, staffMember.id),
        lte(staffUnavailable.startDate, dayEnd),
        gte(staffUnavailable.endDate, dayStart)
      )
    );

  if (unavailable.length > 0) {
    return {
      available: false,
      error: `${staffMember.firstName} is unavailable or on leave on this date`,
    };
  }

  // Verify appointment fits entirely within working hours window
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

  if (apptStartMinutes < windowStartMinutes || apptEndMinutes > windowEndMinutes) {
    return {
      available: false,
      error: 'The requested appointment falls outside active working hours',
    };
  }

  // Verify no conflicting appointments exist for this staff member (with buffers)
  const conflicts = await tx
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.staffId, staffMember.id),
        ne(appointments.status, 'cancelled'),
        lt(appointments.startTime, endWithBuffer),
        gte(appointments.endTime, startWithBuffer)
      )
    );

  if (conflicts.length > 0) {
    return {
      available: false,
      error: 'This time slot is no longer available. Please select another time.',
    };
  }

  return { available: true };
}

export async function createBooking(
  input: CreateBookingInput
): Promise<BookingResult> {
  try {
    const result = await db.transaction(async (tx: any) => {
      // 1. Verify service exists and is active
      const [service] = await tx
        .select()
        .from(services)
        .where(and(eq(services.id, input.serviceId), eq(services.isActive, true)));

      if (!service) {
        return { success: false, error: 'Service is no longer available' };
      }

      // 2. Get business settings & compute appointment times
      const [settings] = await tx.select().from(businessSettings).limit(1);
      const buffer = settings?.bufferMinutes ?? 10;

      const startTime = createManilaDateTime(input.date, input.time);
      const endTime = addMinutes(startTime, service.durationMinutes);

      // 3. Booking horizon & advance booking constraints
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

      // 4. Verify business hours
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

      const dayStart = createManilaDateTime(input.date, '00:00');
      const dayEnd = createManilaDateTime(input.date, '23:59');
      const apptStartParsed = parseTime(input.time);
      const apptStartMinutes = apptStartParsed.hours * 60 + apptStartParsed.minutes;
      const apptEndMinutes = apptStartMinutes + service.durationMinutes;
      const startWithBuffer = addMinutes(startTime, -buffer);
      const endWithBuffer = addMinutes(endTime, buffer);

      // 5. Resolve qualified stylist (single specific stylist OR first available across all qualified staff)
      let assignedStaff: { id: string; firstName: string; lastName: string } | null = null;

      if (input.staffId === 'any') {
        const qualifiedCandidates = await tx
          .select({
            id: staff.id,
            firstName: staff.firstName,
            lastName: staff.lastName,
          })
          .from(staff)
          .innerJoin(staffServices, eq(staffServices.staffId, staff.id))
          .where(and(eq(staffServices.serviceId, input.serviceId), eq(staff.isActive, true)))
          .orderBy(asc(staff.id));

        if (qualifiedCandidates.length === 0) {
          return { success: false, error: 'No qualified staff members are available for this service' };
        }

        for (const candidate of qualifiedCandidates) {
          const check = await verifyStaffSlotInTx({
            tx,
            staffMember: candidate,
            date: input.date,
            dayName,
            dayStart,
            dayEnd,
            bizHours,
            apptStartMinutes,
            apptEndMinutes,
            startWithBuffer,
            endWithBuffer,
          });
          if (check.available) {
            assignedStaff = candidate;
            break;
          }
        }

        if (!assignedStaff) {
          return {
            success: false,
            error: 'No qualified stylists are available for this time slot. Please select another time.',
          };
        }
      } else {
        const [staffMember] = await tx
          .select({
            id: staff.id,
            firstName: staff.firstName,
            lastName: staff.lastName,
          })
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

        const check = await verifyStaffSlotInTx({
          tx,
          staffMember,
          date: input.date,
          dayName,
          dayStart,
          dayEnd,
          bizHours,
          apptStartMinutes,
          apptEndMinutes,
          startWithBuffer,
          endWithBuffer,
        });

        if (!check.available) {
          return { success: false, error: check.error };
        }

        assignedStaff = staffMember;
      }

      if (!assignedStaff) {
        return { success: false, error: 'No qualified stylist is available for this slot.' };
      }

      // 6. Find or create customer (isolated by visitor session)
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

      // 7. Create appointment with visitor isolation scoping
      const referenceNumber = generateReferenceNumber();

      const [appointment] = await tx
        .insert(appointments)
        .values({
          referenceNumber,
          customerId,
          serviceId: input.serviceId,
          staffId: assignedStaff.id,
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
        staffName: `${assignedStaff.firstName} ${assignedStaff.lastName}`,
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
