import { describe, it, expect } from 'vitest';
import {
  formatPrice,
  formatDuration,
  generateReferenceNumber,
  formatPhoneNumber,
} from '@/lib/utils';
import { phoneSchema, bookingSchema } from '@/lib/validations';

describe('Utility & Validation Tests', () => {
  describe('formatPrice', () => {
    it('correctly converts centavos to formatted Philippine Pesos', () => {
      expect(formatPrice(150000)).toContain('1,500.00');
      expect(formatPrice(85000)).toContain('850.00');
      expect(formatPrice(280000)).toContain('2,800.00');
    });

    it('handles zero and fractional amounts', () => {
      expect(formatPrice(0)).toContain('0.00');
      expect(formatPrice(50)).toContain('0.50');
    });
  });

  describe('formatDuration', () => {
    it('formats exact minutes under an hour', () => {
      expect(formatDuration(45)).toBe('45 min');
      expect(formatDuration(30)).toBe('30 min');
    });

    it('formats exact hours', () => {
      expect(formatDuration(60)).toBe('1 hr');
      expect(formatDuration(120)).toBe('2 hr');
    });

    it('formats combination of hours and minutes', () => {
      expect(formatDuration(75)).toBe('1 hr 15 min');
      expect(formatDuration(90)).toBe('1 hr 30 min');
    });
  });

  describe('generateReferenceNumber', () => {
    it('produces public-safe reference number in correct BLS format', () => {
      const ref = generateReferenceNumber();
      expect(ref).toMatch(/^BLS-\d{8}-[A-Z0-9]{4}$/);
    });

    it('produces unique references across calls', () => {
      const refs = new Set(Array.from({ length: 50 }, () => generateReferenceNumber()));
      expect(refs.size).toBe(50);
    });
  });

  describe('formatPhoneNumber', () => {
    it('formats standard 11-digit Philippine numbers', () => {
      expect(formatPhoneNumber('09171234567')).toBe('0917 123 4567');
    });

    it('formats +63 international format', () => {
      expect(formatPhoneNumber('639171234567')).toBe('+63 917 123 4567');
    });
  });

  describe('phoneSchema validation', () => {
    it('accepts valid 11-digit 09xx numbers', () => {
      const result = phoneSchema.safeParse('09171234567');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('09171234567');
      }
    });

    it('accepts numbers with dashes and spaces and normalizes them', () => {
      const result = phoneSchema.safeParse('0917-123-4567');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('09171234567');
      }
    });

    it('rejects invalid or too short numbers', () => {
      expect(phoneSchema.safeParse('12345').success).toBe(false);
      expect(phoneSchema.safeParse('08171234567').success).toBe(false);
      expect(phoneSchema.safeParse('letters').success).toBe(false);
    });
  });
});
