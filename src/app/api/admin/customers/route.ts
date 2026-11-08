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
