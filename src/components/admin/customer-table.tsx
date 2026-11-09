'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatPhoneNumber } from '@/lib/utils';
import { toast } from 'sonner';
import { Search, Edit3, X, UserCheck, Calendar } from 'lucide-react';

interface CustomerItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  notes: string | null;
  appointmentCount: number;
  lastVisit: string | null;
}

export function CustomerTable({
  initialCustomers,
}: {
  initialCustomers: CustomerItem[];
}) {
  const [customers, setCustomers] = useState<CustomerItem[]>(initialCustomers);
  const [search, setSearch] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = customers.filter(
    (c) =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    setSaving(true);
    try {
      const res = await fetch('/api/admin/customers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCustomer),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update client');
      }

      setCustomers((prev) =>
        prev.map((c) => (c.id === editingCustomer.id ? editingCustomer : c))
      );
      toast.success('Client profile updated');
      setEditingCustomer(null);
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          placeholder="Search by name, phone, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-xs"
        />
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-secondary/30 text-muted-foreground font-medium">
                <th className="py-3 px-4">Client Name</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Visit Frequency</th>
                <th className="py-3 px-4">Internal Notes</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No clients found.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-secondary/15 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      {c.firstName} {c.lastName}
                    </td>
                    <td className="py-3.5 px-4 space-y-0.5">
                      <div className="font-medium text-foreground">
                        {formatPhoneNumber(c.phone)}
                      </div>
                      {c.email && (
                        <div className="text-[11px] text-muted-foreground">{c.email}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-foreground">
                        {c.appointmentCount} {c.appointmentCount === 1 ? 'appointment' : 'appointments'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-muted-foreground">
                      {c.notes || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingCustomer(c)}
                        className="h-7 text-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1 text-rose" />
                        <span>Edit</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Customer Dialog */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="bg-card rounded-2xl border border-border p-6 max-w-md w-full space-y-4 shadow-lg text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-serif text-base font-semibold text-foreground">
                Edit Client Profile
              </h3>
              <button
                onClick={() => setEditingCustomer(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">First Name</label>
                  <Input
                    value={editingCustomer.firstName}
                    onChange={(e) =>
                      setEditingCustomer({ ...editingCustomer, firstName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Last Name</label>
                  <Input
                    value={editingCustomer.lastName}
                    onChange={(e) =>
                      setEditingCustomer({ ...editingCustomer, lastName: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Phone</label>
                <Input
                  value={editingCustomer.phone}
                  onChange={(e) =>
                    setEditingCustomer({ ...editingCustomer, phone: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Email (Optional)</label>
                <Input
                  type="email"
                  value={editingCustomer.email || ''}
                  onChange={(e) =>
                    setEditingCustomer({ ...editingCustomer, email: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Internal Notes & Preferences</label>
                <Input
                  value={editingCustomer.notes || ''}
                  onChange={(e) =>
                    setEditingCustomer({ ...editingCustomer, notes: e.target.value })
                  }
                  placeholder="Preferences, allergies, favorite stylist..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingCustomer(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="blush" size="sm" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
