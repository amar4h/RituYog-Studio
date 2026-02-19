/**
 * Report Period Calculation Utility
 * Computes date ranges for various report periods.
 */

import {
  startOfWeek, endOfWeek, subWeeks,
  startOfMonth, endOfMonth, subMonths,
  startOfQuarter, endOfQuarter, subQuarters,
  startOfYear, endOfYear, subYears,
  format, parseISO,
} from 'date-fns';

export type PeriodType = 'weekly' | 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
export type PeriodOffset = 'current' | 'previous';

export interface ReportPeriod {
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
  label: string;       // Human-readable label
  periodType: PeriodType;
}

export function getReportPeriod(type: PeriodType, offset: PeriodOffset): ReportPeriod {
  const now = new Date();
  const ref = offset === 'current' ? now : getOffset(now, type);

  switch (type) {
    case 'weekly': {
      const start = startOfWeek(ref, { weekStartsOn: 1 }); // Monday
      const end = endOfWeek(ref, { weekStartsOn: 1 });      // Sunday
      return {
        startDate: fmt(start),
        endDate: fmt(end),
        label: `Week of ${format(start, 'd MMM yyyy')}`,
        periodType: type,
      };
    }
    case 'monthly': {
      const start = startOfMonth(ref);
      const end = endOfMonth(ref);
      return {
        startDate: fmt(start),
        endDate: fmt(end),
        label: format(start, 'MMMM yyyy'),
        periodType: type,
      };
    }
    case 'quarterly': {
      const start = startOfQuarter(ref);
      const end = endOfQuarter(ref);
      const q = Math.ceil((start.getMonth() + 1) / 3);
      return {
        startDate: fmt(start),
        endDate: fmt(end),
        label: `Q${q} ${format(start, 'yyyy')}`,
        periodType: type,
      };
    }
    case 'semi-annual': {
      const month = ref.getMonth(); // 0-11
      const year = ref.getFullYear();
      const isFirstHalf = month < 6;
      const start = isFirstHalf ? new Date(year, 0, 1) : new Date(year, 6, 1);
      const end = isFirstHalf ? new Date(year, 5, 30) : new Date(year, 11, 31);
      return {
        startDate: fmt(start),
        endDate: fmt(end),
        label: `${isFirstHalf ? 'H1' : 'H2'} ${year}`,
        periodType: type,
      };
    }
    case 'annual': {
      const start = startOfYear(ref);
      const end = endOfYear(ref);
      return {
        startDate: fmt(start),
        endDate: fmt(end),
        label: format(start, 'yyyy'),
        periodType: type,
      };
    }
  }
}

function getOffset(now: Date, type: PeriodType): Date {
  switch (type) {
    case 'weekly': return subWeeks(now, 1);
    case 'monthly': return subMonths(now, 1);
    case 'quarterly': return subQuarters(now, 1);
    case 'semi-annual': return subMonths(now, 6);
    case 'annual': return subYears(now, 1);
  }
}

function fmt(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** For UI select dropdown: period type options */
export const PERIOD_TYPE_OPTIONS: Array<{ value: PeriodType; label: string }> = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi-annual', label: 'Semi-Annual' },
  { value: 'annual', label: 'Annual' },
];

/** Quick preview label for the selected period */
export function getPeriodPreviewLabel(type: PeriodType, offset: PeriodOffset): string {
  const p = getReportPeriod(type, offset);
  const startFmt = format(parseISO(p.startDate), 'd MMM');
  const endFmt = format(parseISO(p.endDate), 'd MMM yyyy');
  return `${p.label} (${startFmt} - ${endFmt})`;
}
