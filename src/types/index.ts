export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid';
export type PaymentMethod = 'cash' | 'gcash';

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface ServiceCategory {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface Service {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  priceCentavos: number;
  durationMinutes: number;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  category?: ServiceCategory;
}

export interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  imageUrl: string | null;
  isActive: boolean;
}

export interface StaffSchedule {
  id: string;
  staffId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface StaffUnavailablePeriod {
  id: string;
  staffId: string;
  startDate: Date;
  endDate: Date;
  reason: string | null;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Appointment {
  id: string;
  referenceNumber: string;
  customerId: string;
  serviceId: string;
  staffId: string;
  startTime: Date;
  endTime: Date;
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  priceCentavos: number;
  customerNotes: string | null;
  adminNotes: string | null;
  isWalkIn: boolean;
  createdAt: Date;
  updatedAt: Date;
  customer?: Customer;
  service?: Service;
  staff?: StaffMember;
}

export interface BusinessHours {
  id: string;
  dayOfWeek: DayOfWeek;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface BusinessSettings {
  id: string;
  businessName: string;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  messengerUrl: string | null;
  instagramUrl: string | null;
  bookingIntervalMinutes: number;
  minAdvanceBookingHours: number;
  maxAdvanceBookingDays: number;
  bufferMinutes: number;
  paymentInstructions: string | null;
}

export interface TimeSlot {
  time: string; // HH:mm
  available: boolean;
}

export interface DashboardMetrics {
  totalAppointments: number;
  todayAppointments: number;
  pendingAppointments: number;
  confirmedAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  estimatedRevenue: number;
  recentBookings: Appointment[];
  upcomingAppointments: Appointment[];
}
