'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatDuration, formatPhoneNumber } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Search,
  Filter,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  MoreVertical,
  Calendar,
  X,
  User,
  CreditCard,
} from 'lucide-react';

interface AppointmentItem {
  id: string;
  referenceNumber: string;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  priceCentavos: number;
  customerNotes: string | null;
  adminNotes: string | null;
  isWalkIn: boolean;
  customerFirstName: string;
  customerLastName: string;
  customerPhone: string;
  serviceName: string;
  staffFirstName: string;
  staffLastName: string;
}

interface ServiceOption {
  id: string;
  name: string;
  priceCentavos: number;
  durationMinutes: number;
}

interface StaffOption {
  id: string;
  firstName: string;
  lastName: string;
}

export function AppointmentTable({
  initialAppointments,
  services,
  staffList,
}: {
  initialAppointments: AppointmentItem[];
  services: ServiceOption[];
  staffList: StaffOption[];
}) {
  const [appointments, setAppointments] = useState<AppointmentItem[]>(initialAppointments);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Manual Walk-In / New Appointment Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalServiceId, setModalServiceId] = useState(services[0]?.id || '');
  const [modalStaffId, setModalStaffId] = useState(staffList[0]?.id || '');
  const [modalDate, setModalDate] = useState(new Date().toISOString().slice(0, 10));
  const [modalTime, setModalTime] = useState('14:00');
  const [modalFirstName, setModalFirstName] = useState('');
  const [modalLastName, setModalLastName] = useState('');
  const [modalPhone, setModalPhone] = useState('0917');
  const [modalPaymentMethod, setModalPaymentMethod] = useState<'cash' | 'gcash'>('cash');
  const [modalPaymentStatus, setModalPaymentStatus] = useState<'paid' | 'unpaid'>('paid');
  const [modalNotes, setModalNotes] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Update Status
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch('/api/admin/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Status update failed');
      }

      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
      );
      toast.success(`Appointment status updated to ${newStatus}`);
    } catch (err: any) {
      toast.error(err.message || 'Error updating status');
    } finally {
      setUpdatingId(null);
    }
  };

  // Update Payment Status
  const handleUpdatePayment = async (id: string, newPaymentStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch('/api/admin/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, paymentStatus: newPaymentStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Payment status update failed');
      }

      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, paymentStatus: newPaymentStatus } : a))
      );
      toast.success(`Payment marked as ${newPaymentStatus}`);
    } catch (err: any) {
      toast.error(err.message || 'Error updating payment');
    } finally {
      setUpdatingId(null);
    }
  };

  // Create Manual Walk-In
  const handleCreateWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalFirstName || !modalLastName || !modalPhone) {
      toast.error('Please enter customer name and phone');
      return;
    }

    setModalSubmitting(true);
    try {
      const res = await fetch('/api/admin/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: modalServiceId,
          staffId: modalStaffId,
          date: modalDate,
          time: modalTime,
          customerFirstName: modalFirstName,
          customerLastName: modalLastName,
          customerPhone: modalPhone,
          isWalkIn: true,
          paymentMethod: modalPaymentMethod,
          paymentStatus: modalPaymentStatus,
          status: 'confirmed',
          adminNotes: modalNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record walk-in');

      toast.success('Walk-in booking recorded successfully');
      setShowModal(false);

      // Refresh list
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Error recording walk-in');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Filter appointments
  const filteredAppointments = appointments.filter((appt) => {
    const matchesSearch =
      appt.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${appt.customerFirstName} ${appt.customerLastName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      appt.customerPhone.includes(searchTerm) ||
      appt.serviceName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || appt.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search by client, ref #, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Status filter selector */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-md border border-border bg-card text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>
        </div>

        <Button
          variant="blush"
          size="sm"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 h-9"
        >
          <Plus className="w-4 h-4" />
          <span>New Manual / Walk-In</span>
        </Button>
      </div>

      {/* Appointments Data Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-secondary/30 text-muted-foreground font-medium">
                <th className="py-3 px-4">Ref & Guest</th>
                <th className="py-3 px-4">Service & Stylist</th>
                <th className="py-3 px-4">Schedule (Manila)</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    No appointments match the criteria.
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((appt) => {
                  const dateStr = new Date(appt.startTime).toLocaleDateString('en-US', {
                    timeZone: 'Asia/Manila',
                    month: 'short',
                    day: 'numeric',
                  });
                  const timeStr = new Date(appt.startTime).toLocaleTimeString('en-US', {
                    timeZone: 'Asia/Manila',
                    hour: 'numeric',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={appt.id} className="hover:bg-secondary/15 transition-colors">
                      {/* Ref & Guest */}
                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="font-semibold text-foreground">
                          {appt.customerFirstName} {appt.customerLastName}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {appt.referenceNumber}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {formatPhoneNumber(appt.customerPhone)}
                        </div>
                      </td>

                      {/* Service & Stylist */}
                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="font-medium text-foreground">
                          {appt.serviceName}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Stylist: {appt.staffFirstName} {appt.staffLastName}
                        </div>
                        {appt.isWalkIn && (
                          <Badge variant="outline" className="text-[10px] py-0">
                            Walk-In
                          </Badge>
                        )}
                      </td>

                      {/* Schedule */}
                      <td className="py-3.5 px-4 space-y-0.5 whitespace-nowrap">
                        <div className="font-semibold text-foreground">
                          {dateStr}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {timeStr}
                        </div>
                      </td>

                      {/* Payment */}
                      <td className="py-3.5 px-4 space-y-1">
                        <div className="font-semibold text-foreground">
                          {formatPrice(appt.priceCentavos)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                              appt.paymentStatus === 'paid'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {appt.paymentStatus}
                          </span>
                          <button
                            onClick={() =>
                              handleUpdatePayment(
                                appt.id,
                                appt.paymentStatus === 'paid' ? 'unpaid' : 'paid'
                              )
                            }
                            className="text-[10px] text-rose hover:underline"
                            disabled={updatingId === appt.id}
                          >
                            Toggle
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <select
                          value={appt.status}
                          disabled={updatingId === appt.id}
                          onChange={(e) => handleUpdateStatus(appt.id, e.target.value)}
                          className="h-7 px-2 rounded border border-border bg-card text-[11px] font-medium text-foreground"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="no_show">No Show</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          asChild
                        >
                          <a href={`/booking/${appt.referenceNumber}`} target="_blank">
                            Public View
                          </a>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Booking / Walk-In Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="bg-card rounded-2xl border border-border p-6 max-w-lg w-full space-y-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-serif text-lg font-semibold text-foreground">
                Record Manual Booking / Walk-In
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWalkIn} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">First Name *</label>
                  <Input
                    placeholder="Guest First Name"
                    value={modalFirstName}
                    onChange={(e) => setModalFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Last Name *</label>
                  <Input
                    placeholder="Guest Last Name"
                    value={modalLastName}
                    onChange={(e) => setModalLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Mobile Number *</label>
                <Input
                  placeholder="09171234567"
                  value={modalPhone}
                  onChange={(e) => setModalPhone(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Treatment *</label>
                  <select
                    value={modalServiceId}
                    onChange={(e) => setModalServiceId(e.target.value)}
                    className="w-full h-9 px-2 rounded-md border border-border bg-card text-xs text-foreground"
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({formatPrice(s.priceCentavos)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Assigned Stylist *</label>
                  <select
                    value={modalStaffId}
                    onChange={(e) => setModalStaffId(e.target.value)}
                    className="w-full h-9 px-2 rounded-md border border-border bg-card text-xs text-foreground"
                  >
                    {staffList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.firstName} {st.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Date *</label>
                  <Input
                    type="date"
                    value={modalDate}
                    onChange={(e) => setModalDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Time (Manila) *</label>
                  <Input
                    type="time"
                    value={modalTime}
                    onChange={(e) => setModalTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Payment Method</label>
                  <select
                    value={modalPaymentMethod}
                    onChange={(e) => setModalPaymentMethod(e.target.value as any)}
                    className="w-full h-9 px-2 rounded-md border border-border bg-card text-xs text-foreground"
                  >
                    <option value="cash">Cash</option>
                    <option value="gcash">GCash</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Payment Status</label>
                  <select
                    value={modalPaymentStatus}
                    onChange={(e) => setModalPaymentStatus(e.target.value as any)}
                    className="w-full h-9 px-2 rounded-md border border-border bg-card text-xs text-foreground"
                  >
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="blush"
                  size="sm"
                  disabled={modalSubmitting}
                >
                  {modalSubmitting ? 'Recording...' : 'Record Walk-In'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
