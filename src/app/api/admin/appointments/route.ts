import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin-auth';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateReferenceNumber } from '@/lib/utils';

// Helper to require admin session on all admin mutations
async function checkAuth() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
  }
  return null;
}

// Update appointment (status, paymentStatus, adminNotes, reschedule)
export async function PATCH(request: NextRequest) {
  const authError = await checkAuth();
  if (authError) return authError;

  try {
    const body = await request.json();
    const { id, status, paymentStatus, paymentMethod, adminNotes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Appointment ID required' }, { status: 400 });
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

// Create manual appointment / walk-in
export async function POST(request: NextRequest) {
  const authError = await checkAuth();
  if (authError) return authError;

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
      isWalkIn = true,
      paymentMethod = 'cash',
      paymentStatus = 'paid',
      status = 'confirmed',
      adminNotes,
    } = body;

    // Get service price and duration
    const [service] = await db
      .select()
      .from(schema.services)
      .where(eq(schema.services.id, serviceId));

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 400 });
    }

    // Find or create customer
    const normalizedPhone = customerPhone.replace(/\D/g, '');
    let [customer] = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.phone, normalizedPhone));

    if (!customer) {
      const [newCust] = await db
        .insert(schema.customers)
        .values({
          firstName: customerFirstName,
          lastName: customerLastName,
          phone: normalizedPhone,
        })
        .returning();
      customer = newCust;
    }

    // Time calculations
    const startTime = new Date(`${date}T${time}:00+08:00`);
    const endTime = new Date(startTime.getTime() + service.durationMinutes * 60 * 1000);

    const referenceNumber = generateReferenceNumber();

    const [appointment] = await db
      .insert(schema.appointments)
      .values({
        referenceNumber,
        customerId: customer.id,
        serviceId,
        staffId,
        startTime,
        endTime,
        status,
        paymentStatus,
        paymentMethod,
        priceCentavos: service.priceCentavos,
        isWalkIn: Boolean(isWalkIn),
        adminNotes: adminNotes || 'Recorded by studio administrator',
      })
      .returning();

    return NextResponse.json({ success: true, appointment }, { status: 201 });
  } catch (error: any) {
    console.error('Manual booking error:', error);
    return NextResponse.json({ error: 'Failed to record booking' }, { status: 500 });
  }
}
