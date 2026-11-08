# System Architecture & Technical Specifications

**Project**: Blush Studio  
**Studio**: Veltwo Studio  
**Application Type**: Single Unified Full-Stack Next.js Application  

---

## 1. High-Level Architecture Overview

Blush Studio is built as **ONE cohesive, full-stack Next.js 16 application**. It intentionally rejects microservices or decoupled Node/Express servers in favor of unified data contracts, server actions, route handlers, and shared database types.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          NEXT.JS FULL-STACK APP                        │
│                                                                        │
│   ┌───────────────────────────┐      ┌─────────────────────────────┐   │
│   │    CUSTOMER SANCTUARY     │      │     ADMIN MANAGEMENT        │   │
│   │    (Public Experience)    │      │    (Protected Dashboard)    │   │
│   │                           │      │                             │   │
│   │  • Brand Homepage         │      │  • Live KPI Analytics       │   │
│   │  • Database Service Menu  │      │  • Appointment Triage       │   │
│   │  • 6-Step Booking Wizard  │      │  • Studio Calendar (D/W)    │   │
│   │  • Booking Status Lookup  │      │  • Client & Staff Manager   │   │
│   └─────────────┬─────────────┘      └──────────────┬──────────────┘   │
│                 │                                   │                  │
│                 └─────────────────┬─────────────────┘                  │
│                                   ▼                                    │
│                 ┌───────────────────────────────────┐                  │
│                 │      APPLICATION SERVER CORE      │                  │
│                 │                                   │                  │
│                 │  • Booking Engine Service         │                  │
│                 │  • Transaction Advisory Locking   │                  │
│                 │  • Slot Calculation & Buffers     │                  │
│                 │  • Admin Auth & Session Guard     │                  │
│                 │  • Zod Validations (PH Formats)   │                  │
│                 └─────────────────┬─────────────────┘                  │
│                                   │                                    │
│                                   ▼                                    │
│                 ┌───────────────────────────────────┐                  │
│                 │            DRIZZLE ORM            │                  │
│                 │  Normalized Schema, Types, UUIDs  │                  │
│                 └─────────────────┬─────────────────┘                  │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │
                                    ▼
                 ┌───────────────────────────────────┐
                 │        POSTGRESQL DATABASE        │
                 │  • Production: Hosted Postgres    │
                 │  • Local / Demo: Embedded PGlite  │
                 └───────────────────────────────────┘
```

---

## 2. Core Application Layers

### Layer A: Presentation (Customer & Admin)
- **Customer Pages**: Fast, accessible, mobile-first pages with Tailwind CSS tokens and zero AI aesthetic tells (no purple gradients, no nested cards, balanced typography).
- **Interactive Booking Wizard**: Multi-step stateful workflow validating selections step-by-step and re-verifying slot availability on the server before database write.
- **Admin Management Console**: Dedicated dashboard shell with responsive sidebar, live metrics, filterable data tables, and quick action dialogs.

### Layer B: Server Services & Business Logic
- **`src/server/services/booking-engine.ts`**: Dedicated business logic layer containing:
  - Working schedule intersection (operating hours ∩ staff schedule)
  - Timezone calculations strictly converted to `Asia/Manila` (UTC+8) while instants are saved in UTC
  - Buffer periods (10 minutes between appointments for sanitization)
  - Minimum advance notice enforcement (2 hours minimum)
  - Maximum scheduling horizon (up to 30 days ahead)
  - Advisory locking (`pg_advisory_xact_lock`) around staff + date during booking transactions to completely prevent double-booking race conditions

### Layer C: Data Access & Schema
- **`src/lib/db/schema.ts`**: 14 normalized PostgreSQL tables:
  - `users`, `sessions`, `accounts`, `verifications` (authentication & staff security)
  - `service_categories`, `services` (treatment catalog, pricing in integer centavos)
  - `staff`, `staff_services`, `staff_schedules`, `staff_unavailable` (technicians & schedules)
  - `business_hours`, `business_settings` (studio hours, buffers, contact links)
  - `customers`, `appointments` (client profiles, booking records, payment tracking)

---

## 3. Concurrency Control & Double-Booking Prevention

Querying for overlapping appointments on the client or doing an unconstrained `select` before `insert` is vulnerable to race conditions when two clients submit simultaneous bookings for the same stylist.

Blush Studio enforces concurrency safety through **transactional advisory locking**:
1. Upon booking submission, a deterministic hash key is derived from `staffId` and the requested date:
   ```ts
   const lockKey = staffDateLockKey(input.staffId, input.date);
   ```
2. The transaction requests a Postgres transaction-scoped advisory lock:
   ```sql
   SELECT pg_advisory_xact_lock(${lockKey});
   ```
3. Inside the locked transaction, availability is re-validated against existing appointments (including buffer times):
   ```sql
   slotStart < apptEndWithBuffer AND slotEnd > apptStart
   ```
4. If an overlap is detected, the transaction aborts with a 409 conflict and safe error message.
5. If clear, the appointment and customer records are created atomically.
6. The lock automatically releases when the transaction commits or rolls back.

---

## 4. Timezone Strategy

- **Internal Database Storage**: All timestamps (`startTime`, `endTime`, `createdAt`, `updatedAt`) are persisted as UTC instants.
- **Business Operations**: Operating hours and stylist shift boundaries are evaluated in `Asia/Manila` (UTC+8).
- **Client Presentation**: Times are converted to user-friendly local strings (e.g. `2:00 PM – 3:15 PM`) using standard Intl formatting options with `timeZone: 'Asia/Manila'`.

---

## 5. Security Architecture

1. **Server-Side Authorization**: All administrative mutations (`/api/admin/*`) verify active session cookies before executing database modifications.
2. **Input Sanitization**: All incoming payloads pass through strict Zod schemas with custom regex enforcement for Philippine phone formats (`09XXXXXXXXX`).
3. **Enumeration Protection**: Public booking verification uses non-sequential reference numbers (`BLS-YYYYMMDD-XXXX`) rather than auto-incrementing integer IDs to prevent unauthorized scraping of client information.
4. **Credential Safety**: Passwords and secrets are never logged or exposed to client-side bundles.
