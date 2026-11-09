import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin-auth';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, firstName, lastName, phone, email, notes } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 });
    }

    // Baseline protection & authorization check
    if (session.role === 'demo_manager') {
      const appts = await db
        .select({
          id: schema.appointments.id,
          isDemoSeed: schema.appointments.isDemoSeed,
          visitorId: schema.appointments.visitorId,
        })
        .from(schema.appointments)
        .where(eq(schema.appointments.customerId, id));

      const isSeed = appts.length === 0 || appts.some((a: { isDemoSeed: boolean }) => a.isDemoSeed === true);
      const isOwner = appts.some((a: { visitorId: string | null }) => a.visitorId === session.visitorId);

      if (isSeed || !isOwner) {
        return NextResponse.json(
          {
            error:
              'Shared sample customer records are protected in public demo mode. You can only modify customers created in your own demo session.',
          },
          { status: 403 }
        );
      }
    }

    const [updated] = await db
      .update(schema.customers)
      .set({
        firstName,
        lastName,
        phone,
        email: email || null,
        notes: notes || null,
        updatedAt: new Date(),
      })
      .where(eq(schema.customers.id, id))
      .returning();

    return NextResponse.json({ success: true, customer: updated });
  } catch (error: any) {
    console.error('Update customer error:', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}
