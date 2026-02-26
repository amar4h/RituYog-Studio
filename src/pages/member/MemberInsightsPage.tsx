import { useMemo, useEffect } from 'react';
import { useMemberAuth } from '../../hooks/useMemberAuth';
import { useFreshData } from '../../hooks/useFreshData';
import { subscriptionService, attendanceService, settingsService, memberService } from '../../services';
import { PageLoading } from '../../components/common/LoadingSpinner';
import { Card } from '../../components/common/Card';
import { getWorkingDaysInRange } from '../../utils/dateUtils';
import { ATTENDANCE_TRACKING_START_DATE } from '../../constants';
import {
  format, parseISO, subMonths, subWeeks, differenceInDays,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
} from 'date-fns';

export function MemberInsightsPage() {
  const { member, memberId, refreshMember } = useMemberAuth();

  const { isLoading } = useFreshData(['members', 'subscriptions', 'attendance', 'slots', 'settings']);

  useEffect(() => {
    if (!isLoading && !member && memberId) {
      refreshMember();
    }
  }, [isLoading, member, memberId, refreshMember]);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Active subscription that covers today
  const activeSub = useMemo(() => {
    if (!member) return null;
    return subscriptionService.getAll().find(
      s => s.memberId === member.id && s.status === 'active' && s.startDate <= today && s.endDate >= today
    ) || null;
  }, [member, today]);

  // Check if member has ever had any subscription
  const hasAnySubscription = useMemo(() => {
    if (!member) return false;
    return subscriptionService.getByMember(member.id).length > 0;
  }, [member]);

  // All subscriptions (active + expired) — full chain (only when active sub exists)
  const allMemberSubs = useMemo(() => {
    if (!member || !activeSub) return [];
    return subscriptionService.getAll().filter(
      s => s.memberId === member.id &&
        (s.status === 'active' || s.status === 'expired') &&
        s.startDate <= today
    ).sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [member, activeSub, today]);

  // Holidays from settings
  const holidays = useMemo(() => settingsService.get()?.holidays || [], []);

  // Effective start: earliest subscription start, clamped to tracking date
  const effectiveSubStart = useMemo(() => {
    if (allMemberSubs.length === 0) return '';
    const earliest = allMemberSubs.reduce((min, s) => s.startDate < min ? s.startDate : min, allMemberSubs[0].startDate);
    return earliest > ATTENDANCE_TRACKING_START_DATE ? earliest : ATTENDANCE_TRACKING_START_DATE;
  }, [allMemberSubs]);

  // Check if a date falls within any subscription period
  const isInAnySub = useMemo(() => {
    const ranges = allMemberSubs.map(s => ({ start: s.startDate, end: s.endDate }));
    return (date: string) => ranges.some(r => date >= r.start && date <= r.end);
  }, [allMemberSubs]);

  // All present dates for this member (across all slots for slot-transfer support)
  const presentDatesSet = useMemo(() => {
    if (!member) return new Set<string>();
    const records = attendanceService.getByMember(member.id);
    return new Set(records.filter(r => r.status === 'present').map(r => r.date));
  }, [member]);

  // All working days across all subscription periods up to today, excluding holidays
  const allWorkingDays = useMemo(() => {
    if (allMemberSubs.length === 0 || !effectiveSubStart) return [];
    const latestEnd = allMemberSubs.reduce((max, s) => s.endDate > max ? s.endDate : max, allMemberSubs[0].endDate);
    const endDate = today < latestEnd ? today : latestEnd;
    if (effectiveSubStart > endDate) return [];
    const workingDays = getWorkingDaysInRange(effectiveSubStart, endDate);
    return workingDays.filter(date => {
      // Must be within at least one subscription
      if (!isInAnySub(date)) return false;
      // Must not be a holiday
      return !holidays.some(h => {
        if (h.date === date) return true;
        if (h.isRecurringYearly) {
          return h.date.substring(5) === date.substring(5);
        }
        return false;
      });
    });
  }, [allMemberSubs, effectiveSubStart, today, holidays, isInAnySub]);

  // Streak calculation — calendar days (weekends/holidays don't break and DO count)
  const streakData = useMemo(() => {
    if (allWorkingDays.length === 0) {
      return { currentStreak: 0, bestStreak: 0, bestStreakStart: '', bestStreakEnd: '' };
    }

    const workingDaySet = new Set(allWorkingDays);

    // If today is a working day but not yet marked, start from yesterday
    let startPoint = today;
    if (workingDaySet.has(today) && !presentDatesSet.has(today)) {
      const d = parseISO(today);
      d.setDate(d.getDate() - 1);
      startPoint = format(d, 'yyyy-MM-dd');
    }

    // === Current streak: walk backward, count calendar days ===
    // Streak starts at the earliest present working day found (walking backward)
    // and includes all non-working days in between up to startPoint
    let currentStreak = 0;
    {
      let earliestPresent = '';
      const d = parseISO(startPoint);
      while (format(d, 'yyyy-MM-dd') >= effectiveSubStart) {
        const dateStr = format(d, 'yyyy-MM-dd');
        if (workingDaySet.has(dateStr) && !presentDatesSet.has(dateStr)) {
          break; // absent working day breaks the streak
        }
        if (workingDaySet.has(dateStr)) {
          earliestPresent = dateStr;
        }
        d.setDate(d.getDate() - 1);
      }
      if (earliestPresent) {
        currentStreak = differenceInDays(parseISO(startPoint), parseISO(earliestPresent)) + 1;
      }
    }

    // === Best streak: walk forward through calendar days ===
    // A streak starts on the first present working day, extends through
    // non-working days, and breaks on absent working days
    let bestStreak = 0;
    let bestStart = '';
    let bestEnd = '';
    {
      let runFirstPresent = '';
      let runLastDay = '';
      const d = parseISO(effectiveSubStart);

      while (true) {
        const dateStr = format(d, 'yyyy-MM-dd');
        if (dateStr > startPoint) {
          // End of scan — record final run
          if (runFirstPresent) {
            const len = differenceInDays(parseISO(runLastDay), parseISO(runFirstPresent)) + 1;
            if (len > bestStreak) {
              bestStreak = len;
              bestStart = runFirstPresent;
              bestEnd = runLastDay;
            }
          }
          break;
        }

        const isWorkingDay = workingDaySet.has(dateStr);

        if (isWorkingDay && !presentDatesSet.has(dateStr)) {
          // Absent working day — end current run
          if (runFirstPresent) {
            const len = differenceInDays(parseISO(runLastDay), parseISO(runFirstPresent)) + 1;
            if (len > bestStreak) {
              bestStreak = len;
              bestStart = runFirstPresent;
              bestEnd = runLastDay;
            }
          }
          runFirstPresent = '';
          runLastDay = '';
        } else if (isWorkingDay) {
          // Present working day — starts or extends the run
          if (!runFirstPresent) runFirstPresent = dateStr;
          runLastDay = dateStr;
        } else {
          // Non-working day — extends run if one is active
          if (runFirstPresent) runLastDay = dateStr;
        }

        d.setDate(d.getDate() + 1);
      }
    }

    return { currentStreak, bestStreak, bestStreakStart: bestStart, bestStreakEnd: bestEnd };
  }, [allWorkingDays, presentDatesSet, today, effectiveSubStart]);

  // Latest subscription end date across all subs
  const latestSubEnd = useMemo(() => {
    if (allMemberSubs.length === 0) return today;
    return allMemberSubs.reduce((max, s) => s.endDate > max ? s.endDate : max, allMemberSubs[0].endDate);
  }, [allMemberSubs, today]);

  // Weekly streak: consecutive weeks with attendance >= 3 days out of working days
  const weeklyStreakData = useMemo(() => {
    if (!member || allMemberSubs.length === 0 || !effectiveSubStart) return { currentStreak: 0, bestStreak: 0 };

    // Build a list of completed weeks (Mon-Sun) across all subscription periods up to today
    const subStart = parseISO(effectiveSubStart);
    const todayDate = parseISO(today);
    const firstMonday = startOfWeek(subStart, { weekStartsOn: 1 });

    const weeks: Array<{ present: number; total: number }> = [];
    let weekStart = firstMonday;

    while (weekStart <= todayDate) {
      const wStart = format(weekStart, 'yyyy-MM-dd');
      const wEnd = format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');

      const effectiveStart = wStart > effectiveSubStart ? wStart : effectiveSubStart;
      const effectiveEnd = wEnd < today ? wEnd : today;
      const clampedEnd = effectiveEnd < latestSubEnd ? effectiveEnd : latestSubEnd;

      if (effectiveStart <= clampedEnd) {
        // Get working days for this week, excluding holidays
        const weekWorkingDays = getWorkingDaysInRange(effectiveStart, clampedEnd).filter(date => {
          return !holidays.some(h => {
            if (h.date === date) return true;
            if (h.isRecurringYearly) return h.date.substring(5) === date.substring(5);
            return false;
          });
        });

        const presentCount = weekWorkingDays.filter(d => presentDatesSet.has(d)).length;

        // Only count weeks that are completed (past) or current week
        // A week "qualifies" if member attended >= 60% of working days (at least 3/5)
        const isCurrentWeek = wEnd >= today;
        if (!isCurrentWeek || presentCount > 0) {
          weeks.push({ present: presentCount, total: weekWorkingDays.length });
        }
      }

      // Move to next Monday
      weekStart = new Date(weekStart);
      weekStart.setDate(weekStart.getDate() + 7);
    }

    // A qualifying week: attended >= 60% of working days (e.g., 3 out of 5)
    const qualifies = (w: { present: number; total: number }) =>
      w.total > 0 && (w.present / w.total) >= 0.6;

    // Current weekly streak: walk backward from most recent completed week
    // Skip the current incomplete week for current streak calculation
    const completedWeeks = weeks.filter((_, i) => {
      // Last week might be current (incomplete) — skip it for current streak
      if (i === weeks.length - 1) {
        const lastWeekEnd = format(
          endOfWeek(new Date(firstMonday.getTime() + i * 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 }),
          'yyyy-MM-dd'
        );
        return lastWeekEnd < today; // only include if week is fully past
      }
      return true;
    });

    let currentWeeklyStreak = 0;
    for (let i = completedWeeks.length - 1; i >= 0; i--) {
      if (qualifies(completedWeeks[i])) {
        currentWeeklyStreak++;
      } else {
        break;
      }
    }

    // Best weekly streak: scan forward
    let bestWeeklyStreak = 0;
    let tempStreak = 0;
    for (const w of weeks) {
      if (qualifies(w)) {
        tempStreak++;
        if (tempStreak > bestWeeklyStreak) bestWeeklyStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }

    return { currentStreak: currentWeeklyStreak, bestStreak: bestWeeklyStreak };
  }, [member, allMemberSubs, effectiveSubStart, latestSubEnd, today, holidays, presentDatesSet]);

  // Monthly trend (last 4 months)
  const monthlyTrend = useMemo(() => {
    if (!member || allMemberSubs.length === 0 || !effectiveSubStart) return [];

    const months: Array<{
      label: string;
      present: number;
      total: number;
      rate: number;
      trend: 'up' | 'down' | 'stable' | null;
    }> = [];

    for (let i = 3; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const mStart = format(startOfMonth(monthDate), 'yyyy-MM-dd');
      const mEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd');

      const effectiveStart = mStart > effectiveSubStart ? mStart : effectiveSubStart;
      const effectiveEnd = mEnd < today ? mEnd : today;
      if (effectiveStart > effectiveEnd || effectiveStart > latestSubEnd) {
        months.push({ label: format(monthDate, 'MMM yyyy'), present: 0, total: 0, rate: 0, trend: null });
        continue;
      }

      const clampedEnd = effectiveEnd < latestSubEnd ? effectiveEnd : latestSubEnd;
      const summary = attendanceService.getMemberSummaryForPeriod(
        member.id, activeSub?.slotId || '', effectiveStart, clampedEnd
      );

      months.push({
        label: format(monthDate, 'MMM yyyy'),
        present: summary.presentDays,
        total: summary.totalWorkingDays,
        rate: summary.totalWorkingDays > 0 ? Math.round((summary.presentDays / summary.totalWorkingDays) * 100) : 0,
        trend: null,
      });
    }

    // Calculate trend arrows
    for (let i = 1; i < months.length; i++) {
      if (months[i].total === 0 || months[i - 1].total === 0) {
        months[i].trend = null;
      } else if (months[i].rate > months[i - 1].rate) {
        months[i].trend = 'up';
      } else if (months[i].rate < months[i - 1].rate) {
        months[i].trend = 'down';
      } else {
        months[i].trend = 'stable';
      }
    }

    return months;
  }, [member, allMemberSubs, activeSub, effectiveSubStart, latestSubEnd, today]);

  // Weekly consistency (last 4 weeks)
  const weeklyConsistency = useMemo(() => {
    if (!member || allMemberSubs.length === 0 || !effectiveSubStart) return [];

    const weeks: Array<{
      label: string;
      present: number;
      total: number;
      rate: number;
    }> = [];

    for (let i = 3; i >= 0; i--) {
      const weekDate = subWeeks(new Date(), i);
      const wStart = format(startOfWeek(weekDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const wEnd = format(endOfWeek(weekDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');

      const effectiveStart = wStart > effectiveSubStart ? wStart : effectiveSubStart;
      const effectiveEnd = wEnd < today ? wEnd : today;
      if (effectiveStart > effectiveEnd || effectiveStart > latestSubEnd) {
        weeks.push({ label: `Week of ${format(parseISO(wStart), 'd MMM')}`, present: 0, total: 0, rate: 0 });
        continue;
      }

      const clampedEnd = effectiveEnd < latestSubEnd ? effectiveEnd : latestSubEnd;
      const summary = attendanceService.getMemberSummaryForPeriod(
        member.id, activeSub?.slotId || '', effectiveStart, clampedEnd
      );

      weeks.push({
        label: `Week of ${format(parseISO(wStart), 'd MMM')}`,
        present: summary.presentDays,
        total: summary.totalWorkingDays,
        rate: summary.totalWorkingDays > 0 ? Math.round((summary.presentDays / summary.totalWorkingDays) * 100) : 0,
      });
    }

    return weeks;
  }, [member, allMemberSubs, activeSub, effectiveSubStart, latestSubEnd, today]);

  // Quick stats
  const quickStats = useMemo(() => {
    const workingDaysUpToToday = allWorkingDays.filter(d => d <= today);
    const totalSessions = workingDaysUpToToday.filter(d => presentDatesSet.has(d)).length;
    const totalWorkingDaysCount = workingDaysUpToToday.length;
    const avgRate = totalWorkingDaysCount > 0
      ? Math.round((totalSessions / totalWorkingDaysCount) * 100)
      : 0;

    const bestMonth = monthlyTrend.reduce((best, m) =>
      m.rate > (best?.rate || 0) ? m : best,
      null as typeof monthlyTrend[0] | null
    );

    return {
      totalSessions,
      avgRate,
      bestMonthLabel: bestMonth?.label || '--',
      bestMonthRate: bestMonth?.rate || 0,
    };
  }, [presentDatesSet, allWorkingDays, monthlyTrend, today]);

  // Ranking: compare member's attendance rate against batch and all members
  const ranking = useMemo(() => {
    if (!member || !activeSub) return null;

    // Get all active subscriptions (any member with an active sub today)
    const allSubs = subscriptionService.getAll().filter(
      s => s.status === 'active' && s.startDate <= today && s.endDate >= today
    );

    // Compute each member's attendance rate
    const memberRates: Array<{ memberId: string; slotId: string; rate: number }> = [];
    for (const sub of allSubs) {
      // Skip if member doesn't exist
      const m = memberService.getById(sub.memberId);
      if (!m) continue;
      // Avoid duplicates (same member with multiple subs)
      if (memberRates.some(r => r.memberId === sub.memberId)) continue;

      const subStart = sub.startDate > ATTENDANCE_TRACKING_START_DATE
        ? sub.startDate : ATTENDANCE_TRACKING_START_DATE;
      const subEnd = today < sub.endDate ? today : sub.endDate;
      if (subStart > subEnd) continue;

      const summary = attendanceService.getMemberSummaryForPeriod(
        sub.memberId, sub.slotId, subStart, subEnd
      );
      const rate = summary.totalWorkingDays > 0
        ? Math.round((summary.presentDays / summary.totalWorkingDays) * 100)
        : 0;
      memberRates.push({ memberId: sub.memberId, slotId: sub.slotId, rate });
    }

    // Sort descending by rate
    const allSorted = [...memberRates].sort((a, b) => b.rate - a.rate);
    const batchSorted = allSorted.filter(r => r.slotId === activeSub.slotId);

    // Find current member's position
    const allIdx = allSorted.findIndex(r => r.memberId === member.id);
    const batchIdx = batchSorted.findIndex(r => r.memberId === member.id);

    // Percentile: top X% = (position / total) * 100, rounded up
    const batchPercentile = batchSorted.length > 0 && batchIdx >= 0
      ? Math.max(1, Math.ceil(((batchIdx + 1) / batchSorted.length) * 100))
      : null;
    const studioPercentile = allSorted.length > 0 && allIdx >= 0
      ? Math.max(1, Math.ceil(((allIdx + 1) / allSorted.length) * 100))
      : null;

    // Averages
    const batchAvg = batchSorted.length > 0
      ? Math.round(batchSorted.reduce((sum, r) => sum + r.rate, 0) / batchSorted.length)
      : 0;
    const studioAvg = allSorted.length > 0
      ? Math.round(allSorted.reduce((sum, r) => sum + r.rate, 0) / allSorted.length)
      : 0;

    const myRate = quickStats.avgRate;

    return {
      batchPercentile,
      studioPercentile,
      batchAvg,
      studioAvg,
      myRate,
      batchTotal: batchSorted.length,
      studioTotal: allSorted.length,
    };
  }, [member, activeSub, today, quickStats.avgRate]);

  if (isLoading) return <PageLoading />;

  if (!member) {
    return (
      <div className="text-center py-12 text-sm text-gray-500">
        No member data available.
      </div>
    );
  }

  if (!activeSub) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Attendance Insights</h1>
        <Card>
          <div className="p-6 text-center text-sm text-gray-500">
            {hasAnySubscription ? 'Your membership has expired.' : 'No membership exists. Please contact the studio.'}
          </div>
        </Card>
      </div>
    );
  }

  const isDailyBest = streakData.currentStreak > 0 && streakData.currentStreak >= streakData.bestStreak;
  const isWeeklyBest = weeklyStreakData.currentStreak > 0 && weeklyStreakData.currentStreak >= weeklyStreakData.bestStreak;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Attendance Insights</h1>

      {/* Streak Cards — Daily & Weekly side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Daily Streak */}
        <Card>
          <div className="p-4 text-center">
            <div className="text-3xl mb-1">
              {streakData.currentStreak > 0 ? '\uD83D\uDD25' : '\u2728'}
            </div>
            <div className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              {streakData.currentStreak}
            </div>
            <div className="text-xs font-medium text-gray-700 mt-1">
              day streak
            </div>
            {streakData.bestStreak > 0 && (
              <div className="text-[10px] text-gray-400 mt-1.5">
                {isDailyBest ? (
                  <span className="text-green-600 font-medium">Your best!</span>
                ) : (
                  <>Best: {streakData.bestStreak} days</>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Weekly Streak */}
        <Card>
          <div className="p-4 text-center">
            <div className="text-3xl mb-1">
              {weeklyStreakData.currentStreak > 0 ? '\uD83D\uDCAA' : '\u2728'}
            </div>
            <div className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-500">
              {weeklyStreakData.currentStreak}
            </div>
            <div className="text-xs font-medium text-gray-700 mt-1">
              week streak
            </div>
            {weeklyStreakData.bestStreak > 0 && (
              <div className="text-[10px] text-gray-400 mt-1.5">
                {isWeeklyBest ? (
                  <span className="text-green-600 font-medium">Your best!</span>
                ) : (
                  <>Best: {weeklyStreakData.bestStreak} weeks</>
                )}
              </div>
            )}
            <div className="text-[9px] text-gray-300 mt-0.5">3+ days/week</div>
          </div>
        </Card>
      </div>

      {/* Quick Stats Row */}
      <Card>
        <div className="p-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
            <div>
              <div className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-indigo-500">{quickStats.totalSessions}</div>
              <div className="text-xs text-gray-500">Total Sessions</div>
            </div>
            <div>
              <div className="text-2xl font-black text-green-600">{quickStats.bestMonthRate}%</div>
              <div className="text-xs text-gray-500 truncate">{quickStats.bestMonthLabel}</div>
              <div className="text-[10px] text-gray-400">Best Month</div>
            </div>
            <div>
              <div className={`text-2xl font-black ${quickStats.avgRate >= 80 ? 'text-green-600' : quickStats.avgRate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                {quickStats.avgRate}%
              </div>
              <div className="text-xs text-gray-500">Average</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Your Standing — Percentile Ranking */}
      {ranking && ranking.batchPercentile !== null && (
        <Card>
          <div className="p-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Your Standing</h3>
            <div className="space-y-4">
              {/* Batch rank */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-700">In Your Batch</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    ranking.batchPercentile <= 25 ? 'bg-green-100 text-green-700'
                      : ranking.batchPercentile <= 50 ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-gray-100 text-gray-600'
                  }`}>
                    Top {ranking.batchPercentile}%
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 bg-gray-100/80 rounded-full h-2.5 relative">
                    <div
                      className="h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                      style={{ width: `${ranking.myRate}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-indigo-600 w-10 text-right">{ranking.myRate}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5 relative">
                    <div
                      className="h-1.5 rounded-full bg-gray-300 transition-all"
                      style={{ width: `${ranking.batchAvg}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 w-10 text-right">avg {ranking.batchAvg}%</span>
                </div>
              </div>

              {/* Studio rank */}
              {ranking.studioPercentile !== null && ranking.studioTotal > ranking.batchTotal && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-700">Across All Batches</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      ranking.studioPercentile <= 25 ? 'bg-green-100 text-green-700'
                        : ranking.studioPercentile <= 50 ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-100 text-gray-600'
                    }`}>
                      Top {ranking.studioPercentile}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 bg-gray-100/80 rounded-full h-2.5 relative">
                      <div
                        className="h-2.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                        style={{ width: `${ranking.myRate}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-purple-600 w-10 text-right">{ranking.myRate}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5 relative">
                      <div
                        className="h-1.5 rounded-full bg-gray-300 transition-all"
                        style={{ width: `${ranking.studioAvg}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 w-10 text-right">avg {ranking.studioAvg}%</span>
                  </div>
                </div>
              )}

              {/* Contextual message */}
              <div className="text-[10px] text-gray-400 text-center pt-1">
                {ranking.myRate > ranking.batchAvg
                  ? 'Above your batch average!'
                  : ranking.myRate === ranking.batchAvg
                    ? 'Right at batch average — push a bit more!'
                    : 'Keep showing up to climb higher!'}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Monthly Trend */}
      <Card>
        <div className="p-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Monthly Trend</h3>
          <div className="space-y-3">
            {monthlyTrend.map(m => (
              <div key={m.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700 font-medium">{m.label}</span>
                  <div className="flex items-center gap-1">
                    {m.trend === 'up' && <span className="text-green-500 text-xs">{'\u25B2'}</span>}
                    {m.trend === 'down' && <span className="text-red-400 text-xs">{'\u25BC'}</span>}
                    {m.trend === 'stable' && <span className="text-gray-400 text-xs">{'\u2014'}</span>}
                    <span className={`font-semibold ${
                      m.rate >= 80 ? 'text-green-600' : m.rate >= 50 ? 'text-amber-600' : 'text-red-500'
                    }`}>
                      {m.total > 0 ? `${m.rate}%` : '--'}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-100/80 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      m.rate >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : m.rate >= 50 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-red-500 to-red-400'
                    }`}
                    style={{ width: `${m.total > 0 ? m.rate : 0}%` }}
                  />
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">{m.present}/{m.total} days</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Weekly Consistency */}
      <Card>
        <div className="p-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Last 4 Weeks</h3>
          <div className="space-y-2.5">
            {weeklyConsistency.map(w => (
              <div key={w.label} className="flex items-center justify-between">
                <span className="text-xs text-gray-600 flex-shrink-0">{w.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    {w.total > 0 ? `${w.present}/${w.total}` : '--'}
                  </span>
                  <span className={`text-xs font-semibold w-10 text-right ${
                    w.rate >= 80 ? 'text-green-600' : w.rate >= 50 ? 'text-amber-600' : 'text-red-500'
                  }`}>
                    {w.total > 0 ? `${w.rate}%` : '--'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Motivational Footer */}
      <div className="text-center text-xs text-gray-400 py-2">
        {streakData.currentStreak >= 10
          ? 'Incredible discipline! Keep it going!'
          : streakData.currentStreak >= 5
            ? 'Great consistency! You\'re on a roll!'
            : streakData.currentStreak >= 1
              ? 'Keep showing up. Every session counts!'
              : 'Start a new streak today!'}
      </div>
    </div>
  );
}
