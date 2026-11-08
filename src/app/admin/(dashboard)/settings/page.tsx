import React from 'react';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { SettingsForm } from '@/components/admin/settings-form';


export default async function AdminSettingsPage() {
  const [settings] = await db.select().from(schema.businessSettings).limit(1);

  const defaultSettings = {
    businessName: 'Blush Studio',
    tagline: 'Refined Beauty & Self-Care Sanctuary',
    address: 'Unit 302, The Bellagio Promenade, Bonifacio Global City, Taguig, Metro Manila',
    phone: '0917-888-2587',
    email: 'hello@blushstudio.demo',
    messengerUrl: 'https://m.me/blushstudio.ph.demo',
    instagramUrl: 'https://instagram.com/blushstudio.ph.demo',
    bookingIntervalMinutes: 30,
    minAdvanceBookingHours: 2,
    maxAdvanceBookingDays: 30,
    bufferMinutes: 10,
    paymentInstructions: 'Demo environment: Simulated payment workflow.',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground tracking-tight">
          Studio Settings
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Configure business metadata, advance notice rules, booking intervals, and buffer times.
        </p>
      </div>

      <SettingsForm initialSettings={settings || defaultSettings} />
    </div>
  );
}
