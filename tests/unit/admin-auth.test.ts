// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  verifyAdminCredentials,
  getAppointmentScopeCondition,
  isPrivilegedAdmin,
  AdminUser,
} from '@/lib/auth/admin-auth';
import {
  signSessionToken,
  verifySessionToken,
  signVisitorId,
  verifyVisitorId,
  SessionPayload,
} from '@/lib/auth/session-token';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

describe('Admin Authentication & Security Tests', () => {
  it('correctly hashes and verifies passwords using timing-safe scrypt', () => {
    const password = 'SuperSecureSecret2024!';
    const hash = hashPassword(password);

    expect(hash).toMatch(/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/);
    expect(verifyPassword(password, hash)).toBe(true);
    expect(verifyPassword('WrongPassword!', hash)).toBe(false);
    expect(verifyPassword('', hash)).toBe(false);
  });

  it('rejects passwords with malformed hash strings', () => {
    expect(verifyPassword('password', 'plaintext_password')).toBe(false);
    expect(verifyPassword('password', 'scrypt:short')).toBe(false);
    expect(verifyPassword('password', '')).toBe(false);
  });

  it('signs and verifies valid HMAC-SHA256 session tokens', () => {
    const payload: SessionPayload = {
      id: 'admin-001',
      email: 'admin@blushstudio.demo',
      name: 'Blush Studio Admin',
      role: 'admin',
      visitorId: 'vst_test-visitor-uuid-1',
      expiresAt: Date.now() + 1000 * 60 * 60, // 1 hour
    };

    const token = signSessionToken(payload);
    expect(token).toContain('.');

    const verified = verifySessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.id).toBe(payload.id);
    expect(verified?.email).toBe(payload.email);
    expect(verified?.role).toBe('admin');
  });

  it('strictly rejects forged or tampered session tokens', () => {
    const payload: SessionPayload = {
      id: 'guest-001',
      email: 'guest@blushstudio.demo',
      name: 'Guest User',
      role: 'demo_manager',
      visitorId: 'vst_test-visitor-uuid-2',
      expiresAt: Date.now() + 1000 * 60 * 60,
    };

    const token = signSessionToken(payload);
    const [data, signature] = token.split('.');

    // Attacker tampers with base64 payload to claim 'admin' role
    const decoded = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    decoded.role = 'admin';
    const forgedData = Buffer.from(JSON.stringify(decoded)).toString('base64url');
    const forgedToken = `${forgedData}.${signature}`;

    const verified = verifySessionToken(forgedToken);
    expect(verified).toBeNull();
  });

  it('rejects expired session tokens', () => {
    const payload: SessionPayload = {
      id: 'admin-001',
      email: 'admin@blushstudio.demo',
      name: 'Blush Studio Admin',
      role: 'admin',
      visitorId: 'vst_test-visitor-uuid-3',
      expiresAt: Date.now() - 1000, // Expired 1 second ago
    };

    const token = signSessionToken(payload);
    const verified = verifySessionToken(token);
    expect(verified).toBeNull();
  });

  it('authenticates valid administrator credentials from database', async () => {
    const admin = await verifyAdminCredentials(
      'admin@blushstudio.demo',
      'BlushDemo2024!'
    );
    expect(admin).not.toBeNull();
    expect(admin?.email).toBe('admin@blushstudio.demo');
    expect(admin?.role).toBe('admin');
  });

  it('rejects incorrect password for admin account', async () => {
    const admin = await verifyAdminCredentials(
      'admin@blushstudio.demo',
      'WrongPassword123!'
    );
    expect(admin).toBeNull();
  });

  it('rejects non-existent user credentials', async () => {
    const admin = await verifyAdminCredentials(
      'intruder@unknown.demo',
      'Password123!'
    );
    expect(admin).toBeNull();
  });

  it('enforces role permissions and visitor isolation scoping', () => {
    const adminUser: AdminUser = {
      id: 'admin-1',
      email: 'admin@blushstudio.demo',
      name: 'Studio Admin',
      role: 'admin',
      visitorId: 'vst_admin',
    };

    const demoUser: AdminUser = {
      id: 'demo-1',
      email: 'demo.manager@blushstudio.demo',
      name: 'Demo Manager',
      role: 'demo_manager',
      visitorId: 'vst_visitor_123',
    };

    expect(isPrivilegedAdmin(adminUser)).toBe(true);
    expect(isPrivilegedAdmin(demoUser)).toBe(false);

    // Admin has unrestricted scope (undefined filter)
    expect(getAppointmentScopeCondition(adminUser)).toBeUndefined();

    // Demo user has restricted SQL filter scoping to demo seed + their visitorId
    const demoCondition = getAppointmentScopeCondition(demoUser);
    expect(demoCondition).toBeDefined();
  });

  it('cryptographically signs and verifies visitor IDs to prevent cookie spoofing', () => {
    const rawVisitorId = 'vst_12345678-abcd-ef01-2345-6789abcdef01';
    const signed = signVisitorId(rawVisitorId);

    expect(signed).toContain('.');
    expect(signed.startsWith(rawVisitorId)).toBe(true);

    const verified = verifyVisitorId(signed);
    expect(verified).toBe(rawVisitorId);
  });

  it('strictly rejects forged or un-signed client-supplied visitor IDs', () => {
    // 1. Raw un-signed visitor ID (typical spoofing attempt)
    expect(verifyVisitorId('vst_victim_account_uuid')).toBeNull();

    // 2. Tampered visitor ID with mismatched signature
    const validRaw = 'vst_legitimate_visitor_uuid';
    const signed = signVisitorId(validRaw);
    const [, validSig] = signed.split('.');
    const forged = `vst_impersonated_victim_uuid.${validSig}`;

    expect(verifyVisitorId(forged)).toBeNull();

    // 3. Random invalid format
    expect(verifyVisitorId('malformed_cookie_string')).toBeNull();
    expect(verifyVisitorId('')).toBeNull();
  });
});
