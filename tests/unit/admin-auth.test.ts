// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { verifyAdminCredentials } from '@/lib/auth/admin-auth';

describe('Admin Authentication Tests', () => {
  it('authenticates valid seed administrator credentials', async () => {
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
      'WrongPassword123'
    );
    expect(admin).toBeNull();
  });

  it('rejects non-existent user credentials', async () => {
    const admin = await verifyAdminCredentials(
      'intruder@unknown.demo',
      'Password123'
    );
    expect(admin).toBeNull();
  });
});
