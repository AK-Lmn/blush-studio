# Deployment & Production Operations Guide

**Application**: Blush Studio  
**Target Environment**: Vercel / Node.js + Hosted PostgreSQL  

---

## 1. Environment Configuration

The following environment variables are required for deployment:

| Variable | Description | Example (Production) |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@ep-blush.us-east-1.aws.neon.tech/blush_studio?sslmode=require` |
| `NEXT_PUBLIC_APP_URL` | Public canonical base URL | `https://blush-studio.vercel.app` |
| `BETTER_AUTH_SECRET` | Secret key for session encryption (32+ chars) | `generate-a-strong-random-32-byte-hex-string` |
| `BETTER_AUTH_URL` | Auth root URL | `https://blush-studio.vercel.app` |
| `SEED_ADMIN_EMAIL` | (Optional) Seed admin email for initial boot | `admin@blushstudio.demo` |
| `SEED_ADMIN_PASSWORD` | (Optional) Seed admin password for initial boot | `BlushDemo2024!` |

---

## 2. PostgreSQL Provisioning

Blush Studio is standard PostgreSQL compatible. Recommended managed database providers:
1. **Neon Serverless Postgres** (Recommended for Vercel)
2. **Supabase PostgreSQL**
3. **AWS RDS / DigitalOcean Managed PostgreSQL**

### Creating the Database:
Ensure your PostgreSQL instance supports SSL connections and has `pgcrypto` available (standard on all modern Postgres providers for `gen_random_uuid()`).

---

## 3. Database Migration & Seeding Strategy

### Step 1: Run Migrations
Run Drizzle migration against your target database:
```bash
DATABASE_URL="your-production-postgres-url" npm run db:generate
```
Or apply the committed migration file in `drizzle/0000_bent_ben_parker.sql` directly using your database console (Neon SQL Editor, Supabase SQL Editor, or `psql`).

### Step 2: Seed Initial Studio Data
To populate the database with categories, treatments, stylists, business hours, and the initial demo administrator:
```bash
DATABASE_URL="your-production-postgres-url" npm run db:seed
```

---

## 4. Vercel Deployment Steps

### Method A: Deploy via Vercel CLI
```bash
npm install -g vercel
vercel
```

### Method B: Deploy via GitHub / Git Integration
1. Push the repository to GitHub.
2. In the Vercel Dashboard, click **Add New Project** and select the repository.
3. In **Build and Output Settings**:
   - Framework Preset: `Next.js`
   - Build Command: `next build`
   - Install Command: `npm install --legacy-peer-deps`
4. In **Environment Variables**, configure:
   - `DATABASE_URL`
   - `NEXT_PUBLIC_APP_URL`
   - `BETTER_AUTH_SECRET`
   - `BETTER_AUTH_URL`
   - `SEED_ADMIN_EMAIL`
   - `SEED_ADMIN_PASSWORD`
5. Click **Deploy**.

---

## 5. Operational Security Considerations

1. **Database Connection Pooling**: When deploying to serverless environments (like Vercel functions), use Neon or Supabase connection pooling (port 6543 / pooled URL) to avoid exhausting PostgreSQL client connection limits.
2. **HTTPS & Secure Cookies**: Admin session cookies automatically enable `Secure` flags when `NODE_ENV === 'production'`.
3. **CORS & Trusted Origins**: `BETTER_AUTH_URL` should match your exact custom domain to prevent CSRF on session endpoints.
4. **Secret Hygiene**: Never commit `.env.local` to public repositories. All secrets should be managed via Vercel Environment Variables.
