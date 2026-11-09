'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatDuration, formatPhoneNumber } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Sparkles,
  Calendar as CalendarIcon,
  Clock,
  User,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Info,
  ShieldCheck,
  CreditCard,
  Banknote,
  MessageCircle,
} from 'lucide-react';

interface Service {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  priceCentavos: number;
  durationMinutes: number;
  categoryName?: string;
}

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  bio: string | null;
  imageUrl: string | null;
}

export function BookingWizard({
  initialServices,
  initialCategories,
}: {
  initialServices: Service[];
  initialCategories: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedServiceId = searchParams.get('serviceId');

  // Wizard Steps: 1: Service, 2: Staff, 3: Date/Time, 4: Customer, 5: Review, 6: Confirmation
  const [step, setStep] = useState<number>(1);

  // Form State
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [availableStaff, setAvailableStaff] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [noPreference, setNoPreference] = useState(false);

  // Date & Slot State
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);

  // Customer Details State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gcash'>('cash');

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<{
    referenceNumber: string;
    appointmentId: string;
  } | null>(null);

  // Handle preselected service from query param
  useEffect(() => {
    if (preselectedServiceId) {
      const match = initialServices.find((s) => s.id === preselectedServiceId);
      if (match) {
        setSelectedService(match);
        setStep(2);
      }
    }
  }, [preselectedServiceId, initialServices]);

  // Load qualified staff when service is selected
  useEffect(() => {
    if (!selectedService) return;

    async function fetchStaff() {
      try {
        const res = await fetch(`/api/booking/staff?serviceId=${selectedService!.id}`);
        const data = await res.json();
        if (data.staff) {
          setAvailableStaff(data.staff);
          // If previous staff is not qualified for new service, reset
          if (selectedStaff && !data.staff.some((st: any) => st.id === selectedStaff.id)) {
            setSelectedStaff(null);
          }
        }
      } catch (err) {
        console.error('Failed to load staff:', err);
      }
    }
    fetchStaff();
  }, [selectedService]);

  // Generate next 14 bookable days
  const bookableDates: Array<{ dateStr: string; label: string; sublabel: string }> = [];
  const today = new Date();
  for (let i = 0; i < 21; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    bookableDates.push({ dateStr, label: dayName, sublabel: monthDay });
  }

  // Load available time slots when staff + date are chosen
  useEffect(() => {
    if (!selectedService || (!selectedStaff && !noPreference) || !selectedDate) {
      return;
    }

    async function loadSlots() {
      setLoadingSlots(true);
      setSelectedSlot('');
      try {
        const staffIdToQuery = selectedStaff ? selectedStaff.id : availableStaff[0]?.id;
        if (!staffIdToQuery) {
          setAvailableSlots([]);
          setLoadingSlots(false);
          return;
        }

        const res = await fetch(
          `/api/booking/slots?serviceId=${selectedService!.id}&staffId=${staffIdToQuery}&date=${selectedDate}`
        );
        const data = await res.json();
        setAvailableSlots(data.slots || []);
      } catch (err) {
        console.error('Failed to load slots:', err);
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    }

    loadSlots();
  }, [selectedService, selectedStaff, noPreference, selectedDate, availableStaff]);

  // Autofill fictional demo customer information
  const handleFillDemoCustomer = () => {
    const firstNames = ['Sofia', 'Isabella', 'Bea', 'Chloe', 'Nicole', 'Kylie'];
    const lastNames = ['Mendoza', 'Valdez', 'Reyes', 'Santos', 'Aquino', 'Villanueva'];
    const randomFirst = firstNames[Math.floor(Math.random() * firstNames.length)];
    const randomLast = lastNames[Math.floor(Math.random() * lastNames.length)];
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const generatedPhone = `0917555${randomSuffix}`;
    const generatedEmail = `${randomFirst.toLowerCase()}.${randomLast.toLowerCase()}${randomSuffix}@blushdemo.ph`;

    setFirstName(randomFirst);
    setLastName(randomLast);
    setPhone(generatedPhone);
    setEmail(generatedEmail);
    setNotes('Mindful treatment requested (interactive showcase demo booking).');
    toast.info('Demo guest details autofilled');
  };

  // Handle Final Booking Submission
  const handleConfirmBooking = async () => {
    if (!selectedService || (!selectedStaff && !noPreference) || !selectedDate || !selectedSlot) {
      toast.error('Missing required booking details');
      return;
    }

    setSubmitting(true);
    try {
      const activeStaffId = selectedStaff ? selectedStaff.id : availableStaff[0]?.id;

      const payload = {
        serviceId: selectedService.id,
        staffId: activeStaffId,
        date: selectedDate,
        time: selectedSlot,
        customer: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        paymentMethod,
      };

      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to confirm booking');
      }

      setConfirmedBooking(data);
      setStep(6);
      toast.success('Your appointment has been reserved!');
    } catch (err: any) {
      toast.error(err.message || 'Booking conflict encountered. Please pick another slot.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredServices =
    selectedCategoryId === 'all'
      ? initialServices
      : initialServices.filter((s) => s.categoryId === selectedCategoryId);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      {/* Progress Indicator */}
      {step < 6 && (
        <div className="mb-10">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-3">
            <span className={step >= 1 ? 'text-foreground font-semibold' : ''}>1. Service</span>
            <span className={step >= 2 ? 'text-foreground font-semibold' : ''}>2. Stylist</span>
            <span className={step >= 3 ? 'text-foreground font-semibold' : ''}>3. Date & Time</span>
            <span className={step >= 4 ? 'text-foreground font-semibold' : ''}>4. Your Details</span>
            <span className={step >= 5 ? 'text-foreground font-semibold' : ''}>5. Review</span>
          </div>
          <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-rose h-full transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* ─── STEP 1: SELECT SERVICE ─────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="space-y-2">
            <h1 className="font-serif text-3xl font-medium text-foreground">
              Select Your Ritual
            </h1>
            <p className="text-sm text-muted-foreground">
              Choose the treatment you wish to reserve. All treatments include initial consultation and complimentary refreshments.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategoryId('all')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCategoryId === 'all'
                  ? 'bg-foreground text-background font-semibold'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              All Categories
            </button>
            {initialCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedCategoryId === cat.id
                    ? 'bg-foreground text-background font-semibold'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Service Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredServices.map((service) => {
              const isSelected = selectedService?.id === service.id;
              return (
                <div
                  key={service.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedService(service)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedService(service);
                    }
                  }}
                  className={`p-5 rounded-xl border text-left cursor-pointer transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background ${
                    isSelected
                      ? 'border-rose bg-secondary/30 ring-2 ring-rose/30 shadow-xs -translate-y-0.5'
                      : 'border-border bg-card hover:border-rose/50 hover:-translate-y-0.5 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-serif text-base font-semibold text-foreground">
                      {service.name}
                    </h3>
                    <span className="font-serif font-bold text-sm text-foreground whitespace-nowrap">
                      {formatPrice(service.priceCentavos)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-4">
                    {service.description}
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatDuration(service.durationMinutes)}</span>
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        isSelected ? 'text-rose' : 'text-muted-foreground'
                      }`}
                    >
                      {isSelected ? '✓ Selected' : 'Select →'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4">
            <Button
              variant="blush"
              disabled={!selectedService}
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-6"
            >
              <span>Continue to Stylist</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ─── STEP 2: SELECT STAFF ───────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="space-y-2">
            <h1 className="font-serif text-3xl font-medium text-foreground">
              Select Your Stylist
            </h1>
            <p className="text-sm text-muted-foreground">
              Selected service: <strong className="text-foreground">{selectedService?.name}</strong> ({formatDuration(selectedService?.durationMinutes || 0)})
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Any Available Stylist */}
            <div
              role="button"
              tabIndex={0}
              aria-pressed={noPreference}
              onClick={() => {
                setSelectedStaff(null);
                setNoPreference(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedStaff(null);
                  setNoPreference(true);
                }
              }}
              className={`p-5 rounded-xl border cursor-pointer transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background ${
                noPreference
                  ? 'border-rose bg-secondary/30 ring-2 ring-rose/30 shadow-xs -translate-y-0.5'
                  : 'border-border bg-card hover:border-rose/50 hover:-translate-y-0.5 hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-accent/40 flex items-center justify-center text-foreground font-serif font-bold text-sm">
                  ★
                </div>
                <div>
                  <h3 className="font-serif text-base font-semibold text-foreground">
                    First Available Stylist
                  </h3>
                  <span className="text-xs text-muted-foreground">Maximum scheduling flexibility</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                We will match you with the first qualified artist available at your desired appointment slot.
              </p>
            </div>

            {/* Individual Qualified Staff Members */}
            {availableStaff.map((st) => {
              const isSelected = selectedStaff?.id === st.id && !noPreference;
              return (
                <div
                  key={st.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedStaff(st);
                    setNoPreference(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedStaff(st);
                      setNoPreference(false);
                    }
                  }}
                  className={`p-5 rounded-xl border cursor-pointer transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background ${
                    isSelected
                      ? 'border-rose bg-secondary/30 ring-2 ring-rose/30 shadow-xs -translate-y-0.5'
                      : 'border-border bg-card hover:border-rose/50 hover:-translate-y-0.5 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground font-serif font-bold text-sm">
                      {st.firstName[0]}
                      {st.lastName[0]}
                    </div>
                    <div>
                      <h3 className="font-serif text-base font-semibold text-foreground">
                        {st.firstName} {st.lastName}
                      </h3>
                      <span className="text-xs text-rose font-medium">Certified Specialist</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-2 line-clamp-2">
                    {st.bio || 'Experienced studio technician dedicated to tailored client care.'}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(1)} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
            <Button
              variant="blush"
              disabled={!selectedStaff && !noPreference}
              onClick={() => setStep(3)}
              className="flex items-center gap-2 px-6"
            >
              <span>Choose Date & Time</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: SELECT DATE & TIME ─────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="space-y-2">
            <h1 className="font-serif text-3xl font-medium text-foreground">
              Select Date & Time
            </h1>
            <p className="text-sm text-muted-foreground">
              Available slots are calculated in real time in Philippine Standard Time (Asia/Manila) with required buffers.
            </p>
          </div>

          {/* Date Selector Row */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-foreground tracking-wide uppercase">
              1. Select Date
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {bookableDates.map((item) => {
                const isSelected = selectedDate === item.dateStr;
                return (
                  <button
                    key={item.dateStr}
                    type="button"
                    onClick={() => setSelectedDate(item.dateStr)}
                    className={`flex flex-col items-center justify-center min-w-[70px] py-2.5 px-3 rounded-xl border text-center transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background hover:-translate-y-0.5 ${
                      isSelected
                        ? 'border-foreground bg-foreground text-background font-semibold shadow-xs -translate-y-0.5'
                        : 'border-border bg-card text-foreground hover:border-rose/50 hover:shadow-xs'
                    }`}
                  >
                    <span className="text-[11px] uppercase tracking-wider opacity-80">
                      {item.label}
                    </span>
                    <span className="text-sm font-bold mt-0.5">{item.sublabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Slots Selector */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground tracking-wide uppercase">
                2. Select Available Slot
              </label>
              {selectedDate && (
                <span className="text-xs text-muted-foreground">
                  Showing open slots for {selectedDate}
                </span>
              )}
            </div>

            {!selectedDate ? (
              <div className="p-8 text-center bg-card rounded-xl border border-dashed border-border text-xs text-muted-foreground">
                Please pick a date above to display available times.
              </div>
            ) : loadingSlots ? (
              <div className="p-8 text-center bg-card rounded-xl border border-border text-xs text-muted-foreground animate-pulse">
                Checking stylist schedules and studio calendar...
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="p-8 text-center bg-card rounded-xl border border-border text-xs text-muted-foreground space-y-2">
                <p className="font-semibold text-foreground">No available slots on this date.</p>
                <p>All appointment windows for this service duration are currently booked or outside operating hours. Please pick another date.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                {availableSlots.map((time) => {
                  const isSelected = selectedSlot === time;
                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setSelectedSlot(time)}
                      className={`py-2.5 px-2 rounded-lg text-xs font-semibold border transition-all duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background active:scale-[0.98] ${
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                          : 'border-border bg-card text-foreground hover:border-rose/50 hover:bg-secondary/50'
                      }`}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(2)} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
            <Button
              variant="blush"
              disabled={!selectedDate || !selectedSlot}
              onClick={() => setStep(4)}
              className="flex items-center gap-2 px-6"
            >
              <span>Enter Guest Details</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ─── STEP 4: CUSTOMER DETAILS ───────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="space-y-2">
            <h1 className="font-serif text-3xl font-medium text-foreground">
              Guest Information
            </h1>
            <p className="text-sm text-muted-foreground">
              We require your contact details to generate your booking confirmation and send appointment updates.
            </p>
          </div>

          {/* Quick Demo Customer Autofill Banner */}
          <div className="p-4 rounded-xl bg-secondary/70 border border-rose/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="space-y-0.5 text-left">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Sparkles className="w-3.5 h-3.5 text-rose shrink-0" />
                <span>Visiting as a prospective client?</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Skip typing personal details. Click to autofill safe, realistic demonstration guest info.
              </p>
            </div>
            <Button
              type="button"
              variant="blush"
              size="sm"
              onClick={handleFillDemoCustomer}
              className="shrink-0 gap-1.5 text-xs font-semibold h-8.5 px-3.5"
            >
              <User className="w-3.5 h-3.5" />
              <span>Use Demo Customer</span>
            </Button>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  First Name <span className="text-rose">*</span>
                </label>
                <Input
                  placeholder="e.g. Maria Clara"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Last Name <span className="text-rose">*</span>
                </label>
                <Input
                  placeholder="e.g. Garcia"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Mobile Number (Philippines) <span className="text-rose">*</span>
                </label>
                <Input
                  placeholder="0917 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <span className="text-[11px] text-muted-foreground">
                  Accepts 09XXXXXXXXX or +639XXXXXXXXX
                </span>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Email Address (Optional)
                </label>
                <Input
                  type="email"
                  placeholder="maria@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Treatment Preferences / Special Notes (Optional)
              </label>
              <Textarea
                placeholder="Let us know if you have sensitive cuticles, allergies, nail art references, or special requests..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(3)} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
            <Button
              variant="blush"
              disabled={!firstName.trim() || !lastName.trim() || !phone.trim()}
              onClick={() => setStep(5)}
              className="flex items-center gap-2 px-6"
            >
              <span>Review Booking</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ─── STEP 5: REVIEW & PAYMENT PREFERENCE ─────────────────────── */}
      {step === 5 && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="space-y-2">
            <h1 className="font-serif text-3xl font-medium text-foreground">
              Review & Reserve
            </h1>
            <p className="text-sm text-muted-foreground">
              Please verify your appointment schedule and select your preferred payment settlement method.
            </p>
          </div>

          {/* Booking Summary Box */}
          <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <span className="text-xs text-rose uppercase tracking-wider font-semibold">
                  Treatment
                </span>
                <h3 className="font-serif text-xl font-medium text-foreground">
                  {selectedService?.name}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground block">Estimated Fee</span>
                <span className="font-serif text-xl font-bold text-foreground">
                  {formatPrice(selectedService?.priceCentavos || 0)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-muted-foreground">
              <div>
                <span className="block font-medium text-foreground mb-1">Stylist</span>
                <span>
                  {selectedStaff
                    ? `${selectedStaff.firstName} ${selectedStaff.lastName}`
                    : 'First Available Artist'}
                </span>
              </div>
              <div>
                <span className="block font-medium text-foreground mb-1">Date & Time</span>
                <span>
                  {selectedDate} at {selectedSlot}
                </span>
              </div>
              <div>
                <span className="block font-medium text-foreground mb-1">Duration</span>
                <span>{formatDuration(selectedService?.durationMinutes || 0)}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-border text-xs text-muted-foreground">
              <span className="block font-medium text-foreground mb-1">Guest Contact</span>
              <span>
                {firstName} {lastName} • {formatPhoneNumber(phone)}
                {email ? ` • ${email}` : ''}
              </span>
            </div>

            {/* Payment Method Choice (Demo Only) */}
            <div className="pt-4 border-t border-border space-y-3">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                Payment Settlement Preference (Demo Only)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  role="radio"
                  tabIndex={0}
                  aria-checked={paymentMethod === 'cash'}
                  onClick={() => setPaymentMethod('cash')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setPaymentMethod('cash');
                    }
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-start gap-3 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background hover:-translate-y-0.5 ${
                    paymentMethod === 'cash'
                      ? 'border-rose bg-secondary/40 ring-1 ring-rose shadow-xs'
                      : 'border-border bg-card hover:border-rose/40 hover:shadow-xs'
                  }`}
                >
                  <Banknote className="w-5 h-5 text-rose shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Cash on Visit</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Settle payment directly at the front reception after your appointment.
                    </p>
                  </div>
                </div>

                <div
                  role="radio"
                  tabIndex={0}
                  aria-checked={paymentMethod === 'gcash'}
                  onClick={() => setPaymentMethod('gcash')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setPaymentMethod('gcash');
                    }
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-start gap-3 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background hover:-translate-y-0.5 ${
                    paymentMethod === 'gcash'
                      ? 'border-rose bg-secondary/40 ring-1 ring-rose shadow-xs'
                      : 'border-border bg-card hover:border-rose/40 hover:shadow-xs'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-rose shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">GCash (Simulated)</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Demonstration simulated workflow. No actual bank transfers or charges.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(4)} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
            <Button
              variant="blush"
              size="lg"
              disabled={submitting}
              onClick={handleConfirmBooking}
              className="flex items-center gap-2 px-8"
            >
              {submitting ? (
                <span>Confirming Booking...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Reservation</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ─── STEP 6: CONFIRMATION ───────────────────────────────────── */}
      {step === 6 && confirmedBooking && (
        <div className="bg-card rounded-2xl border border-border p-8 md:p-12 text-center max-w-2xl mx-auto space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <Badge variant="success">Reservation Confirmed</Badge>
            <h1 className="font-serif text-3xl sm:text-4xl font-medium text-foreground">
              We look forward to welcoming you.
            </h1>
            <p className="text-sm text-muted-foreground">
              Your appointment has been registered in the Blush Studio booking engine.
            </p>
          </div>

          {/* Reference badge */}
          <div className="bg-secondary/60 rounded-xl p-4 border border-border inline-block max-w-sm mx-auto">
            <span className="text-xs text-muted-foreground block mb-1">
              Booking Reference Number
            </span>
            <span className="font-mono text-xl font-bold text-foreground tracking-wider">
              {confirmedBooking.referenceNumber}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-secondary/50 border border-border text-xs text-muted-foreground max-w-md mx-auto space-y-2 text-center">
            <p className="font-semibold text-foreground">
              ✨ Fictional Portfolio Demonstration
            </p>
            <p>
              This is an interactive showcase built by Veltwo Studio. No real appointment or payment will be processed.
            </p>
            <p className="text-[11px]">
              You can now look up your booking details or log into the Admin Portal as Demo Manager to see your reservation appear live on the appointment schedule.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-border">
            <Button variant="outline" asChild>
              <Link
                href={`/booking/${confirmedBooking.referenceNumber}`}
                className="flex items-center gap-2"
              >
                <CalendarIcon className="w-4 h-4 text-rose" />
                <span>View Booking Details</span>
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/login" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-rose" />
                <span>Explore in Admin Portal</span>
              </Link>
            </Button>
            <Button
              variant="blush"
              onClick={() => {
                setStep(1);
                setSelectedService(null);
                setSelectedStaff(null);
                setSelectedDate('');
                setSelectedSlot('');
                setConfirmedBooking(null);
              }}
            >
              Book Another Treatment
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
