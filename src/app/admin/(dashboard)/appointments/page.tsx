import React from 'react';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq, desc, asc, or } from 'drizzle-orm';
import { AppointmentTable } from '@/components/admin/appointment-table';
import { requireAdminSession, getAppointmentScopeCondition } from '@/lib/auth/admin-auth';

export default async function AdminAppointmentsPage() {
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
      paymentMethod: schema.appointments.paymentMethod,
      priceCentavos: schema.appointments.priceCentavos,
      customerNotes: schema.appointments.customerNotes,
      adminNotes: schema.appointments.adminNotes,
      isWalkIn: schema.appointments.isWalkIn,
      visitorId: schema.appointments.visitorId,
      isDemoSeed: schema.appointments.isDemoSeed,
      customerFirstName: schema.customers.firstName,
      customerLastName: schema.customers.lastName,
      customerPhone: schema.customers.phone,
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

  const services = await db
    .select({
      id: schema.services.id,
      name: schema.services.name,
      priceCentavos: schema.services.priceCentavos,
      durationMinutes: schema.services.durationMinutes,
    })
    .from(schema.services)
    .where(eq(schema.services.isActive, true))
    .orderBy(asc(schema.services.sortOrder));

  const staffList = await db
    .select({
      id: schema.staff.id,
      firstName: schema.staff.firstName,
      lastName: schema.staff.lastName,
    })
    .from(schema.staff)
    .where(eq(schema.staff.isActive, true));

  const serializedAppointments = appointments.map((a: any) => ({
    ...a,
    startTime: a.startTime.toISOString(),
    endTime: a.endTime.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground tracking-tight">
          Appointment Management
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          View, confirm, reschedule, and update payment statuses for all client appointments.
        </p>
      </div>

      <AppointmentTable
        initialAppointments={serializedAppointments as any}
        services={services}
        staffList={staffList}
      />
    </div>
  );
}
