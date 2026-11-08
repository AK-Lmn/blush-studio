# Feature Specification & Functional Capabilities

**Project**: Blush Studio  
**Author**: Veltwo Studio  

---

## 1. Customer-Facing Features

### 1.1 Brand Homepage (`/`)
- **Responsive Brand Navigation**: Studio wordmark, desktop navigation links, responsive mobile drawer with quick booking CTAs.
- **Top Demonstration Notice Banner**: Informative, elegant bar clarifying fictional demo status with direct link to the Staff & Admin portal.
- **Editorial Hero Section**: Boutique beauty brand aesthetic, value proposition, trust badges (Hospital-Grade Sterilization, Cruelty-Free Japanese/EU Products, Complimentary Refreshments).
- **Today's Availability Preview**: Live real-time check of today's open booking windows.
- **Curated Treatments Showcase**: Live data cards fetched from PostgreSQL with service durations and starting prices.
- **Sanctuary Philosophy & Standards**: Explanations of Russian manicure techniques, 1:1 lash isolation, and autoclave pouch sterilization.
- **Client Stories**: Fictional customer feedback clearly labeled as demo testimonials.
- **FAQ Section**: Operating policies, parking at The Bellagio Promenade, cancellation guidelines.
- **Location & Hours**: Manila schedule, address in BGC, Messenger contact link.

### 1.2 Services & Rates (`/services`)
- Full dynamic catalog loaded from PostgreSQL.
- Filter pills by service category (`Nails & Extensions`, `Lashes & Brows`, `Facial & Glow Therapy`, `Self-Care Rituals`).
- Treatment duration in hours and minutes (`formatDuration`), starting price in Philippine Pesos (`formatPrice`).
- Direct "Reserve" button pre-selecting the chosen service in the booking wizard.

### 1.3 Online Booking System (`/book`)
A multi-step, stateful booking flow:
1. **Step 1 — Ritual Selection**: Filterable service picker with prices and durations.
2. **Step 2 — Stylist Preference**: Select a specific certified technician or choose "First Available Stylist" for maximum schedule flexibility. Only qualified technicians are presented.
3. **Step 3 — Date & Time Slots**: Dynamic horizontal date selector (next 21 days). Calculates available slots in real time considering studio operating hours, stylist working hours, scheduled appointments, sanitization buffers, and minimum 2-hour advance booking notice.
4. **Step 4 — Guest Information**: First name, last name, Philippine phone number validation, optional email, and custom notes.
5. **Step 5 — Review & Payment Preference**: Summary card reviewing stylist, date/time window, price, and customer details. Selection between "Cash on Visit" or simulated "GCash" workflow.
6. **Step 6 — Instant Confirmation**: Generates unique public-safe reference number (`BLS-YYYYMMDD-XXXX`), records appointment to PostgreSQL, explains check-in guidelines, and provides one-click Messenger contact link.

### 1.4 Public Booking Lookup (`/booking/[reference]`)
- Safe lookup page allowing customers or front-desk staff to view appointment status, stylist assignment, and scheduled time window by reference code without exposing other customer records.

---

## 2. Administrative Management Features

### 2.1 Admin Authentication (`/admin/login`)
- Protected admin session handling with HTTP-only cookies.
- One-click "Fill Demo Admin" helper for seamless client presentation.
- Proper redirection for unauthorized access attempts.

### 2.2 Live Dashboard Overview (`/admin`)
- Database-derived metrics:
  - Today's Scheduled Appointments
  - Pending Review Count
  - Completed Visits Count
  - Cumulative Realized Revenue in PHP
- Upcoming schedule list with real-time status badges.
- Recent bookings feed with payment settlement indicators.

### 2.3 Appointment Management (`/admin/appointments`)
- Search by client name, reference code, phone number, or treatment name.
- Status filter dropdown (`All`, `Pending`, `Confirmed`, `In Progress`, `Completed`, `Cancelled`, `No Show`).
- Inline status updating with live server persistence.
- Payment status toggling (`Unpaid` ↔ `Paid`).
- Walk-In & Manual Booking Dialog: Allows front-desk staff to record walk-in customers or phone reservations with instant validation and staff assignment.

### 2.4 Studio Calendar (`/admin/calendar`)
- **Day View**: Hourly time-grid from 9:00 AM to 8:00 PM showing appointment blocks, customer names, stylist assignments, and status badges.
- **Week View**: 7-day overview showing appointment distribution across days.
- Date navigation controls ("Today", Previous, Next).

### 2.5 Client Directory (`/admin/customers`)
- Searchable client database with phone numbers, emails, and internal notes.
- Automatically calculates total lifetime visit counts.
- Edit client modal to update contact details and internal styling preferences.

### 2.6 Services & Pricing Catalog (`/admin/services`)
- View all treatments with category badges, duration in minutes, and price in PHP.
- Add new service modal with category assignment and price validation.
- Edit service modal to update descriptions, durations, and pricing.
- One-click active/disabled toggle to control customer booking visibility.

### 2.7 Staff & Schedules (`/admin/staff`)
- Stylist directory cards showing bios, contact information, and active service counts.
- Add new team member modal (automatically seeds standard working schedules).
- Active/Inactive toggle for stylists on leave or absent.

### 2.8 Business Reports & Analytics (`/admin/reports`)
- Cumulative revenue card.
- **Recharts Bar Chart**: Revenue distribution grouped by service category.
- **Recharts Pie Chart**: Appointment volume distribution by status (`Completed`, `Confirmed`, `Pending`, `Cancelled`).

### 2.9 Studio Settings (`/admin/settings`)
- Configure studio profile (name, address, phone, email, Messenger link).
- Configure scheduling engine parameters:
  - Booking slot intervals (15 to 120 minutes)
  - Buffer minutes between appointments (0 to 60 minutes)
  - Minimum advance notice (0 to 72 hours)
  - Maximum booking horizon (1 to 90 days)
  - Demo payment instructions

---

## 3. Demo Limitations & Out of Scope Notice

- **No Real Banking / Payment Gateway**: GCash interactions are demonstration simulations. No credit cards or real e-wallets are billed.
- **No Paid SMS API**: Mobile numbers are validated and stored; SMS confirmations are simulated via UI alerts and public booking reference links.
- **Single Branch Focus**: Architecture represents Blush Studio's flagship Bonifacio Global City sanctuary.
