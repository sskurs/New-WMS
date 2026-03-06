
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { formatDate, formatDateTime, formatTime } from '@/api/utils';

describe('Date/Time Formatting Utilities', () => {
  // Set a consistent timezone for all tests in this file
  beforeAll(() => {
    process.env.TZ = 'UTC';
  });

  afterAll(() => {
    delete process.env.TZ;
  });

  describe('formatDate', () => {
    it('formats a valid date string correctly', () => {
      expect(formatDate('2023-10-27T10:00:00Z')).toBe('27/10/2023');
    });

    it('formats a valid Date object correctly', () => {
      // Note: Month is 0-indexed in new Date()
      const date = new Date(2024, 4, 15); // May 15, 2024
      expect(formatDate(date)).toBe('15/05/2024');
    });

    it('returns "N/A" for null or undefined input', () => {
      expect(formatDate(null)).toBe('N/A');
      expect(formatDate(undefined)).toBe('N/A');
    });

    it('returns "Invalid Date" for an invalid date string', () => {
      expect(formatDate('not-a-date')).toBe('Invalid Date');
    });
  });

  describe('formatTime', () => {
    it('formats a valid date string correctly', () => {
      // 2023-10-27T16:30:00Z is 4:30 PM UTC
      expect(formatTime('2023-10-27T16:30:00Z')).toBe('4:30 PM');
    });
  });
  
  describe('formatDateTime', () => {
    it('formats a valid date string correctly', () => {
       // 2023-10-27T09:05:00Z is 9:05 AM UTC
      expect(formatDateTime('2023-10-27T09:05:00Z')).toBe('27/10/2023, 9:05 AM');
    });
  });
});
