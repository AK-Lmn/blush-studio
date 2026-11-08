import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const ADMIN_COOKIE_NAME = 'blush_admin_session';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export async function setAdminSession(user: AdminUser) {
  const cookieStore = await cookies();
  const sessionData = JSON.stringify({
    ...user,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  });

  // Base64 encode the session payload
  const token = Buffer.from(sessionData).toString('base64');

  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getAdminSession(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(ADMIN_COOKIE_NAME);

  if (!cookie?.value) return null;

  try {
    const raw = Buffer.from(cookie.value, 'base64').toString('utf8');
    const data = JSON.parse(raw);

    if (data.expiresAt && Date.now() > data.expiresAt) {
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role || 'admin',
    };
  } catch {
    return null;
  }
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

export async function verifyAdminCredentials(email: string, password: string): Promise<AdminUser | null> {
  const seedEmail = process.env.SEED_ADMIN_EMAIL || 'admin@blushstudio.demo';
  const seedPassword = process.env.SEED_ADMIN_PASSWORD || 'BlushDemo2024!';

  // Check if credentials match seed admin
  if (email.toLowerCase() === seedEmail.toLowerCase() && password === seedPassword) {
    return {
      id: 'admin-001',
      email: seedEmail,
      name: 'Blush Studio Admin',
      role: 'admin',
    };
  }

  // Check database users & accounts
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email.toLowerCase()))
    .limit(1);

  if (user) {
    const [account] = await db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.userId, user.id))
      .limit(1);

    if (account && account.password === password) {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'admin',
      };
    }
  }

  return null;
}

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) {
    redirect('/admin/login');
  }
  return session;
}
