import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  uuid,
  varchar,
  pgEnum,
  uniqueIndex,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';

// ─── Enums ───────────────────────────────────────────────────────────

export const appointmentStatusEnum = pgEnum('appointment_status', [
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'unpaid',
  'partially_paid',
  'paid',
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'cash',
  'gcash',
]);

export const dayOfWeekEnum = pgEnum('day_of_week', [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

// ─── Better Auth tables ──────────────────────────────────────────────

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  role: text('role').default('admin'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Service Categories ──────────────────────────────────────────────

export const serviceCategories = pgTable('service_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Services ────────────────────────────────────────────────────────

export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => serviceCategories.id, { onDelete: 'restrict' }),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  /** Price stored in centavos (PHP × 100) */
  priceCentavos: integer('price_centavos').notNull(),
  /** Duration in minutes */
  durationMinutes: integer('duration_minutes').notNull(),
  imageUrl: text('image_url'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Staff ───────────────────────────────────────────────────────────

export const staff = pgTable('staff', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  bio: text('bio'),
  imageUrl: text('image_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Staff-Service assignments ───────────────────────────────────────

export const staffServices = pgTable(
  'staff_services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    staffId: uuid('staff_id')
      .notNull()
      .references(() => staff.id, { onDelete: 'cascade' }),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
  },
  (table) => [
    uniqueIndex('staff_service_unique').on(table.staffId, table.serviceId),
  ]
);

// ─── Staff Schedules ─────────────────────────────────────────────────

export const staffSchedules = pgTable(
  'staff_schedules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    staffId: uuid('staff_id')
      .notNull()
      .references(() => staff.id, { onDelete: 'cascade' }),
    dayOfWeek: dayOfWeekEnum('day_of_week').notNull(),
    /** Start time in HH:mm format */
    startTime: varchar('start_time', { length: 5 }).notNull(),
    /** End time in HH:mm format */
    endTime: varchar('end_time', { length: 5 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [
    uniqueIndex('staff_schedule_unique').on(table.staffId, table.dayOfWeek),
  ]
);

// ─── Staff Unavailable Periods ───────────────────────────────────────

export const staffUnavailable = pgTable('staff_unavailable', {
  id: uuid('id').primaryKey().defaultRandom(),
  staffId: uuid('staff_id')
    .notNull()
    .references(() => staff.id, { onDelete: 'cascade' }),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Business Hours ──────────────────────────────────────────────────

export const businessHours = pgTable(
  'business_hours',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dayOfWeek: dayOfWeekEnum('day_of_week').notNull(),
    /** Open time in HH:mm format */
    openTime: varchar('open_time', { length: 5 }).notNull(),
    /** Close time in HH:mm format */
    closeTime: varchar('close_time', { length: 5 }).notNull(),
    isClosed: boolean('is_closed').notNull().default(false),
  },
  (table) => [uniqueIndex('business_hours_day_unique').on(table.dayOfWeek)]
);

// ─── Customers ───────────────────────────────────────────────────────

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 20 }).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index('customer_phone_idx').on(table.phone)]
);

// ─── Appointments ────────────────────────────────────────────────────

export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Human-readable reference like BLS-20241109-ABCD */
    referenceNumber: varchar('reference_number', { length: 30 })
      .notNull()
      .unique(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'restrict' }),
    staffId: uuid('staff_id')
      .notNull()
      .references(() => staff.id, { onDelete: 'restrict' }),
    /** Stored in UTC */
    startTime: timestamp('start_time').notNull(),
    /** Stored in UTC */
    endTime: timestamp('end_time').notNull(),
    status: appointmentStatusEnum('status').notNull().default('pending'),
    paymentStatus: paymentStatusEnum('payment_status')
      .notNull()
      .default('unpaid'),
    paymentMethod: paymentMethodEnum('payment_method'),
    /** Price at time of booking in centavos */
    priceCentavos: integer('price_centavos').notNull(),
    customerNotes: text('customer_notes'),
    adminNotes: text('admin_notes'),
    isWalkIn: boolean('is_walk_in').notNull().default(false),
    /** Scopes demo bookings created by public visitors so demo sessions are isolated */
    visitorId: varchar('visitor_id', { length: 64 }),
    /** Flags baseline demonstration seed records that cannot be permanently mutated by public users */
    isDemoSeed: boolean('is_demo_seed').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('appointment_staff_time_idx').on(
      table.staffId,
      table.startTime,
      table.endTime
    ),
    index('appointment_customer_idx').on(table.customerId),
    index('appointment_status_idx').on(table.status),
    index('appointment_date_idx').on(table.startTime),
    index('appointment_visitor_idx').on(table.visitorId),
    index('appointment_demo_seed_idx').on(table.isDemoSeed),
  ]
);

// ─── Business Settings ───────────────────────────────────────────────

export const businessSettings = pgTable('business_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessName: varchar('business_name', { length: 200 })
    .notNull()
    .default('Blush Studio'),
  tagline: text('tagline'),
  address: text('address'),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  messengerUrl: text('messenger_url'),
  instagramUrl: text('instagram_url'),
  /** Booking interval in minutes (slot granularity) */
  bookingIntervalMinutes: integer('booking_interval_minutes')
    .notNull()
    .default(30),
  /** Minimum hours before an appointment can be booked */
  minAdvanceBookingHours: integer('min_advance_booking_hours')
    .notNull()
    .default(2),
  /** Maximum days ahead an appointment can be booked */
  maxAdvanceBookingDays: integer('max_advance_booking_days')
    .notNull()
    .default(30),
  /** Buffer minutes between appointments */
  bufferMinutes: integer('buffer_minutes').notNull().default(10),
  /** Demo payment instructions */
  paymentInstructions: text('payment_instructions'),
  /** Additional metadata */
  metadata: jsonb('metadata'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
