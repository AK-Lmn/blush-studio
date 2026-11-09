import { NextRequest, NextResponse } from 'next/server';
import {
  verifyAdminCredentials,
  setAdminSession,
  createDemoManagerSession,
} from '@/lib/auth/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password, mode } = body;

    // Public Showcase Demo Mode: One-click safe exploration
    if (mode === 'demo') {
      const demoSession = await createDemoManagerSession();
      return NextResponse.json({
        success: true,
        user: demoSession,
        message: 'Signed in as Showcase Demo Manager',
      });
    }

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
