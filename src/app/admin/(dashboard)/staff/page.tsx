import React from 'react';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { asc } from 'drizzle-orm';
import { StaffManager } from '@/components/admin/staff-manager';


export default async function AdminStaffPage() {
  const staffMembers = await db
    .select({
      id: schema.staff.id,
      firstName: schema.staff.firstName,
      lastName: schema.staff.lastName,
      email: schema.staff.email,
      phone: schema.staff.phone,
      bio: schema.staff.bio,
      isActive: schema.staff.isActive,
    })
    .from(schema.staff)
    .orderBy(asc(schema.staff.firstName));

  // Count assigned services
  const staffServicesList = await db.select().from(schema.staffServices);

  const staffWithCounts = staffMembers.map((st: any) => ({
    ...st,
    assignedServicesCount: staffServicesList.filter((s: any) => s.staffId === st.id).length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground tracking-tight">
          Staff & Stylists
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Manage technician profiles, availability, and service assignment eligibility.
        </p>
      </div>

      <StaffManager initialStaff={staffWithCounts} />
    </div>
  );
}
