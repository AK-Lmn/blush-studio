import { NextRequest, NextResponse } from 'next/server';
import { createBooking } from '@/server/services/booking-engine';
import { bookingSchema } from '@/lib/validations';
import { VISITOR_COOKIE_NAME, resolveVisitorIdentity } from '@/lib/auth/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = bookingSchema.safeParse(body);

    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return NextResponse.json(
        { error: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Validation error' },
        { status: 400 }
      );
    }

    // Single source of truth: extract and verify visitor identity
    const cookieValue = request.cookies.get(VISITOR_COOKIE_NAME)?.value;
    const { rawId, signedCookie } = resolveVisitorIdentity(cookieValue);

    // Pass authoritative raw ID (<= 40 chars) to prevent DB varchar(64) truncation
    const result = await createBooking({
      ...parseResult.data,
      visitorId: rawId,
    } as any);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Booking could not be confirmed' },
        { status: 409 }
      );
    }

    const response = NextResponse.json(result, { status: 201 });

    // Always ensure the client receives the cryptographic HMAC-SHA256 signed cookie
    response.cookies.set(VISITOR_COOKIE_NAME, signedCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error: any) {
    console.error('API create booking error:', error);
    return NextResponse.json(
      { error: 'Internal server error while processing booking' },
      { status: 500 }
    );
  }
}
