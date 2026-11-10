import React from 'react';
import { requireAdminSession } from '@/lib/auth/admin-auth';
import { AdminNav } from '@/components/admin/admin-nav';
import { Sparkles } from 'lucide-react';

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdminSession();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#FAF6F3] text-foreground">
      {/* Sidebar Navigation */}
      <AdminNav adminUser={session} />

      {/* Main Admin Content */}
      <main className="flex-1 overflow-y-auto min-h-screen">
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
          {session.role === 'demo_manager' && (
            <div className="p-3.5 rounded-xl bg-accent/40 border border-border text-xs text-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-rose shrink-0" />
                <span>
                  <strong className="font-semibold">Veltwo Showcase Mode:</strong> Any appointment you booked on the website appears live in <strong className="font-semibold">Appointments</strong> &amp; <strong className="font-semibold">Calendar</strong> — test confirming bookings or marking payments as Paid.
                </span>
              </div>
              <a
                href="https://www.facebook.com/veltwo/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-rose hover:underline shrink-0"
              >
                Want a custom system? Veltwo Studio →
              </a>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
