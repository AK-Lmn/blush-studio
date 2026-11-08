'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Save, Check } from 'lucide-react';

interface SettingsData {
  businessName: string;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  messengerUrl: string | null;
  instagramUrl: string | null;
  bookingIntervalMinutes: number;
  minAdvanceBookingHours: number;
  maxAdvanceBookingDays: number;
  bufferMinutes: number;
  paymentInstructions: string | null;
}

export function SettingsForm({ initialSettings }: { initialSettings: SettingsData }) {
  const [form, setForm] = useState<SettingsData>(initialSettings);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error('Failed to update settings');

      toast.success('Studio configuration saved to database');
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      {/* Brand & Contact */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-serif text-base font-semibold text-foreground border-b border-border pb-3">
          Studio Profile & Contact Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-foreground">Studio Name *</label>
            <Input
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-foreground">Tagline</label>
            <Input
              value={form.tagline || ''}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="font-semibold text-foreground">Physical Address</label>
            <Input
              value={form.address || ''}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-foreground">Phone Number</label>
            <Input
              value={form.phone || ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-foreground">Email</label>
            <Input
              type="email"
              value={form.email || ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-foreground">Messenger URL</label>
            <Input
              value={form.messengerUrl || ''}
              onChange={(e) => setForm({ ...form, messengerUrl: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-foreground">Instagram URL</label>
            <Input
              value={form.instagramUrl || ''}
              onChange={(e) => setForm({ ...form, instagramUrl: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Booking Rules */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-serif text-base font-semibold text-foreground border-b border-border pb-3">
          Booking Engine & Scheduling Rules
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-foreground">
              Booking Slot Interval (Minutes)
            </label>
            <Input
              type="number"
              value={form.bookingIntervalMinutes}
              onChange={(e) =>
                setForm({ ...form, bookingIntervalMinutes: parseInt(e.target.value, 10) })
              }
              min={15}
              max={120}
              required
            />
            <span className="text-[11px] text-muted-foreground">
              Granularity of available slot start times
            </span>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-foreground">
              Appointment Buffer (Minutes)
            </label>
            <Input
              type="number"
              value={form.bufferMinutes}
              onChange={(e) =>
                setForm({ ...form, bufferMinutes: parseInt(e.target.value, 10) })
              }
              min={0}
              max={60}
              required
            />
            <span className="text-[11px] text-muted-foreground">
              Sanitization and turnover buffer between appointments
            </span>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-foreground">
              Minimum Advance Notice (Hours)
            </label>
            <Input
              type="number"
              value={form.minAdvanceBookingHours}
              onChange={(e) =>
                setForm({ ...form, minAdvanceBookingHours: parseInt(e.target.value, 10) })
              }
              min={0}
              max={72}
              required
            />
            <span className="text-[11px] text-muted-foreground">
              Prevents last-minute bookings without stylist prep
            </span>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-foreground">
              Maximum Advance Window (Days)
            </label>
            <Input
              type="number"
              value={form.maxAdvanceBookingDays}
              onChange={(e) =>
                setForm({ ...form, maxAdvanceBookingDays: parseInt(e.target.value, 10) })
              }
              min={1}
              max={90}
              required
            />
            <span className="text-[11px] text-muted-foreground">
              How far in advance clients can reserve slots
            </span>
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="font-semibold text-foreground">
              Demo Payment Instructions / Notes
            </label>
            <Textarea
              value={form.paymentInstructions || ''}
              onChange={(e) => setForm({ ...form, paymentInstructions: e.target.value })}
              rows={3}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="blush" type="submit" disabled={saving} className="px-6">
          <Save className="w-4 h-4 mr-2" />
          <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
        </Button>
      </div>
    </form>
  );
}
