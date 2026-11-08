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
    const body = await request.json();
    const {
      businessName,
      tagline,
      address,
      phone,
      email,
      messengerUrl,
      instagramUrl,
      bookingIntervalMinutes,
      minAdvanceBookingHours,
      maxAdvanceBookingDays,
      bufferMinutes,
      paymentInstructions,
    } = body;

    const [first] = await db.select().from(schema.businessSettings).limit(1);

    if (first) {
      const [updated] = await db
        .update(schema.businessSettings)
        .set({
          businessName,
          tagline,
          address,
          phone,
          email,
          messengerUrl,
          instagramUrl,
          bookingIntervalMinutes: parseInt(bookingIntervalMinutes, 10),
          minAdvanceBookingHours: parseInt(minAdvanceBookingHours, 10),
          maxAdvanceBookingDays: parseInt(maxAdvanceBookingDays, 10),
          bufferMinutes: parseInt(bufferMinutes, 10),
          paymentInstructions,
          updatedAt: new Date(),
        })
        .where(eq(schema.businessSettings.id, first.id))
        .returning();

      return NextResponse.json({ success: true, settings: updated });
    } else {
      const [created] = await db
        .insert(schema.businessSettings)
        .values({
          businessName,
          tagline,
          address,
          phone,
          email,
          messengerUrl,
          instagramUrl,
          bookingIntervalMinutes: parseInt(bookingIntervalMinutes, 10),
          minAdvanceBookingHours: parseInt(minAdvanceBookingHours, 10),
          maxAdvanceBookingDays: parseInt(maxAdvanceBookingDays, 10),
          bufferMinutes: parseInt(bufferMinutes, 10),
          paymentInstructions,
        })
        .returning();

      return NextResponse.json({ success: true, settings: created });
    }
  } catch (error: any) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
