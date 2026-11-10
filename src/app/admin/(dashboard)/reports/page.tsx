import React from 'react';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq, or } from 'drizzle-orm';
import { ReportCharts } from '@/components/admin/report-charts';
import { formatPrice } from '@/lib/utils';
import { calculateRevenueMetrics } from '@/lib/revenue';
import { requireAdminSession, getAppointmentScopeCondition } from '@/lib/auth/admin-auth';

export default async function AdminReportsPage() {
  const session = await requireAdminSession();
  const scopeCondition = getAppointmentScopeCondition(session);

  let query = db
    .select({
      id: schema.appointments.id,
      priceCentavos: schema.appointments.priceCentavos,
      status: schema.appointments.status,
      paymentStatus: schema.appointments.paymentStatus,
      serviceId: schema.appointments.serviceId,
      categoryId: schema.services.categoryId,
      categoryName: schema.serviceCategories.name,
    })
    .from(schema.appointments)
    .innerJoin(schema.services, eq(schema.appointments.serviceId, schema.services.id))
    .innerJoin(
      schema.serviceCategories,
      eq(schema.services.categoryId, schema.serviceCategories.id)
    );

  const appointments = scopeCondition
    ? await query.where(scopeCondition)
    : await query;

  // Group paid revenue by category (exclude cancelled and unpaid)
  const categoryMap = new Map<string, { revenue: number; count: number }>();
  for (const appt of appointments) {
    const existing = categoryMap.get(appt.categoryName) || { revenue: 0, count: 0 };
    if (appt.paymentStatus === 'paid' && appt.status !== 'cancelled') {
      existing.revenue += appt.priceCentavos / 100;
    }
    existing.count += 1;
    categoryMap.set(appt.categoryName, existing);
  }

  const categoryData = Array.from(categoryMap.entries()).map(([name, data]) => ({
    name,
    revenue: Math.round(data.revenue),
    count: data.count,
  }));

  // Group by status
  const statusMap = new Map<string, number>();
  for (const appt of appointments) {
    const s = appt.status.replace('_', ' ');
    statusMap.set(s, (statusMap.get(s) || 0) + 1);
  }

  const statusData = Array.from(statusMap.entries()).map(([name, count]) => ({
    name,
    count,
  }));

  const {
    paidRevenueCentavos,
    paidCount,
    unpaidTotalCentavos,
    unpaidCount,
  } = calculateRevenueMetrics(appointments);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground tracking-tight">
          Reports &amp; Business Insights
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Real database analytics tracking paid service category revenue and unpaid bookings separately.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-6 flex items-center justify-between gap-4">
          <div>
            <span className="text-xs text-muted-foreground block font-medium">
              Collected Revenue (Paid Only)
            </span>
            <span className="text-3xl font-serif font-bold text-foreground">
              {formatPrice(paidRevenueCentavos)}
            </span>
          </div>
          <div className="text-xs text-muted-foreground text-right">
            <div>{paidCount} paid {paidCount === 1 ? 'appointment' : 'appointments'}</div>
            <div className="text-[11px]">Across {appointments.length} total bookings</div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 flex items-center justify-between gap-4">
          <div>
            <span className="text-xs text-muted-foreground block font-medium">
              Unpaid Bookings (Pending Settlement)
            </span>
            <span className="text-3xl font-serif font-bold text-amber-700">
              {formatPrice(unpaidTotalCentavos)}
            </span>
          </div>
          <div className="text-xs text-muted-foreground text-right">
            <div>{unpaidCount} unpaid {unpaidCount === 1 ? 'booking' : 'bookings'}</div>
            <div className="text-[11px]">Excluded from realized revenue</div>
          </div>
        </div>
      </div>

      <ReportCharts categoryData={categoryData} statusData={statusData} />
    </div>
  );
}
