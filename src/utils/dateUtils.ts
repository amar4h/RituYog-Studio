/**
 * Date Utility Functions
 */

import { format, parseISO, addDays as dateAddDays, addMonths as dateAddMonths, differenceInDays, isWeekend, startOfMonth, endOfMonth, isAfter, isBefore, isEqual } from 'date-fns';

// Re-export addDays with our signature
export function addDays(dateString: string, days: number): string {
  return format(dateAddDays(parseISO(dateString), days), 'yyyy-MM-dd');
}

// Add months to a date string
export function addMonths(dateString: string, months: number): string {
  return format(dateAddMonths(parseISO(dateString), months), 'yyyy-MM-dd');
}

// Calculate subscription end date (start + months - 1 day)
// For example: Jan 1 + 1 month = Jan 31 (not Feb 1)
export function calculateSubscriptionEndDate(startDate: string, durationMonths: number): string {
  const endPlusOne = dateAddMonths(parseISO(startDate), durationMonths);
  return format(dateAddDays(endPlusOne, -1), 'yyyy-MM-dd');
}

// ============================================
// DATE FORMATTING
// ============================================

export function formatDate(dateString: string): string {
  try {
    return format(parseISO(dateString), 'dd MMM yyyy');
  } catch {
    return dateString;
  }
}

export function formatDateLong(dateString: string): string {
  try {
    return format(parseISO(dateString), 'EEEE, dd MMMM yyyy');
  } catch {
    return dateString;
  }
}

export function formatDateShort(dateString: string): string {
  try {
    return format(parseISO(dateString), 'dd/MM/yyyy');
  } catch {
    return dateString;
  }
}

// Use getDayNameShort() for string format ('Mon', 'Tue', etc.)
// Use getDayOfWeek() for numeric format (0-6, where 0 is Sunday)

// Compact date format: "20 Jan" or "20 Jan 2026" if different year
export function formatDateCompact(dateString: string): string {
  try {
    const date = parseISO(dateString);
    const currentYear = new Date().getFullYear();
    const dateYear = date.getFullYear();
    if (dateYear === currentYear) {
      return format(date, 'd MMM');
    }
    return format(date, 'd MMM yyyy');
  } catch {
    return dateString;
  }
}

