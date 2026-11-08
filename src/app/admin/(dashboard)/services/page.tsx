import React from 'react';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';
import { ServiceManager } from '@/components/admin/service-manager';


export default async function AdminServicesPage() {
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
      name: schema.services.name,
      description: schema.services.description,
      categoryId: schema.services.categoryId,
      categoryName: schema.serviceCategories.name,
      priceCentavos: schema.services.priceCentavos,
      durationMinutes: schema.services.durationMinutes,
      isActive: schema.services.isActive,
    })
    .from(schema.services)
    .innerJoin(
      schema.serviceCategories,
      eq(schema.services.categoryId, schema.serviceCategories.id)
    )
    .orderBy(asc(schema.services.sortOrder));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground tracking-tight">
          Services & Pricing
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Manage treatment descriptions, durations, and pricing in Philippine Pesos.
        </p>
      </div>

      <ServiceManager initialServices={services} categories={categories} />
    </div>
  );
}
