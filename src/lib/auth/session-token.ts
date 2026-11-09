import crypto from 'crypto';

export interface SessionPayload {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'demo_manager';
  visitorId: string;
  expiresAt: number;
}

export interface VisitorIdentity {
  /** Authoritative raw visitor identifier (e.g. "vst_<uuid>", <= 40 chars) safe for DB column varchar(64) */
  rawId: string;
  /** HMAC-SHA256 cryptographically signed cookie representation (<rawId>.<signature>, ~84 chars) */
  signedCookie: string;
  /** Flag indicating whether the cookie should be written/refreshed on the response */
  isNew: boolean;
}

function getAuthSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET;
  if (secret) {
    if (secret.length < 32) {
      throw new Error('[Security Error] BETTER_AUTH_SECRET must be at least 32 characters long');
    }
    return secret;
  }

  // In production or Vercel deployment, strictly fail safely without predictable fallbacks
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    throw new Error(
      '[Security Error] BETTER_AUTH_SECRET or AUTH_SECRET environment variable is required in production. Configured secret must be at least 32 characters long.'
    );
  }

  // Strictly in local unit test / dev environment only
  return 'blush_dev_fixture_signing_secret_for_vitest_min_32_chars';
}

/**
 * Creates an HMAC-SHA256 signature for the given payload string.
 */
function createSignature(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

/**
 * Cryptographically signs a visitor ID using HMAC-SHA256.
 * Format: <rawVisitorId>.<signature>
 */
export function signVisitorId(visitorId: string): string {
  const secret = getAuthSecret();
  const signature = createSignature(visitorId, secret);
  return `${visitorId}.${signature}`;
}

/**
 * Verifies the cryptographic HMAC-SHA256 signature on a visitor ID.
 * Returns the verified raw visitor ID string, or null if tampered, forged, or missing.
 */
export function verifyVisitorId(signedValue: string): string | null {
  if (!signedValue || typeof signedValue !== 'string') return null;

  const parts = signedValue.split('.');
  if (parts.length !== 2) return null;

  const [rawId, signature] = parts;
  if (!rawId || !signature || !rawId.startsWith('vst_')) return null;

  try {
    const secret = getAuthSecret();
    const expectedSignature = createSignature(rawId, secret);

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    return rawId;
  } catch {
    return null;
  }
}

/**
 * Single source of truth for resolving visitor identity across the application:
 * - Valid signed cookie -> verifies signature, extracts and returns the raw visitor ID.
 * - Legacy or pre-existing raw 'vst_' cookie -> adopts the raw ID and signs it so identity is preserved seamlessly.
 * - Missing, tampered, forged, or invalid cookie -> generates a fresh raw ID and signs it.
 *
 * Ensures:
 * 1. Database column `appointments.visitor_id` (varchar 64) ONLY receives rawId (<= 40 chars).
 * 2. Client cookies ALWAYS store the HMAC-SHA256 signed value.
 * 3. Lookup and admin dashboard queries always compare rawId against rawId.
 */
export function resolveVisitorIdentity(cookieValue?: string | null): VisitorIdentity {
  if (cookieValue && typeof cookieValue === 'string') {
    const trimmed = cookieValue.trim();

    // 1. Valid signed cookie (<rawId>.<signature>)
    const verified = verifyVisitorId(trimmed);
    if (verified) {
      return {
        rawId: verified,
        signedCookie: trimmed,
        isNew: false,
      };
    }

    // 2. Unsigned legacy or client-generated 'vst_' cookie without signature
    // Adopt the raw ID so existing user bookings aren't lost when upgrading to signed format
    if (trimmed.startsWith('vst_') && !trimmed.includes('.') && trimmed.length <= 64) {
      const signed = signVisitorId(trimmed);
      return {
        rawId: trimmed,
        signedCookie: signed,
        isNew: true, // Needs cookie update on client
      };
    }
  }

  // 3. Missing, tampered, or invalid: generate fresh identity
  const rawId = `vst_${crypto.randomUUID()}`;
  const signedCookie = signVisitorId(rawId);
  return {
    rawId,
    signedCookie,
    isNew: true,
  };
}

/**
 * Signs a session payload and returns a tamper-proof session token.
 */
export function signSessionToken(payload: SessionPayload): string {
  const secret = getAuthSecret();
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createSignature(data, secret);
  return `${data}.${signature}`;
}

/**
 * Verifies the HMAC-SHA256 signature and expiration of a session token.
 * Returns null if the token is invalid, tampered, or expired.
 */
export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [data, signature] = parts;
  if (!data || !signature) return null;

  try {
    const secret = getAuthSecret();
    const expectedSignature = createSignature(data, secret);

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    const jsonStr = Buffer.from(data, 'base64url').toString('utf8');
    const payload = JSON.parse(jsonStr) as SessionPayload;

    if (!payload.id || !payload.email || !payload.role || !payload.expiresAt) {
      return null;
    }

    if (Date.now() > payload.expiresAt) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}
