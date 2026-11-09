import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPrice, formatDuration } from '@/lib/utils';
import { Calendar, Clock, MapPin, User, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { cookies } from 'next/headers';
import { VISITOR_COOKIE_NAME } from '@/lib/auth/admin-auth';

function maskPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return '••••••••';
  const start = digits.slice(0, 4);
  const end = digits.slice(-2);
  return `${start} ••• ••${end}`;
}

function maskLastName(lastName: string): string {
  if (!lastName) return '';
  return `${lastName.charAt(0).toUpperCase()}.`;
}

export default async function BookingLookupPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  await connection();
  const { reference } = await params;

  if (!reference || typeof reference !== 'string' || reference.trim().length < 5) {
    notFound();
  }

  const cookieStore = await cookies();
  const currentVisitorId = cookieStore.get(VISITOR_COOKIE_NAME)?.value;

  const [appointment] = await db
    .select({
      id: schema.appointments.id,
      referenceNumber: schema.appointments.referenceNumber,
      startTime: schema.appointments.startTime,
      endTime: schema.appointments.endTime,
      status: schema.appointments.status,
      paymentStatus: schema.appointments.paymentStatus,
      paymentMethod: schema.appointments.paymentMethod,
      priceCentavos: schema.appointments.priceCentavos,
      visitorId: schema.appointments.visitorId,
      isDemoSeed: schema.appointments.isDemoSeed,
      customerFirstName: schema.customers.firstName,
      customerLastName: schema.customers.lastName,
      customerPhone: schema.customers.phone,
      serviceName: schema.services.name,
      durationMinutes: schema.services.durationMinutes,
      staffFirstName: schema.staff.firstName,
      staffLastName: schema.staff.lastName,
    })
    .from(schema.appointments)
    .innerJoin(schema.customers, eq(schema.appointments.customerId, schema.customers.id))
    .innerJoin(schema.services, eq(schema.appointments.serviceId, schema.services.id))
    .innerJoin(schema.staff, eq(schema.appointments.staffId, schema.staff.id))
    .where(eq(schema.appointments.referenceNumber, reference.trim()))
    .limit(1);

  if (!appointment) {
    notFound();
  }

  // Privacy verification: If this appointment belongs to a specific visitor, only that visitor can view it
  if (appointment.visitorId && appointment.visitorId !== currentVisitorId) {
    notFound();
  }

  const manilaDateStr = new Date(appointment.startTime).toLocaleDateString('en-US', {
    timeZone: 'Asia/Manila',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const manilaStartTime = new Date(appointment.startTime).toLocaleTimeString('en-US', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
  });

  const manilaEndTime = new Date(appointment.endTime).toLocaleTimeString('en-US', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/" className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Studio Home</span>
          </Link>
        </Button>
        <span className="text-xs text-muted-foreground font-mono">
          Ref: {appointment.referenceNumber}
        </span>
      </div>

      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-6">
          <div>
            <span className="text-xs text-rose uppercase tracking-wider font-semibold block mb-1">
              Demonstration Reservation
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground">
              {appointment.serviceName}
            </h1>
          </div>
          <Badge
            variant={
              appointment.status === 'confirmed'
                ? 'success'
                : appointment.status === 'in_progress'
                ? 'info'
                : appointment.status === 'completed'
                ? 'default'
                : appointment.status === 'cancelled'
                ? 'destructive'
                : 'blush'
            }
          >
            {appointment.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
          <div className="space-y-1">
            <span className="text-muted-foreground block font-medium">Stylist</span>
            <span className="text-sm font-semibold text-foreground">
              {appointment.staffFirstName} {appointment.staffLastName}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground block font-medium">Schedule (Manila Time)</span>
            <span className="text-sm font-semibold text-foreground">
              {manilaDateStr}
            </span>
            <span className="text-muted-foreground block">
              {manilaStartTime} to {manilaEndTime} ({formatDuration(appointment.durationMinutes)})
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground block font-medium">Client (Masked for Privacy)</span>
            <span className="text-sm font-semibold text-foreground">
              {appointment.customerFirstName} {maskLastName(appointment.customerLastName)}
            </span>
            <span className="text-muted-foreground block font-mono">
              {maskPhoneNumber(appointment.customerPhone)}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground block font-medium">Simulated Rate</span>
            <span className="text-lg font-serif font-bold text-foreground">
              {formatPrice(appointment.priceCentavos)}
            </span>
            <span className="text-muted-foreground block capitalize">
              Payment preference: {appointment.paymentStatus} ({appointment.paymentMethod || 'Cash'})
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-secondary/50 border border-border text-xs text-muted-foreground space-y-1.5">
          <div className="flex items-center gap-1.5 text-foreground font-semibold">
            <CheckCircle2 className="w-4 h-4 text-rose shrink-0" />
            <span>Interactive Portfolio Demo</span>
          </div>
          <p>
            This booking is registered in the live Neon database and visible in the{' '}
            <Link href="/admin/appointments" className="text-rose font-medium hover:underline">
              Management Portal
            </Link>. No actual salon services will be rendered.
          </p>
        </div>

        <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground">
            Location: Unit 302, The Bellagio Promenade, BGC
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link href="/services">
                View Menu
              </Link>
            </Button>
            <Button variant="blush" size="sm" asChild>
              <Link href="/book">
                Book Another Service
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
