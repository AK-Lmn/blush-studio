import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminCredentials, setAdminSession } from '@/lib/auth/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const admin = await verifyAdminCredentials(email, password);

    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid admin credentials' },
        { status: 401 }
      );
    }

    await setAdminSession(admin);
    return NextResponse.json({ success: true, user: admin });
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Internal login error' },
      { status: 500 }
    );
  }
}
