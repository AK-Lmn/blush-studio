import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin-auth';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function checkPrivilegedAuth() {
  const session = await getAdminSession();
  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), session: null };
  }
  if (session.role !== 'admin') {
    return {
      error: NextResponse.json(
        { error: 'Demo Mode: Baseline service catalog is protected against public modification.' },
        { status: 403 }
      ),
      session,
    };
  }
  return { error: null, session };
}

export async function POST(request: NextRequest) {
  const { error: authErr } = await checkPrivilegedAuth();
  if (authErr) return authErr;

  try {
    const { name, description, categoryId, priceCentavos, durationMinutes, isActive } =
      await request.json();

    if (!name || !categoryId || !priceCentavos || !durationMinutes) {
      return NextResponse.json({ error: 'Missing required service fields' }, { status: 400 });
    }

    const [created] = await db
      .insert(schema.services)
      .values({
        name,
        description: description || null,
        categoryId,
        priceCentavos: parseInt(priceCentavos, 10),
        durationMinutes: parseInt(durationMinutes, 10),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      })
      .returning();

    return NextResponse.json({ success: true, service: created }, { status: 201 });
  } catch (error: any) {
    console.error('Create service error:', error);
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { error: authErr } = await checkPrivilegedAuth();
  if (authErr) return authErr;

  try {
    const { id, name, description, categoryId, priceCentavos, durationMinutes, isActive } =
      await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Service ID required' }, { status: 400 });
    }

    const updates: any = { updatedAt: new Date() };
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (categoryId) updates.categoryId = categoryId;
    if (priceCentavos !== undefined) updates.priceCentavos = parseInt(priceCentavos, 10);
    if (durationMinutes !== undefined) updates.durationMinutes = parseInt(durationMinutes, 10);
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    const [updated] = await db
      .update(schema.services)
      .set(updates)
      .where(eq(schema.services.id, id))
      .returning();

    return NextResponse.json({ success: true, service: updated });
  } catch (error: any) {
    console.error('Update service error:', error);
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 });
  }
}
