import React from 'react';
import { requireAdminSession } from '@/lib/auth/admin-auth';
import { AdminNav } from '@/components/admin/admin-nav';

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
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
          {children}
        </div>
      </main>
    </div>
  );
}
