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
                  <strong className="font-semibold">Veltwo Showcase Mode:</strong> You are exploring the management portal with safe demo permissions. You can view reports, schedules, and test appointment status updates.
                </span>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                Visitor: {session.visitorId.slice(0, 12)}
              </span>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
