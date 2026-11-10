/**
 * Revenue calculation helper ensuring only paid, non-cancelled appointments
 * contribute to realized studio revenue, while unpaid bookings are tracked separately.
 */

export interface RevenueMetrics {
  paidRevenueCentavos: number;
  paidCount: number;
  unpaidTotalCentavos: number;
  unpaidCount: number;
}

export function calculateRevenueMetrics(
  appointments: Array<{
    status: string;
    paymentStatus: string;
    priceCentavos: number;
  }>
): RevenueMetrics {
  let paidRevenueCentavos = 0;
  let paidCount = 0;
  let unpaidTotalCentavos = 0;
  let unpaidCount = 0;

  for (const appt of appointments) {
    if (appt.status === 'cancelled') continue;

    if (appt.paymentStatus === 'paid') {
      paidRevenueCentavos += appt.priceCentavos;
      paidCount += 1;
    } else if (appt.paymentStatus === 'unpaid') {
      unpaidTotalCentavos += appt.priceCentavos;
      unpaidCount += 1;
    }
  }

  return {
    paidRevenueCentavos,
    paidCount,
    unpaidTotalCentavos,
    unpaidCount,
  };
}
