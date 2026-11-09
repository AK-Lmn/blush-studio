import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq, or } from 'drizzle-orm';
import { verifyPassword } from './password';
import {
  signSessionToken,
  verifySessionToken,
  signVisitorId,
  verifyVisitorId,
  resolveVisitorIdentity,
  VisitorIdentity,
  SessionPayload,
} from './session-token';
import crypto from 'crypto';

export const ADMIN_COOKIE_NAME = 'blush_admin_session';
export const VISITOR_COOKIE_NAME = 'blush_visitor_id';

export { resolveVisitorIdentity, signVisitorId, verifyVisitorId };
export type { VisitorIdentity };

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'demo_manager';
  visitorId: string;
}

/**
 * Retrieves the current visitor ID from cookie or generates a new one.
 * Uses shared resolveVisitorIdentity to ensure valid HMAC signatures and raw IDs.
 */
export async function getVisitorId(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const existing = cookieStore.get(VISITOR_COOKIE_NAME)?.value;
    const identity = resolveVisitorIdentity(existing);

    if (identity.isNew) {
      try {
        cookieStore.set(VISITOR_COOKIE_NAME, identity.signedCookie, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });
      } catch {
        // Read-only server components cannot modify response cookies
      }
    }

    return identity.rawId;
  } catch {
    return `vst_test_${crypto.randomUUID()}`;
  }
}

/**
 * Creates and sets a cryptographically signed HMAC-SHA256 session cookie.
 */
export async function setAdminSession(user: AdminUser) {
  try {
    const cookieStore = await cookies();
    const payload: SessionPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      visitorId: user.visitorId,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
    };

    const token = signSessionToken(payload);

    cookieStore.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
  } catch {
    // In environments where cookies() throws
  }
}

/**
 * Validates and retrieves the active session from cookie.
 * Rejects forged, altered, or expired tokens immediately.
 */
export async function getAdminSession(): Promise<AdminUser | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(ADMIN_COOKIE_NAME);

    if (!cookie?.value) return null;

    const payload = verifySessionToken(cookie.value);
    if (!payload) return null;

    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      visitorId: payload.visitorId,
    };
  } catch {
    return null;
  }
}

/**
 * Clears the session cookie on logout.
 */
export async function clearAdminSession() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(ADMIN_COOKIE_NAME);
  } catch {}
}

/**
 * Verifies credentials against the database using scrypt hash verification.
 * Does NOT compare plaintext passwords.
 */
export async function verifyAdminCredentials(
  email: string,
  password: string
): Promise<AdminUser | null> {
  if (!email || !password) return null;

  const visitorId = await getVisitorId();
  const normalizedEmail = email.toLowerCase().trim();

  // Query database user record
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, normalizedEmail))
    .limit(1);

  if (!user) return null;

  // Retrieve hashed credentials
  const [account] = await db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.userId, user.id))
    .limit(1);

  if (!account || !account.password) return null;

  // Verify against scrypt hash
  const isValid = verifyPassword(password, account.password);
  if (!isValid) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: (user.role as any) === 'admin' ? 'admin' : 'demo_manager',
    visitorId,
  };
}

/**
 * Creates a restricted Demo Manager session for public showcase visitors.
 * Allows prospective clients to explore the dashboard without administrative write access.
 */
export async function createDemoManagerSession(): Promise<AdminUser> {
  const visitorId = await getVisitorId();
  const demoUser: AdminUser = {
    id: `demo-${visitorId.slice(4, 12)}`,
    email: 'demo.manager@blushstudio.demo',
    name: 'Demo Manager',
    role: 'demo_manager',
    visitorId,
  };

  await setAdminSession(demoUser);
  return demoUser;
}

/**
 * Route protection: requires a valid signed session or redirects to login.
 */
export async function requireAdminSession(): Promise<AdminUser> {
  const session = await getAdminSession();
  if (!session) {
    redirect('/admin/login');
  }
  return session;
}

/**
 * Authorization check for destructive or privileged operations.
 * Returns true only for authenticated administrators (not demo visitors).
 */
export function isPrivilegedAdmin(session: AdminUser): boolean {
  return session.role === 'admin';
}

/**
 * Returns a Drizzle SQL filter expression that scopes appointments to:
 * - Baseline seeded demo records, PLUS
 * - Any appointments created by this specific visitor.
 * Completely isolates visitor demo bookings from other simultaneous visitors.
 */
export function getAppointmentScopeCondition(session: AdminUser) {
  if (session.role === 'admin') {
    return undefined;
  }
  return or(
    eq(schema.appointments.isDemoSeed, true),
    eq(schema.appointments.visitorId, session.visitorId)
  );
}
