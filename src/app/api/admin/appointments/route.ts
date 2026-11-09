import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin-auth';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { createBooking } from '@/server/services/booking-engine';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Helper to require authenticated admin or demo manager session
async function checkAuth() {
  const session = await getAdminSession();
  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 }), session: null };
  }
  return { error: null, session };
}

// Update appointment (status, paymentStatus, adminNotes)
export async function PATCH(request: NextRequest) {
  const { error: authError, session } = await checkAuth();
  if (authError || !session) return authError;

  try {
    const body = await request.json();
    const { id, status, paymentStatus, paymentMethod, adminNotes } = body;

    if (!id || typeof id !== 'string' || !UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Valid UUID appointment ID required' }, { status: 400 });
    }

    // Fetch existing appointment to verify access scope
    const [existing] = await db
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Multi-visitor isolation & baseline protection:
    // Demo Managers cannot modify shared seed appointments or appointments belonging to another visitor session.
    if (session.role === 'demo_manager') {
      if (existing.isDemoSeed) {
        return NextResponse.json(
          {
            error:
              'Shared sample appointments are protected in public demo mode. To test editing appointments, book an appointment through the website or add a walk-in, then edit your own booking.',
          },
          { status: 403 }
        );
      }

      if (existing.visitorId !== session.visitorId) {
        return NextResponse.json(
          { error: 'Access denied: you cannot modify bookings from another demonstration session.' },
          { status: 403 }
        );
      }
    }

    const updates: any = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (paymentStatus) updates.paymentStatus = paymentStatus;
    if (paymentMethod !== undefined) updates.paymentMethod = paymentMethod;
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;

    const [updated] = await db
      .update(schema.appointments)
      .set(updates)
      .where(eq(schema.appointments.id, id))
      .returning();

    return NextResponse.json({ success: true, appointment: updated });
  } catch (error: any) {
    console.error('Update appointment error:', error);
    return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 });
  }
}

// Centralized manual appointment / walk-in creation using core booking engine
export async function POST(request: NextRequest) {
  const { error: authError, session } = await checkAuth();
  if (authError || !session) return authError;

  try {
    const body = await request.json();
    const {
      serviceId,
      staffId,
      date,
      time,
      customerFirstName,
      customerLastName,
      customerPhone,
      customerEmail,
      isWalkIn = true,
      paymentMethod = 'cash',
      paymentStatus = 'paid',
      status = 'confirmed',
      adminNotes,
    } = body;

    if (!serviceId || !staffId || !date || !time || !customerFirstName || !customerLastName || !customerPhone) {
      return NextResponse.json(
        { error: 'Missing required appointment fields (serviceId, staffId, date, time, customer details)' },
        { status: 400 }
      );
    }

    // Delegate creation to centralized booking engine with concurrency and conflict checks
    const result = await createBooking({
      serviceId,
      staffId,
      date,
      time,
      customer: {
        firstName: customerFirstName,
        lastName: customerLastName,
        phone: customerPhone,
        email: customerEmail,
        notes: adminNotes,
      },
      paymentMethod,
      paymentStatus,
      status,
      isWalkIn: Boolean(isWalkIn),
      adminNotes: adminNotes || 'Recorded by studio management',
      visitorId: session.visitorId,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to record booking due to scheduling conflict' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        appointment: {
          id: result.appointmentId,
          referenceNumber: result.referenceNumber,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Manual booking error:', error);
    return NextResponse.json({ error: 'Failed to record booking' }, { status: 500 });
  }
}
