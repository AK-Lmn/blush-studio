import { NextRequest, NextResponse } from 'next/server';
import { createBooking } from '@/server/services/booking-engine';
import { bookingSchema } from '@/lib/validations';

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

    const result = await createBooking(parseResult.data as any);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Booking could not be confirmed' },
        { status: 409 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('API create booking error:', error);
    return NextResponse.json(
      { error: 'Internal server error while processing booking' },
      { status: 500 }
    );
  }
}
