'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { formatPhoneNumber } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, Edit3, X, UserCheck, Calendar } from 'lucide-react';

interface StaffItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  isActive: boolean;
  assignedServicesCount: number;
}

export function StaffManager({
  initialStaff,
}: {
  initialStaff: StaffItem[];
}) {
  const [staffList, setStaffList] = useState<StaffItem[]>(initialStaff);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffItem | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    setEditingStaff(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('0917');
    setBio('');
    setIsActive(true);
    setModalOpen(true);
  };

  const openEdit = (s: StaffItem) => {
    setEditingStaff(s);
    setFirstName(s.firstName);
    setLastName(s.lastName);
    setEmail(s.email || '');
    setPhone(s.phone || '');
    setBio(s.bio || '');
    setIsActive(s.isActive);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { firstName, lastName, email, phone, bio, isActive };

      if (editingStaff) {
        const res = await fetch('/api/admin/staff', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingStaff.id, ...payload }),
        });
        if (!res.ok) throw new Error('Update failed');
        toast.success('Staff profile updated');
      } else {
        const res = await fetch('/api/admin/staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Create failed');
        toast.success('Staff added with default working schedule');
      }

      setModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (s: StaffItem) => {
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id, isActive: !s.isActive }),
      });
      if (!res.ok) throw new Error('Status update failed');

      setStaffList((prev) =>
        prev.map((item) => (item.id === s.id ? { ...item, isActive: !item.isActive } : item))
      );
      toast.success(`Stylist ${s.isActive ? 'set to inactive' : 'activated'}`);
    } catch (err: any) {
      toast.error(err.message || 'Error updating status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">
          {staffList.length} Stylists & Technicians registered
        </span>
        <Button variant="blush" size="sm" onClick={openNew} className="flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          <span>Add Team Member</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {staffList.map((st) => (
          <div
            key={st.id}
            className="bg-card rounded-xl border border-border p-5 flex flex-col justify-between space-y-4 shadow-xs"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-serif font-bold text-foreground text-sm">
                  {st.firstName[0]}
                  {st.lastName[0]}
                </div>
                <button onClick={() => handleToggleActive(st)}>
                  <Badge variant={st.isActive ? 'success' : 'outline'} className="text-[10px]">
                    {st.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </button>
              </div>

              <div>
                <h3 className="font-serif text-base font-semibold text-foreground">
                  {st.firstName} {st.lastName}
                </h3>
                <div className="text-[11px] text-muted-foreground font-medium">
                  {st.phone ? formatPhoneNumber(st.phone) : 'No phone recorded'}
                </div>
                {st.email && (
                  <div className="text-[11px] text-muted-foreground truncate">{st.email}</div>
                )}
              </div>

              <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                {st.bio || 'Qualified salon professional dedicated to guest satisfaction.'}
              </p>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
              <span className="text-[11px] text-muted-foreground">
                {st.assignedServicesCount} services
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openEdit(st)}
                className="h-7 text-xs"
              >
                <Edit3 className="w-3.5 h-3.5 mr-1 text-rose" />
                <span>Edit</span>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="bg-card rounded-2xl border border-border p-6 max-w-md w-full space-y-4 shadow-lg text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-serif text-base font-semibold text-foreground">
                {editingStaff ? 'Edit Stylist' : 'Add Team Member'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">First Name *</label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Last Name *</label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Mobile (PH)</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09171234567"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="stylist@blushstudio.demo"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Bio / Specialties</label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Experience, Russian manicure, Lash artistry..."
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="staffActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-border text-rose"
                />
                <label htmlFor="staffActiveCheck" className="text-foreground font-medium">
                  Active for client appointments
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="blush" size="sm" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Stylist'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
