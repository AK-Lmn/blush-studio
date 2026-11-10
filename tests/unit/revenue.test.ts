// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { calculateRevenueMetrics } from '@/lib/revenue';

describe('Dashboard Revenue Metrics Calculation', () => {
  it('counts only paid non-cancelled appointments as realized revenue and tracks unpaid separately', () => {
    const sample = [
      { status: 'completed', paymentStatus: 'paid', priceCentavos: 185000 },
      { status: 'confirmed', paymentStatus: 'paid', priceCentavos: 85000 },
      { status: 'completed', paymentStatus: 'unpaid', priceCentavos: 245000 }, // Unpaid completed must NOT inflate revenue
      { status: 'pending', paymentStatus: 'unpaid', priceCentavos: 165000 },
      { status: 'cancelled', paymentStatus: 'paid', priceCentavos: 95000 }, // Cancelled excluded
      { status: 'cancelled', paymentStatus: 'unpaid', priceCentavos: 110000 }, // Cancelled excluded
    ];

    const metrics = calculateRevenueMetrics(sample);

    expect(metrics.paidRevenueCentavos).toBe(270000);
    expect(metrics.paidCount).toBe(2);
    expect(metrics.unpaidTotalCentavos).toBe(410000);
    expect(metrics.unpaidCount).toBe(2);
  });

  it('returns zero totals for empty appointments array', () => {
    expect(calculateRevenueMetrics([])).toEqual({
      paidRevenueCentavos: 0,
      paidCount: 0,
      unpaidTotalCentavos: 0,
      unpaidCount: 0,
    });
  });
});
