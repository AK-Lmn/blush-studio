import { NextRequest, NextResponse } from 'next/server';
import { getAvailableStaffForService } from '@/server/services/booking-engine';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('serviceId');

    if (!serviceId) {
      return NextResponse.json(
        { error: 'serviceId query parameter is required' },
        { status: 400 }
      );
    }

    const staffList = await getAvailableStaffForService(serviceId);
    return NextResponse.json({ staff: staffList });
  } catch (error: any) {
    if (error?.statusCode === 404 || error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message || 'Service not found' },
        { status: 404 }
      );
    }
    console.error('Error fetching staff for service:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve available staff' },
      { status: 500 }
    );
  }
}
