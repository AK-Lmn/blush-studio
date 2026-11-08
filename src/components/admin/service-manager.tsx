'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatDuration } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, Edit3, X, CheckCircle2, Clock } from 'lucide-react';

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  categoryName: string;
  priceCentavos: number;
  durationMinutes: number;
  isActive: boolean;
}

interface CategoryOption {
  id: string;
  name: string;
}

export function ServiceManager({
  initialServices,
  categories,
}: {
  initialServices: ServiceItem[];
  categories: CategoryOption[];
}) {
  const [services, setServices] = useState<ServiceItem[]>(initialServices);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [pricePhp, setPricePhp] = useState('1200');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const openNewModal = () => {
    setEditingService(null);
    setName('');
    setDescription('');
    setCategoryId(categories[0]?.id || '');
    setPricePhp('1200');
    setDurationMinutes('60');
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (service: ServiceItem) => {
    setEditingService(service);
    setName(service.name);
    setDescription(service.description || '');
    setCategoryId(service.categoryId);
    setPricePhp((service.priceCentavos / 100).toString());
    setDurationMinutes(service.durationMinutes.toString());
    setIsActive(service.isActive);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const priceCentavos = Math.round(parseFloat(pricePhp) * 100);
      const payload = {
        name,
        description,
        categoryId,
        priceCentavos,
        durationMinutes: parseInt(durationMinutes, 10),
        isActive,
      };

      if (editingService) {
        const res = await fetch('/api/admin/services', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingService.id, ...payload }),
        });
        if (!res.ok) throw new Error('Update failed');
        toast.success('Service updated');
      } else {
        const res = await fetch('/api/admin/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Create failed');
        toast.success('Service created');
      }

      setModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (service: ServiceItem) => {
    try {
      const res = await fetch('/api/admin/services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: service.id, isActive: !service.isActive }),
      });
      if (!res.ok) throw new Error('Failed to update status');

      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, isActive: !s.isActive } : s))
      );
      toast.success(
        `Service ${service.isActive ? 'disabled from online booking' : 'activated for booking'}`
      );
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">
          Showing {services.length} studio services across {categories.length} categories
        </span>
        <Button variant="blush" size="sm" onClick={openNewModal} className="flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          <span>Add New Service</span>
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border bg-secondary/30 text-muted-foreground font-medium">
              <th className="py-3 px-4">Service & Category</th>
              <th className="py-3 px-4">Duration</th>
              <th className="py-3 px-4">Price (PHP)</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {services.map((service) => (
              <tr key={service.id} className="hover:bg-secondary/15 transition-colors">
                <td className="py-3.5 px-4 space-y-0.5">
                  <div className="font-semibold text-foreground text-sm">
                    {service.name}
                  </div>
                  <div className="text-[11px] text-rose font-medium">
                    {service.categoryName}
                  </div>
                  <div className="text-muted-foreground text-[11px] max-w-md line-clamp-1">
                    {service.description}
                  </div>
                </td>
                <td className="py-3.5 px-4 text-muted-foreground">
                  {formatDuration(service.durationMinutes)}
                </td>
                <td className="py-3.5 px-4 font-serif font-bold text-foreground text-sm">
                  {formatPrice(service.priceCentavos)}
                </td>
                <td className="py-3.5 px-4">
                  <button
                    onClick={() => handleToggleActive(service)}
                    className="cursor-pointer"
                  >
                    <Badge
                      variant={service.isActive ? 'success' : 'outline'}
                      className="text-[10px]"
                    >
                      {service.isActive ? 'Active' : 'Disabled'}
                    </Badge>
                  </button>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(service)}
                    className="h-7 text-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1 text-rose" />
                    <span>Edit</span>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="bg-card rounded-2xl border border-border p-6 max-w-md w-full space-y-4 shadow-lg text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-serif text-base font-semibold text-foreground">
                {editingService ? 'Edit Service' : 'Add New Service'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Service Name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Russian Gel Manicure"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Category *</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-9 px-2 rounded-md border border-border bg-card text-xs text-foreground"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Price in PHP (₱) *</label>
                  <Input
                    type="number"
                    step="50"
                    value={pricePhp}
                    onChange={(e) => setPricePhp(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Duration (Minutes) *</label>
                  <Input
                    type="number"
                    step="15"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Service details, materials, steps..."
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-border text-rose"
                />
                <label htmlFor="isActiveCheck" className="text-foreground font-medium">
                  Available for Online Customer Booking
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
                  {saving ? 'Saving...' : 'Save Service'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
