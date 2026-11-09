import { NextRequest, NextResponse } from 'next/server';
import { getAvailableSlots } from '@/server/services/booking-engine';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('serviceId');
    const staffId = searchParams.get('staffId');
    const date = searchParams.get('date'); // YYYY-MM-DD

    if (!serviceId || !staffId || !date) {
      return NextResponse.json(
        { error: 'serviceId, staffId, and date (YYYY-MM-DD) are required' },
        { status: 400 }
      );
    }

    const slots = await getAvailableSlots(serviceId, staffId, date);
    return NextResponse.json({ slots });
  } catch (error: any) {
    const status = error.statusCode || (error.message?.includes('not found') ? 404 : 400);
    if (status === 400 || status === 404) {
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error('Error fetching available slots:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate available slots' },
      { status: 500 }
    );
  }
}
