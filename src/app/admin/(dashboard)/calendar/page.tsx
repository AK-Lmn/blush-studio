import React from 'react';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq, desc, or } from 'drizzle-orm';
import { CalendarView } from '@/components/admin/calendar-view';
import { requireAdminSession, getAppointmentScopeCondition } from '@/lib/auth/admin-auth';

export default async function AdminCalendarPage() {
  const session = await requireAdminSession();
  const scopeCondition = getAppointmentScopeCondition(session);

  let query = db
    .select({
      id: schema.appointments.id,
      referenceNumber: schema.appointments.referenceNumber,
      startTime: schema.appointments.startTime,
      endTime: schema.appointments.endTime,
      status: schema.appointments.status,
      paymentStatus: schema.appointments.paymentStatus,
      priceCentavos: schema.appointments.priceCentavos,
      customerFirstName: schema.customers.firstName,
      customerLastName: schema.customers.lastName,
      serviceName: schema.services.name,
      staffFirstName: schema.staff.firstName,
      staffLastName: schema.staff.lastName,
    })
    .from(schema.appointments)
    .innerJoin(schema.customers, eq(schema.appointments.customerId, schema.customers.id))
    .innerJoin(schema.services, eq(schema.appointments.serviceId, schema.services.id))
    .innerJoin(schema.staff, eq(schema.appointments.staffId, schema.staff.id));

  const appointments = scopeCondition
    ? await query.where(scopeCondition).orderBy(desc(schema.appointments.startTime))
    : await query.orderBy(desc(schema.appointments.startTime));

  const serialized = appointments.map((a: any) => ({
    ...a,
    startTime: a.startTime.toISOString(),
    endTime: a.endTime.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground tracking-tight">
          Studio Calendar
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          View appointment distribution, stylist availability, and daily booking density.
        </p>
      </div>

      <CalendarView appointments={serialized} />
    </div>
  );
}
