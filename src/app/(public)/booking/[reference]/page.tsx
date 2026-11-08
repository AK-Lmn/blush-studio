import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPrice, formatDuration, formatPhoneNumber } from '@/lib/utils';
import { Calendar, Clock, MapPin, User, MessageCircle, ArrowLeft } from 'lucide-react';


export default async function BookingLookupPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  await connection();
  const { reference } = await params;

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
      customerNotes: schema.appointments.customerNotes,
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
    .where(eq(schema.appointments.referenceNumber, reference))
    .limit(1);

  if (!appointment) {
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

      <div className="bg-card rounded-2xl border border-border p-8 space-y-6 shadow-xs">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-6">
          <div>
            <span className="text-xs text-rose uppercase tracking-wider font-semibold block mb-1">
              Confirmed Appointment
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
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
              {manilaStartTime} – {manilaEndTime} ({formatDuration(appointment.durationMinutes)})
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground block font-medium">Client Name</span>
            <span className="text-sm font-semibold text-foreground">
              {appointment.customerFirstName} {appointment.customerLastName}
            </span>
            <span className="text-muted-foreground block">
              {formatPhoneNumber(appointment.customerPhone)}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground block font-medium">Estimated Total</span>
            <span className="text-lg font-serif font-bold text-foreground">
              {formatPrice(appointment.priceCentavos)}
            </span>
            <span className="text-muted-foreground block capitalize">
              Payment: {appointment.paymentStatus} ({appointment.paymentMethod || 'Cash'})
            </span>
          </div>
        </div>

        {appointment.customerNotes && (
          <div className="p-3 rounded-lg bg-secondary/50 border border-border text-xs text-muted-foreground">
            <strong className="text-foreground">Client Notes:</strong> {appointment.customerNotes}
          </div>
        )}

        <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground">
            Location: Unit 302, The Bellagio Promenade, BGC
          </div>
          <Button variant="outline" size="sm" asChild>
            <a
              href={`https://m.me/blushstudio.ph.demo?text=Hi!%20Checking%20in%20for%20my%20appointment%20${appointment.referenceNumber}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5"
            >
              <MessageCircle className="w-3.5 h-3.5 text-rose" />
              <span>Contact Reception</span>
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
