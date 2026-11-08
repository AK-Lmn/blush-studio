# Blush Studio — Salon Booking & Business Management Platform

> **Project 001** developed by **Veltwo Studio**  
> Flagship full-stack client demonstration for Philippine beauty & wellness micro, small, and medium enterprises.

---

## 🌸 Overview

**Blush Studio** is an editorial, high-craft beauty salon web application based in Bonifacio Global City (BGC), Metro Manila, Philippines. Built from the ground up by Veltwo Studio, it showcases how a custom digital booking and operational platform replaces manual social media DMs, scattered record-keeping, and appointment double-booking with a seamless, unified web experience.

The product integrates two core workflows into a single cohesive Next.js full-stack application:
1. **Customer-Facing Sanctuary Web Experience**: Brand storytelling, curated treatment menu with live database pricing, and an interactive 6-step online appointment booking engine.
2. **Administrative Management Portal**: Real-time business metrics, appointment triage (Confirm, In-Progress, Complete, Cancel, No-Show), simulated GCash/Cash payment recording, interactive calendar, client directory, service catalog editor, and staff schedule management.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Core Framework** | Next.js 16 (App Router, Server Actions, Route Handlers), React 19, TypeScript (Strict Mode) |
| **Styling & Design System** | Tailwind CSS v4, custom Blush Studio tokens (Blush Pink `#F4B8C8`, Soft Cream `#FFF9F6`, Deep Charcoal `#252126`, Muted Rose `#D58FA4`), Lucide icons, Sonner toast notifications |
| **Database & ORM** | PostgreSQL, Drizzle ORM, Drizzle Kit migrations, with seamless zero-config embedded PostgreSQL support (`@electric-sql/pglite`) for instant local testing |
| **Validation & Logic** | Zod schemas, Philippine mobile number regex validation, date-fns, Asia/Manila timezone conversion |
| **Authentication** | Secure cookie-based HTTP-only session management, protected server routes, role checks |
| **Data Visualization** | Recharts (responsive revenue by category, appointment status breakdown) |
| **Testing** | Vitest, React Testing Library, jsdom / node test runners |

---

## 📋 Prerequisites

- **Node.js**: v18.18.0 or newer (v20+ recommended)
- **Package Manager**: `npm` (v9+)
- **Database**: 
  - Standard PostgreSQL database (e.g. Neon, Supabase, RDS, or local Postgres on port 5432), OR
  - Zero-config local embedded mode (runs automatically out of the box via `@electric-sql/pglite` without requiring Docker or a running PostgreSQL daemon).

---

## 🚀 Local Setup & Quick Start

### 1. Clone & Install Dependencies
```bash
cd blush-studio
npm install --legacy-peer-deps
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Default local `.env.local` configuration:
```env
# Database: uses embedded Postgres out of the box or external connection
DATABASE_URL=pglite://./data/blush_studio_pg

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Better Auth & Session Secret
BETTER_AUTH_SECRET=dev-secret-change-in-production-32chars
BETTER_AUTH_URL=http://localhost:3000

# Seed Admin Credentials
SEED_ADMIN_EMAIL=admin@blushstudio.demo
SEED_ADMIN_PASSWORD=BlushDemo2024!
```

### 3. Generate Migrations & Seed Sample Data
Run the automated seed script to generate database tables and populate realistic Philippine salon data (categories, services, stylists, business hours, and sample bookings):
```bash
npm run db:seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Accessing Portals & Credentials

- **Customer Sanctuary Website**: [http://localhost:3000](http://localhost:3000)
- **Services Menu**: [http://localhost:3000/services](http://localhost:3000/services)
- **Online Booking Flow**: [http://localhost:3000/book](http://localhost:3000/book)
- **Admin Management Portal**: [http://localhost:3000/admin](http://localhost:3000/admin)
- **Admin Login**: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

### Demo Admin Credentials:
- **Email**: `admin@blushstudio.demo`
- **Password**: `BlushDemo2024!`
*(A 1-click "Fill Demo Admin" button is also provided directly on the login screen for effortless evaluation)*

---

## 🧪 Testing & Verification

Run the full automated unit and integration test suite:
```bash
npm run test
```
The automated test suite covers:
- Currency formatting (centavos to PHP `₱`)
- Duration conversions
- Reference number format integrity (`BLS-YYYYMMDD-XXXX`)
- Philippine phone number validation & normalization (`09XXXXXXXXX` / `+639XXXXXXXXX`)
- Admin authentication & password verification
- Availability slot calculation under Manila timezone
- Concurrent booking race conditions & double-booking prevention

---

## 🏗️ Production Build

To verify and run the optimized production build:
```bash
npm run build
npm start
```

---

## 📁 Repository Structure

```
blush-studio/
├── drizzle/                    # Generated SQL migration files
├── public/                     # Static assets and favicons
├── scripts/
│   └── seed.ts                 # Idempotent database seeder with realistic PH data
├── src/
│   ├── app/
│   │   ├── (public)/           # Customer sanctuary pages (Home, Services, Book, Lookup)
│   │   ├── admin/              # Protected management pages (Overview, Appointments, Calendar, etc.)
│   │   ├── api/                # Route Handlers for booking, admin auth, mutations
│   │   ├── globals.css         # Tailwind v4 theme tokens
│   │   └── layout.tsx          # Root HTML layout with Geist & serif font definitions
│   ├── components/
│   │   ├── admin/              # Dashboard components (nav, appointment table, calendar, charts)
│   │   ├── booking/            # 6-step interactive booking wizard
│   │   ├── public/             # Public navbar, footer, banner, logo
│   │   └── ui/                 # Accessible primitives (button, badge, card, input, textarea)
│   ├── lib/
│   │   ├── auth/               # Admin session cookies and credentials validation
│   │   ├── db/                 # Drizzle schema, PGlite/Postgres connection pooling
│   │   ├── validations/        # Zod validation schemas
│   │   └── utils.ts            # Formatting utilities (PHP currency, duration, reference numbers)
│   ├── server/
│   │   └── services/           # Core booking engine (concurrency locks, slot generation)
│   └── types/                  # Shared TypeScript interfaces
├── tests/
│   ├── integration/            # Booking conflict and persistence tests
│   └── unit/                   # Formatting, phone validation, and auth tests
├── docs/                       # Architectural, deployment, and feature documentation
├── .env.example
├── next.config.ts
└── package.json
```

---

## ⚖️ Demo Disclaimers & Attribution

- **Fictional Entity**: Blush Studio is a fictional business scenario created exclusively for demonstration purposes.
- **Simulated Payments**: Payment workflows demonstrate front-desk cash tracking and simulated GCash references. No real financial transactions are executed.
- **Attribution**: Designed and engineered by **Veltwo Studio**.
