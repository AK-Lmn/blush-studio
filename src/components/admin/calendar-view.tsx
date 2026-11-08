'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatDuration } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
} from 'lucide-react';

interface CalendarAppointment {
  id: string;
  referenceNumber: string;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string;
  customerFirstName: string;
  customerLastName: string;
  serviceName: string;
  staffFirstName: string;
  staffLastName: string;
  priceCentavos: number;
}

export function CalendarView({
  appointments,
}: {
  appointments: CalendarAppointment[];
}) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  // Navigate Date
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'day') {
      next.setDate(next.getDate() - 1);
    } else {
      next.setDate(next.getDate() - 7);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'day') {
      next.setDate(next.getDate() + 1);
    } else {
      next.setDate(next.getDate() + 7);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Manila date string for current view
  const currentDateStr = currentDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

  // Filter appointments for Day View
  const dayAppointments = appointments.filter((appt) => {
    const apptDateStr = new Date(appt.startTime).toLocaleDateString('en-CA', {
      timeZone: 'Asia/Manila',
    });
    return apptDateStr === currentDateStr;
  });

  // Calculate Week Dates
  const weekStart = new Date(currentDate);
  const dayIndex = weekStart.getDay(); // 0 is Sun
  const diffToMonday = dayIndex === 0 ? -6 : 1 - dayIndex;
  weekStart.setDate(weekStart.getDate() + diffToMonday);

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dateNum = d.getDate();
    return { date: d, dateStr, dayLabel, dateNum };
  });

  // Hours array from 9:00 to 20:00 (9 AM to 8 PM)
  const hours = Array.from({ length: 12 }).map((_, i) => i + 9);

  return (
    <div className="space-y-6">
      {/* Calendar Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={handlePrev}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNext}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <span className="font-serif font-semibold text-base sm:text-lg text-foreground ml-2">
            {viewMode === 'day'
              ? currentDate.toLocaleDateString('en-US', {
                  timeZone: 'Asia/Manila',
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
              : `Week of ${weekStart.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}`}
          </span>
        </div>

        {/* View Toggle */}
        <div className="flex items-center rounded-lg border border-border p-0.5 bg-secondary/50">
          <button
            onClick={() => setViewMode('day')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              viewMode === 'day' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
            }`}
          >
            Day View
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              viewMode === 'week' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
            }`}
          >
            Week View
          </button>
        </div>
      </div>

      {/* ─── DAY VIEW ───────────────────────────────────────────────── */}
      {viewMode === 'day' && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border bg-secondary/20 flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Time (Asia/Manila)</span>
            <span>{dayAppointments.length} Appointments on this day</span>
          </div>

          <div className="divide-y divide-border">
            {hours.map((hour) => {
              const hourStr = `${String(hour).padStart(2, '0')}:00`;
              const hourAppointments = dayAppointments.filter((a) => {
                const apptHour = new Date(a.startTime).toLocaleTimeString('en-US', {
                  timeZone: 'Asia/Manila',
                  hour12: false,
                  hour: '2-digit',
                });
                return parseInt(apptHour, 10) === hour;
              });

              return (
                <div key={hour} className="flex min-h-[75px] group hover:bg-secondary/10">
                  <div className="w-20 sm:w-28 p-3 border-r border-border text-xs text-muted-foreground font-mono shrink-0">
                    {hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`}
                  </div>

                  <div className="flex-1 p-2 flex flex-wrap gap-2 items-center">
                    {hourAppointments.map((appt) => {
                      const timeStr = new Date(appt.startTime).toLocaleTimeString('en-US', {
                        timeZone: 'Asia/Manila',
                        hour: 'numeric',
                        minute: '2-digit',
                      });

                      return (
                        <div
                          key={appt.id}
                          className="bg-secondary/80 border border-border hover:border-rose rounded-lg p-2.5 text-xs space-y-1 shadow-xs max-w-xs transition-all"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-foreground truncate">
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
                              className="text-[9px] py-0 px-1.5"
                            >
                              {appt.status}
                            </Badge>
                          </div>
                          <div className="text-muted-foreground flex items-center justify-between gap-3 text-[11px]">
                            <span>
                              {appt.customerFirstName} {appt.customerLastName}
                            </span>
                            <span className="font-medium text-foreground">{timeStr}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Stylist: {appt.staffFirstName} {appt.staffLastName}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── WEEK VIEW ──────────────────────────────────────────────── */}
      {viewMode === 'week' && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border text-center text-xs divide-x divide-border bg-secondary/30">
            {weekDays.map((d) => {
              const isToday =
                d.dateStr ===
                new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
              return (
                <div key={d.dateStr} className={`py-3 px-2 ${isToday ? 'bg-accent/30 font-bold' : ''}`}>
                  <div className="text-muted-foreground uppercase text-[10px] tracking-wider">
                    {d.dayLabel}
                  </div>
                  <div className="font-serif text-base text-foreground mt-0.5">
                    {d.dateNum}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-7 divide-x divide-border min-h-[400px]">
            {weekDays.map((d) => {
              const apptsOnDay = appointments.filter((a) => {
                const apptDateStr = new Date(a.startTime).toLocaleDateString('en-CA', {
                  timeZone: 'Asia/Manila',
                });
                return apptDateStr === d.dateStr;
              });

              return (
                <div key={d.dateStr} className="p-2 space-y-2">
                  {apptsOnDay.map((appt) => {
                    const timeStr = new Date(appt.startTime).toLocaleTimeString('en-US', {
                      timeZone: 'Asia/Manila',
                      hour: 'numeric',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={appt.id}
                        className="p-2 rounded-md bg-secondary/70 border border-border text-[11px] space-y-0.5 hover:border-rose/60 transition-colors"
                      >
                        <div className="font-semibold text-foreground truncate">
                          {appt.serviceName}
                        </div>
                        <div className="text-muted-foreground text-[10px]">
                          {timeStr} • {appt.staffFirstName}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {appt.customerFirstName}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