export function formatTime(timeString: string): string {
  // Convert HH:mm to 12-hour format
  const [hours, minutes] = timeString.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function formatDateTime(dateString: string): string {
  try {
    return format(parseISO(dateString), 'dd MMM yyyy, h:mm a');
  } catch {
    return dateString;
  }
}

// ============================================
// DATE CALCULATIONS
// ============================================

export function getToday(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function getTomorrow(): string {
  return format(dateAddDays(new Date(), 1), 'yyyy-MM-dd');
}

export function addDaysToDate(dateString: string, days: number): string {
  return format(dateAddDays(parseISO(dateString), days), 'yyyy-MM-dd');
}

export function getDaysBetween(startDate: string, endDate: string): number {
  return differenceInDays(parseISO(endDate), parseISO(startDate));
}

export function getDaysRemaining(endDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = parseISO(endDate);
  return differenceInDays(end, today);
}

export function isExpired(endDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return isBefore(parseISO(endDate), today);
}

export function isExpiringSoon(endDate: string, daysThreshold: number = 7): boolean {
  const remaining = getDaysRemaining(endDate);
  return remaining >= 0 && remaining <= daysThreshold;
}

// ============================================
// WORKING DAY UTILITIES
// ============================================

export function isExtraWorkingDay(dateString: string, extraWorkingDays: { date: string }[] = []): boolean {
  return extraWorkingDays.some(d => d.date === dateString);
}

export function isWorkingDay(dateString: string, holidays: { date: string; name: string }[] = [], extraWorkingDays: { date: string }[] = []): boolean {
  // Extra working days always count (override both weekends and holidays)
  if (isExtraWorkingDay(dateString, extraWorkingDays)) {
    return true;
  }
  const date = parseISO(dateString);
  if (isWeekend(date)) {
    return false;
  }
  const isHolidayDate = holidays.some(h => h.date === dateString);
  return !isHolidayDate;
}

export function isHoliday(dateString: string, holidays: { date: string; name: string }[]): boolean {
  return holidays.some(h => h.date === dateString);
}

export function getHolidayName(dateString: string, holidays: { date: string; name: string }[]): string | null {
  const holiday = holidays.find(h => h.date === dateString);
  return holiday ? holiday.name : null;
}

export function getNextWorkingDay(dateString: string, extraWorkingDays: { date: string }[] = []): string {
  let date = parseISO(dateString);
  date = dateAddDays(date, 1);
  while (isWeekend(date) && !isExtraWorkingDay(format(date, 'yyyy-MM-dd'), extraWorkingDays)) {
    date = dateAddDays(date, 1);
  }
  return format(date, 'yyyy-MM-dd');
}

export function getWorkingDaysInRange(startDate: string, endDate: string, extraWorkingDays: { date: string }[] = []): string[] {
  const result: string[] = [];
  let current = parseISO(startDate);
  const end = parseISO(endDate);

  while (!isAfter(current, end)) {
    const dateStr = format(current, 'yyyy-MM-dd');
    if (!isWeekend(current) || isExtraWorkingDay(dateStr, extraWorkingDays)) {
      result.push(dateStr);
    }
    current = dateAddDays(current, 1);
  }

  return result;
}

export function getNextNWorkingDays(n: number, fromDate?: string, extraWorkingDays: { date: string }[] = []): string[] {
  const result: string[] = [];
  let current = fromDate ? parseISO(fromDate) : new Date();

  while (result.length < n) {
    const dateStr = format(current, 'yyyy-MM-dd');
    if (!isWeekend(current) || isExtraWorkingDay(dateStr, extraWorkingDays)) {
      result.push(dateStr);
    }
    current = dateAddDays(current, 1);
  }

  return result;
}

/**
 * Count working days (Mon-Fri + extra working days) in a date range
 */
export function getWorkingDaysCount(startDate: string, endDate: string, extraWorkingDays: { date: string }[] = []): number {
  return getWorkingDaysInRange(startDate, endDate, extraWorkingDays).length;
}

/**
 * Count working days within a period, but only for dates that fall within subscription dates
 * This is used to calculate total possible attendance days for a member
 */
export function getWorkingDaysCountForSubscription(
  periodStart: string,
  periodEnd: string,
  subscriptionStart: string,
  subscriptionEnd: string,
  extraWorkingDays: { date: string }[] = []
): number {
  // Find the overlap between period and subscription
  const effectiveStart = periodStart > subscriptionStart ? periodStart : subscriptionStart;
  const effectiveEnd = periodEnd < subscriptionEnd ? periodEnd : subscriptionEnd;

  // If no overlap, return 0
  if (effectiveStart > effectiveEnd) {
    return 0;
  }

  return getWorkingDaysCount(effectiveStart, effectiveEnd, extraWorkingDays);
}

// ============================================
// MONTH UTILITIES
// ============================================

export function getMonthStart(dateString?: string): string {
  const date = dateString ? parseISO(dateString) : new Date();
  return format(startOfMonth(date), 'yyyy-MM-dd');
}

export function getMonthEnd(dateString?: string): string {
  const date = dateString ? parseISO(dateString) : new Date();
  return format(endOfMonth(date), 'yyyy-MM-dd');
}

export function getCurrentMonthRange(): { start: string; end: string } {
  return {
    start: getMonthStart(),
    end: getMonthEnd(),
  };
}

// ============================================
// DATE COMPARISON
// ============================================

export function isDateInRange(dateString: string, startDate: string, endDate: string): boolean {
  const date = parseISO(dateString);
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  return (isAfter(date, start) || isEqual(date, start)) && (isBefore(date, end) || isEqual(date, end));
}

export function isSameDay(date1: string, date2: string): boolean {
  return date1 === date2;
}

export function isBeforeToday(dateString: string): boolean {
  const date = parseISO(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return isBefore(date, today);
}

export function isAfterToday(dateString: string): boolean {
  const date = parseISO(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return isAfter(date, today);
}

// ============================================
// DAY OF WEEK
// ============================================

export function getDayOfWeek(dateString: string): number {
  return parseISO(dateString).getDay();
}

export function getDayName(dateString: string): string {
  return format(parseISO(dateString), 'EEEE');
}

export function getDayNameShort(dateString: string): string {
  return format(parseISO(dateString), 'EEE');
}

// ============================================
// AGE CALCULATION
// ============================================

export function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = parseISO(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

// ============================================
// RELATIVE TIME
// ============================================

export function getRelativeTime(dateString: string): string {
  const days = getDaysRemaining(dateString);

  if (days < 0) {
    const absDays = Math.abs(days);
    if (absDays === 1) return 'Yesterday';
    if (absDays < 7) return `${absDays} days ago`;
    if (absDays < 30) return `${Math.floor(absDays / 7)} weeks ago`;
    return `${Math.floor(absDays / 30)} months ago`;
  }

  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `In ${days} days`;
  if (days < 30) return `In ${Math.floor(days / 7)} weeks`;
  return `In ${Math.floor(days / 30)} months`;
}
