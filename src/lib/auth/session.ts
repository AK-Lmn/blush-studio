import { auth } from '@/lib/auth/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session?.user) {
    redirect('/admin/login');
  }
  return session;
}
