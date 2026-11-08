import React from 'react';
import { connection } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { BookingWizard } from '@/components/booking/booking-wizard';
import { FALLBACK_CATEGORIES, FALLBACK_SERVICES } from '@/lib/demo-data';

export default async function BookPage() {
  await connection();
  let categories = [];
  let services = [];

  try {
    categories = await db
      .select({
        id: schema.serviceCategories.id,
        name: schema.serviceCategories.name,
      })
      .from(schema.serviceCategories)
      .where(eq(schema.serviceCategories.isActive, true))
      .orderBy(asc(schema.serviceCategories.sortOrder));

    services = await db
      .select({
        id: schema.services.id,
        categoryId: schema.services.categoryId,
        name: schema.services.name,
        description: schema.services.description,
        priceCentavos: schema.services.priceCentavos,
        durationMinutes: schema.services.durationMinutes,
        categoryName: schema.serviceCategories.name,
      })
      .from(schema.services)
      .innerJoin(
        schema.serviceCategories,
        eq(schema.services.categoryId, schema.serviceCategories.id)
      )
      .where(eq(schema.services.isActive, true))
      .orderBy(asc(schema.services.sortOrder));
  } catch (err) {
    console.warn('Database query fallback on BookPage:', err);
  }

  if (!categories || categories.length === 0) {
    categories = FALLBACK_CATEGORIES.map((c) => ({ id: c.id, name: c.name }));
  }
  if (!services || services.length === 0) {
    services = FALLBACK_SERVICES;
  }

  return (
    <div className="py-6">
      <BookingWizard
        initialServices={services as any}
        initialCategories={categories}
      />
    </div>
  );
}
