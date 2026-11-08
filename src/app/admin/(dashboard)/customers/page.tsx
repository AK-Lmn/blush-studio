import React from 'react';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { desc, count, sql, eq } from 'drizzle-orm';
import { CustomerTable } from '@/components/admin/customer-table';


export default async function AdminCustomersPage() {
  const customerList = await db
    .select({
      id: schema.customers.id,
      firstName: schema.customers.firstName,
      lastName: schema.customers.lastName,
      email: schema.customers.email,
      phone: schema.customers.phone,
      notes: schema.customers.notes,
    })
    .from(schema.customers)
    .orderBy(desc(schema.customers.createdAt));

  // Get appointment count for each customer
  const appointments = await db
    .select({
      customerId: schema.appointments.customerId,
      startTime: schema.appointments.startTime,
    })
    .from(schema.appointments);

  const customersWithCounts = customerList.map((c: any) => {
    const custAppts = appointments.filter((a: any) => a.customerId === c.id);
    return {
      ...c,
      appointmentCount: custAppts.length,
      lastVisit: custAppts[0]?.startTime ? custAppts[0].startTime.toISOString() : null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground tracking-tight">
          Client Records
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          View client visit frequencies, contact information, and styling preferences.
        </p>
      </div>

      <CustomerTable initialCustomers={customersWithCounts} />
    </div>
  );
}
