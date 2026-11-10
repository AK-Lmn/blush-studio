import React from 'react';
import { connection } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { BookingWizard } from '@/components/booking/booking-wizard';

export default async function BookPage() {
  await connection();
  const categories = await db
    .select({
      id: schema.serviceCategories.id,
      name: schema.serviceCategories.name,
    })
    .from(schema.serviceCategories)
    .where(eq(schema.serviceCategories.isActive, true))
    .orderBy(asc(schema.serviceCategories.sortOrder));

  const services = await db
    .select({
      id: schema.services.id,
      categoryId: schema.services.categoryId,
      name: schema.services.name,
      description: schema.services.description,
      priceCentavos: schema.services.priceCentavos,
      durationMinutes: schema.services.durationMinutes,
      imageUrl: schema.services.imageUrl,
      categoryName: schema.serviceCategories.name,
    })
    .from(schema.services)
    .innerJoin(
      schema.serviceCategories,
      eq(schema.services.categoryId, schema.serviceCategories.id)
    )
    .where(eq(schema.services.isActive, true))
    .orderBy(asc(schema.services.sortOrder));

  return (
    <div className="py-6">
      <BookingWizard
        initialServices={services as any}
        initialCategories={categories}
      />
    </div>
  );
}
