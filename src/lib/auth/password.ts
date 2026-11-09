import crypto from 'crypto';

/**
 * Derives a cryptographic hash using Node.js scrypt with unique salt.
 * Stored format: scrypt:<salt>:<derivedKeyHex>
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verifies password against stored scrypt hash using timing-safe comparison.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.startsWith('scrypt:')) {
    return false;
  }
  const parts = storedHash.split(':');
  if (parts.length !== 3) return false;
  const [, salt, expectedKey] = parts;
  try {
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const expectedBuffer = Buffer.from(expectedKey, 'hex');
    if (expectedBuffer.length !== derivedKey.length) return false;
    return crypto.timingSafeEqual(expectedBuffer, derivedKey);
  } catch {
    return false;
  }
}
