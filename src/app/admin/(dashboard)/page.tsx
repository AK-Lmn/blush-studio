import React from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq, desc, gte, lt, sql, and, ne } from 'drizzle-orm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPrice, formatDuration, formatPhoneNumber } from '@/lib/utils';
import {
  CalendarCheck2,
  Clock,
  TrendingUp,
  AlertCircle,
  Users,
  CheckCircle,
  XCircle,
  ArrowRight,
  Plus,
} from 'lucide-react';


import { requireAdminSession, getAppointmentScopeCondition } from '@/lib/auth/admin-auth';

export default async function AdminDashboardOverview() {
  const session = await requireAdminSession();
  const scopeCondition = getAppointmentScopeCondition(session);

  // 1. Calculate Today's Range in Manila Time (UTC+8)
  const now = new Date();
  const manilaDateString = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }); // YYYY-MM-DD
  const todayStart = new Date(`${manilaDateString}T00:00:00+08:00`);
  const todayEnd = new Date(`${manilaDateString}T23:59:59+08:00`);

  // 2. Fetch scoped appointments to compute metrics accurately
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
      createdAt: schema.appointments.createdAt,
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

  const allAppointments = scopeCondition
    ? await query.where(scopeCondition).orderBy(desc(schema.appointments.createdAt))
    : await query.orderBy(desc(schema.appointments.createdAt));

  // Compute metrics
  const totalAppointments = allAppointments.length;
  const todayAppointments = allAppointments.filter(
    (a: any) => new Date(a.startTime) >= todayStart && new Date(a.startTime) <= todayEnd
  ).length;

  const pendingCount = allAppointments.filter((a: any) => a.status === 'pending').length;
  const confirmedCount = allAppointments.filter((a: any) => a.status === 'confirmed').length;
  const completedCount = allAppointments.filter((a: any) => a.status === 'completed').length;
  const cancelledCount = allAppointments.filter((a: any) => a.status === 'cancelled').length;

  const estimatedRevenueCentavos = allAppointments
    .filter((a: any) => a.status === 'completed' || a.paymentStatus === 'paid')
    .reduce((sum: number, a: any) => sum + a.priceCentavos, 0);

  const recentBookings = allAppointments.slice(0, 5);

  const upcomingAppointments = allAppointments
    .filter((a: any) => new Date(a.startTime) >= now && a.status !== 'cancelled')
    .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground tracking-tight">
            Studio Dashboard Overview
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Live business activity, client appointments, and service revenue.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="blush" size="sm" asChild>
            <Link href="/admin/appointments?action=new" className="flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              <span>Record Walk-In / Booking</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Today's Appointments */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Today's Schedule</span>
            <Clock className="w-4 h-4 text-rose" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-foreground">
            {todayAppointments}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Appointments scheduled for today
          </p>
        </div>

        {/* Pending Requests */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Pending Review</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-foreground">
            {pendingCount}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Awaiting studio confirmation
          </p>
        </div>

        {/* Completed Visits */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Completed Visits</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-foreground">
            {completedCount}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Total satisfied sessions
          </p>
        </div>

        {/* Estimated Revenue */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Realized Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-foreground">
            {formatPrice(estimatedRevenueCentavos)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            From paid & completed visits
          </p>
        </div>
      </div>

      {/* Two Column Layout: Upcoming Schedule & Recent Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Upcoming Appointments */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-foreground">
              Upcoming Appointments
            </h2>
            <Link
              href="/admin/appointments"
              className="text-xs text-rose hover:underline font-medium flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-card rounded-xl border border-border divide-y divide-border overflow-hidden">
            {upcomingAppointments.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No upcoming appointments.
              </div>
            ) : (
              upcomingAppointments.map((appt: any) => {
                const dateStr = new Date(appt.startTime).toLocaleDateString('en-US', {
                  timeZone: 'Asia/Manila',
                  month: 'short',
                  day: 'numeric',
                });
                const timeStr = new Date(appt.startTime).toLocaleTimeString('en-US', {
                  timeZone: 'Asia/Manila',
                  hour: 'numeric',
                  minute: '2-digit',
                });

                return (
                  <div key={appt.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-medium text-sm text-foreground">
                          {appt.serviceName}
                        </span>
                        <Badge
                          variant={
                            appt.status === 'confirmed'
                              ? 'success'
                              : appt.status === 'in_progress'
                              ? 'info'
                              : 'blush'
                          }
                          className="text-[10px]"
                        >
                          {appt.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {appt.customerFirstName} {appt.customerLastName} • Stylist: {appt.staffFirstName}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-semibold text-foreground">
                        {dateStr} at {timeStr}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {appt.referenceNumber}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Recent Activity / Bookings */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-foreground">
              Recent Bookings
            </h2>
            <Link
              href="/admin/calendar"
              className="text-xs text-rose hover:underline font-medium flex items-center gap-1"
            >
              <span>Studio Calendar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-card rounded-xl border border-border divide-y divide-border overflow-hidden">
            {recentBookings.map((b: any) => (
              <div key={b.id} className="p-4 flex items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="font-medium text-foreground">
                    {b.customerFirstName} {b.customerLastName}
                  </div>
                  <div className="text-muted-foreground">
                    {b.serviceName} • {formatPrice(b.priceCentavos)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-muted-foreground block">
                    {b.paymentMethod || 'Cash'}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-bold ${
                      b.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {b.paymentStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
