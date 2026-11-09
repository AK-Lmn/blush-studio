import crypto from 'crypto';

export interface SessionPayload {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'demo_manager';
  visitorId: string;
  expiresAt: number;
}

const DEFAULT_SECRET = 'blush-studio-demo-production-auth-secret-32-chars-long-taguig';

function getAuthSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || DEFAULT_SECRET;
  if (secret.length < 32) {
    throw new Error('Authentication secret must be at least 32 characters long');
  }
  return secret;
}

/**
 * Creates an HMAC-SHA256 signature for the given payload string.
 */
function createSignature(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
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
