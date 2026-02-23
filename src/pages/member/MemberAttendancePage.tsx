import { useState, useMemo, useEffect } from 'react';
import { useMemberAuth } from '../../hooks/useMemberAuth';
import { useFreshData } from '../../hooks/useFreshData';
import { subscriptionService, slotService, attendanceService } from '../../services';
import { PageLoading } from '../../components/common/LoadingSpinner';
import { Card } from '../../components/common/Card';
import {
  format, startOfMonth, endOfMonth, addMonths, subMonths,
  eachDayOfInterval, getDay, parseISO,
} from 'date-fns';

export function MemberAttendancePage() {
  const { member, memberId, refreshMember } = useMemberAuth();

  // ALL HOOKS before loading check
  const [displayMonth, setDisplayMonth] = useState(() => new Date());

  const { isLoading } = useFreshData(['members', 'subscriptions', 'attendance', 'slots']);

  useEffect(() => {
    if (!isLoading && !member && memberId) {
      refreshMember();
    }
  }, [isLoading, member, memberId, refreshMember]);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Get most recent subscription (active or recently expired)
  const activeSub = useMemo(() => {
    if (!member) return null;
    const subs = subscriptionService.getAll().filter(
      s => s.memberId === member.id &&
        (s.status === 'active' || s.status === 'expired') &&
        s.startDate <= today
    );
    return subs.sort((a, b) => b.startDate.localeCompare(a.startDate))[0] || null;
  }, [member, today]);

  const slot = useMemo(() => {
    if (!activeSub?.slotId) return null;
    return slotService.getById(activeSub.slotId);
  }, [activeSub]);

  // All attendance records for member+slot
  const presentDates = useMemo(() => {
    if (!member || !activeSub) return new Set<string>();
    const records = attendanceService.getByMemberAndSlot(member.id, activeSub.slotId);
    return new Set(records.filter(r => r.status === 'present').map(r => r.date));
  }, [member, activeSub]);

  // Calendar days for the displayed month
  const calendarData = useMemo(() => {
    const monthStart = startOfMonth(displayMonth);
    const monthEnd = endOfMonth(displayMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    // Padding: getDay returns 0=Sun..6=Sat; we want Mon=0
    const firstDayIdx = (getDay(monthStart) + 6) % 7;
    return { days, paddingBefore: firstDayIdx };
  }, [displayMonth]);

  // Month summary stats
  const monthSummary = useMemo(() => {
    if (!member || !activeSub) return { present: 0, total: 0, rate: 0 };
    const mStart = format(startOfMonth(displayMonth), 'yyyy-MM-dd');
    const mEnd = format(endOfMonth(displayMonth), 'yyyy-MM-dd');
    // Clamp to subscription period and today
    const effectiveStart = mStart > activeSub.startDate ? mStart : activeSub.startDate;
    const effectiveEnd = mEnd < today ? mEnd : (today < activeSub.endDate ? today : activeSub.endDate);
    if (effectiveStart > effectiveEnd) return { present: 0, total: 0, rate: 0 };
    const summary = attendanceService.getMemberSummaryForPeriod(
      member.id, activeSub.slotId, effectiveStart, effectiveEnd
    );
    return {
      present: summary.presentDays,
      total: summary.totalWorkingDays,
      rate: summary.totalWorkingDays > 0 ? Math.round((summary.presentDays / summary.totalWorkingDays) * 100) : 0,
    };
  }, [member, activeSub, displayMonth, today]);

  // Navigation constraints
  const canGoPrev = useMemo(() => {
    if (!activeSub) return false;
    const prevMonthEnd = format(endOfMonth(subMonths(displayMonth, 1)), 'yyyy-MM-dd');
    return prevMonthEnd >= activeSub.startDate;
  }, [activeSub, displayMonth]);

  const canGoNext = useMemo(() => {
    const nextMonthStart = format(startOfMonth(addMonths(displayMonth, 1)), 'yyyy-MM-dd');
    return nextMonthStart <= today;
  }, [displayMonth, today]);

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
        <h1 className="text-xl font-bold text-gray-900">My Attendance</h1>
        <Card>
          <div className="p-6 text-center text-sm text-gray-500">
            No active subscription found.
          </div>
        </Card>
      </div>
    );
  }

  const getDayStatus = (dateStr: string) => {
    const dayOfWeek = getDay(parseISO(dateStr));
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isOutsideSub = dateStr < activeSub.startDate || dateStr > activeSub.endDate;
    const isFuture = dateStr > today;

    if (isWeekend || isOutsideSub) return 'inactive';
    if (isFuture) return 'future';
    if (presentDates.has(dateStr)) return 'present';
    return 'absent';
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">My Attendance</h1>

      {/* Subscription info bar */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <span className="font-medium text-gray-700">{slot?.displayName || activeSub.slotId}</span>
        <span className="whitespace-nowrap">
          {format(parseISO(activeSub.startDate), 'd MMM')} – {format(parseISO(activeSub.endDate), 'd MMM yyyy')}
        </span>
      </div>

      {/* Calendar */}
      <Card>
        <div className="p-4">
          {/* Month navigator */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setDisplayMonth(m => subMonths(m, 1))}
              disabled={!canGoPrev}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-gray-900">
              {format(displayMonth, 'MMMM yyyy')}
            </span>
            <button
              onClick={() => setDisplayMonth(m => addMonths(m, 1))}
              disabled={!canGoNext}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day of week headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Padding cells */}
            {Array.from({ length: calendarData.paddingBefore }).map((_, i) => (
              <div key={`pad-${i}`} className="w-full aspect-square" />
            ))}

            {/* Day cells */}
            {calendarData.days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const status = getDayStatus(dateStr);
              const dayNum = format(day, 'd');
              const isToday = dateStr === today;

              return (
                <div
                  key={dateStr}
                  className={`w-full aspect-square rounded-lg flex items-center justify-center text-xs font-medium relative
                    ${status === 'present' ? 'bg-green-100 text-green-700' : ''}
                    ${status === 'absent' ? 'bg-red-50 text-red-400' : ''}
                    ${status === 'inactive' ? 'text-gray-300' : ''}
                    ${status === 'future' ? 'text-gray-300' : ''}
                    ${isToday ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}
                  `}
                >
                  {dayNum}
                  {status === 'present' && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green-500" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Month summary */}
      <Card>
        <div className="p-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{monthSummary.present}</div>
              <div className="text-xs text-gray-500">Present</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-700">{monthSummary.total}</div>
              <div className="text-xs text-gray-500">Working Days</div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${monthSummary.rate >= 80 ? 'text-green-600' : monthSummary.rate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                {monthSummary.rate}%
              </div>
              <div className="text-xs text-gray-500">Attendance</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-100 border border-green-300" />
          <span>Present</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-50 border border-red-200" />
          <span>Absent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gray-50 border border-gray-200" />
          <span>Off / N/A</span>
        </div>
      </div>
    </div>
  );
}
