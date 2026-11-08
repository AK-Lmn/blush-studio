import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin-auth';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function checkAuth() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function POST(request: NextRequest) {
  const authErr = await checkAuth();
  if (authErr) return authErr;

  try {
    const { firstName, lastName, email, phone, bio, isActive } = await request.json();

    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'First and last name are required' }, { status: 400 });
    }

    const [created] = await db
      .insert(schema.staff)
      .values({
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        bio: bio || null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      })
      .returning();

    // Default schedules for new staff (Mon-Sat 9AM-6PM)
    const workDays: (typeof schema.dayOfWeekEnum.enumValues)[number][] = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];

    for (const day of workDays) {
      await db.insert(schema.staffSchedules).values({
        staffId: created.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '18:00',
        isActive: true,
      });
    }

    return NextResponse.json({ success: true, staff: created }, { status: 201 });
  } catch (error: any) {
    console.error('Create staff error:', error);
    return NextResponse.json({ error: 'Failed to create staff' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authErr = await checkAuth();
  if (authErr) return authErr;

  try {
    const { id, firstName, lastName, email, phone, bio, isActive } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Staff ID required' }, { status: 400 });
    }

    const updates: any = { updatedAt: new Date() };
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (email !== undefined) updates.email = email || null;
    if (phone !== undefined) updates.phone = phone || null;
    if (bio !== undefined) updates.bio = bio || null;
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    const [updated] = await db
      .update(schema.staff)
      .set(updates)
      .where(eq(schema.staff.id, id))
      .returning();

    return NextResponse.json({ success: true, staff: updated });
  } catch (error: any) {
    console.error('Update staff error:', error);
    return NextResponse.json({ error: 'Failed to update staff' }, { status: 500 });
  }
}
