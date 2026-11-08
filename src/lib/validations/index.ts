import { z } from 'zod';

// ─── Philippine phone validation ─────────────────────────────────────
const phPhoneRegex = /^(09\d{9}|(\+?63)9\d{9})$/;

export const phoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .transform((val) => val.replace(/[\s\-()]/g, ''))
  .refine((val) => phPhoneRegex.test(val), {
    message: 'Enter a valid Philippine mobile number (e.g., 09171234567)',
  });

// ─── Booking form schemas ────────────────────────────────────────────

export const bookingCustomerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: phoneSchema,
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
});

export const bookingSchema = z.object({
  serviceId: z.string().uuid('Select a service'),
  staffId: z.string().uuid('Select a staff member'),
  date: z.string().min(1, 'Select a date'),
  time: z.string().min(1, 'Select a time'),
  customer: bookingCustomerSchema,
  paymentMethod: z.enum(['cash', 'gcash']).optional(),
});

export type BookingFormData = z.infer<typeof bookingSchema>;
export type CustomerFormData = z.infer<typeof bookingCustomerSchema>;

// ─── Admin form schemas ──────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export const serviceSchema = z.object({
  name: z.string().min(1, 'Service name is required').max(200),
  description: z.string().max(1000).optional().or(z.literal('')),
  categoryId: z.string().uuid('Select a category'),
  priceCentavos: z.number().int().min(100, 'Minimum price is ₱1.00'),
  durationMinutes: z.number().int().min(15, 'Minimum duration is 15 minutes').max(480),
  isActive: z.boolean().default(true),
});

export type ServiceFormData = z.infer<typeof serviceSchema>;

export const staffSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  bio: z.string().max(500).optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

export type StaffFormData = z.infer<typeof staffSchema>;

export const customerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: phoneSchema,
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

export const businessSettingsSchema = z.object({
  businessName: z.string().min(1).max(200),
  tagline: z.string().max(500).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  messengerUrl: z.string().url().optional().or(z.literal('')),
  instagramUrl: z.string().url().optional().or(z.literal('')),
  bookingIntervalMinutes: z.number().int().min(15).max(120),
  minAdvanceBookingHours: z.number().int().min(0).max(72),
  maxAdvanceBookingDays: z.number().int().min(1).max(90),
  bufferMinutes: z.number().int().min(0).max(60),
  paymentInstructions: z.string().max(2000).optional().or(z.literal('')),
});

export type BusinessSettingsFormData = z.infer<typeof businessSettingsSchema>;

export const appointmentStatusSchema = z.enum([
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
]);

export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

export const paymentStatusSchema = z.enum([
  'unpaid',
  'partially_paid',
  'paid',
]);

export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
