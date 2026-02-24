import { useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMemberAuth } from '../../hooks/useMemberAuth';
import { useFreshData } from '../../hooks/useFreshData';
import { subscriptionService, slotService, attendanceService, membershipPlanService, settingsService } from '../../services';
import { PageLoading } from '../../components/common/LoadingSpinner';
import { Card } from '../../components/common/Card';
import { getWorkingDaysInRange } from '../../utils/dateUtils';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ATTENDANCE_TRACKING_START_DATE } from '../../constants';

export function MemberHomePage() {
  const { member, memberId, isAdminViewing, selectMember, refreshMember, familyMembers, switchMember } = useMemberAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Auto-select member from viewAs query param (admin coming from MemberDetailPage)
  const viewAsId = searchParams.get('viewAs');
  useEffect(() => {
    if (viewAsId && isAdminViewing) {
      selectMember(viewAsId);
      setSearchParams({}, { replace: true });
    }
  }, [viewAsId, isAdminViewing, selectMember, setSearchParams]);
  const { isLoading } = useFreshData(['members', 'subscriptions', 'attendance', 'slots', 'settings']);

  // After API data loads, refresh member + check family members
  useEffect(() => {
    if (!isLoading && memberId) {
      refreshMember();
    }
  }, [isLoading, memberId, refreshMember]);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const activeSub = useMemo(() => {
    if (!member) return null;
    const subs = subscriptionService.getAll().filter(
      s => s.memberId === member.id && s.status === 'active' && s.startDate <= today && s.endDate >= today
    );
    return subs[0] || null;
  }, [member, today]);

  const slot = useMemo(() => {
    if (!activeSub?.slotId) return null;
    return slotService.getById(activeSub.slotId);
  }, [activeSub]);

  const monthStats = useMemo(() => {
    if (!member || !activeSub) return { attended: 0, total: 0, rate: 0 };
    const rawMonthStart = today.substring(0, 7) + '-01';
    const monthStart = rawMonthStart > ATTENDANCE_TRACKING_START_DATE
      ? rawMonthStart
      : ATTENDANCE_TRACKING_START_DATE;
    const summary = attendanceService.getMemberSummaryForPeriod(
      member.id, activeSub.slotId, monthStart, today
    );
    return {
      attended: summary.presentDays,
      total: summary.totalWorkingDays,
      rate: summary.totalWorkingDays > 0 ? Math.round((summary.presentDays / summary.totalWorkingDays) * 100) : 0,
    };
  }, [member, activeSub, today]);

  const daysRemaining = useMemo(() => {
    if (!activeSub) return 0;
    return Math.max(0, differenceInDays(parseISO(activeSub.endDate), new Date()));
  }, [activeSub]);

  // Day streak (calendar days — spans across renewals and batch transfers)
  const currentStreak = useMemo(() => {
    if (!member) return 0;

    const allSubs = subscriptionService.getAll().filter(
      s => s.memberId === member.id &&
        (s.status === 'active' || s.status === 'expired') &&
        s.startDate <= today
    );
    if (allSubs.length === 0) return 0;

    const holidays = settingsService.get()?.holidays || [];
    const earliestSub = allSubs.reduce((min, s) => s.startDate < min ? s.startDate : min, allSubs[0].startDate);
    const effectiveStart = earliestSub > ATTENDANCE_TRACKING_START_DATE ? earliestSub : ATTENDANCE_TRACKING_START_DATE;
    if (effectiveStart > today) return 0;

    const isInAnySub = (date: string) => allSubs.some(s => date >= s.startDate && date <= s.endDate);
    const workingDays = getWorkingDaysInRange(effectiveStart, today).filter(date =>
      isInAnySub(date) &&
      !holidays.some(h => h.date === date || (h.isRecurringYearly && h.date.substring(5) === date.substring(5)))
    );
    if (workingDays.length === 0) return 0;

    const workingDaySet = new Set(workingDays);
    const presentDates = new Set(
      attendanceService.getByMember(member.id)
        .filter(r => r.status === 'present')
        .map(r => r.date)
    );

    let startPoint = today;
    if (workingDaySet.has(today) && !presentDates.has(today)) {
      const d = parseISO(today);
      d.setDate(d.getDate() - 1);
      startPoint = format(d, 'yyyy-MM-dd');
    }

    let earliestPresent = '';
    const d = parseISO(startPoint);
    while (format(d, 'yyyy-MM-dd') >= effectiveStart) {
      const dateStr = format(d, 'yyyy-MM-dd');
      if (workingDaySet.has(dateStr) && !presentDates.has(dateStr)) break;
      if (workingDaySet.has(dateStr)) earliestPresent = dateStr;
      d.setDate(d.getDate() - 1);
    }

    return earliestPresent
      ? differenceInDays(parseISO(startPoint), parseISO(earliestPresent)) + 1
      : 0;
  }, [member, today]);

  if (isLoading) return <PageLoading />;

  // Admin viewing mode - prompt to select a member
  if (isAdminViewing && !member) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Member Portal</h1>
          <p className="text-sm text-gray-500 mt-0.5">Admin preview mode</p>
        </div>
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sm text-gray-500">Select a member from the dropdown above to view their portal</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
          Hi, {member?.firstName}!
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {isAdminViewing ? `Viewing as ${member?.firstName} ${member?.lastName}` : 'Welcome to your yoga portal'}
        </p>
      </div>

      {/* Family member switcher */}
      {familyMembers.length > 1 && !isAdminViewing && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Viewing as:</span>
          <div className="flex gap-1.5 flex-1 overflow-x-auto">
            {familyMembers.map(fm => (
              <button
                key={fm.id}
                onClick={() => switchMember(fm.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex-shrink-0 ${
                  fm.id === memberId
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm shadow-indigo-500/25'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  fm.id === memberId ? 'bg-white/20 text-white' : 'bg-gray-300 text-white'
                }`}>
                  {fm.firstName[0]}
                </span>
                {fm.firstName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick navigation — primary actions first */}
      <div className="grid grid-cols-3 gap-2">
        <Link to="/member/attendance" className="block active:scale-[0.98] transition-all duration-200">
          <Card className="h-full">
            <div className="p-3 text-center">
              <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-1.5 shadow-sm shadow-green-500/10">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div className="text-xs font-medium text-gray-900">Attendance</div>
            </div>
          </Card>
        </Link>
        <Link to="/member/my-report" className="block active:scale-[0.98] transition-all duration-200">
          <Card className="h-full">
            <div className="p-3 text-center">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-1.5 shadow-sm shadow-indigo-500/10">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="text-xs font-medium text-gray-900">My Report</div>
            </div>
          </Card>
        </Link>
        <Link to="/member/batch-report" className="block active:scale-[0.98] transition-all duration-200">
          <Card className="h-full">
            <div className="p-3 text-center">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-fuchsia-100 rounded-full flex items-center justify-center mx-auto mb-1.5 shadow-sm shadow-purple-500/10">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="text-xs font-medium text-gray-900">Batch Report</div>
            </div>
          </Card>
        </Link>
      </div>
      <Link to="/member/insights" className="block active:scale-[0.98] transition-all duration-200">
        <Card>
          <div className="p-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-rose-100 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm shadow-orange-500/10">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-gray-900">Attendance Insights</div>
              <div className="text-xs text-gray-500">Streaks, trends & ranking</div>
            </div>
          </div>
        </Card>
      </Link>

      {/* This month stats + streak */}
      <Card>
        <div className="p-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">This Month</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="text-center">
              <div className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-indigo-500">{monthStats.attended}</div>
              <div className="text-xs text-gray-500">Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-gray-700">{monthStats.total}</div>
              <div className="text-xs text-gray-500">Work Days</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-black ${monthStats.rate >= 80 ? 'text-green-600' : monthStats.rate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                {monthStats.rate}%
              </div>
              <div className="text-xs text-gray-500">Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-amber-500">
                {currentStreak > 0 ? `${currentStreak}` : '0'}
              </div>
              <div className="text-xs text-gray-500">{currentStreak > 0 ? '\uD83D\uDD25 Streak' : 'Streak'}</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Subscription card — details at bottom */}
      {activeSub ? (
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-indigo-600 uppercase tracking-wide">Active Membership</span>
              <span className="text-xs bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Active</span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-base font-semibold text-gray-900">
                {membershipPlanService.getById(activeSub.planId)?.name || 'Membership'}
              </div>
              <div className={`text-lg font-bold ${daysRemaining <= 7 ? 'text-amber-600' : 'text-indigo-600'}`}>
                {daysRemaining}<span className="text-xs font-normal text-gray-500 ml-1">days left</span>
              </div>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Batch</span>
                <span className="text-gray-900 font-medium whitespace-nowrap">{slot?.displayName || activeSub.slotId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Period</span>
                <span className="text-gray-900 whitespace-nowrap">{format(parseISO(activeSub.startDate), 'd MMM')} – {format(parseISO(activeSub.endDate), 'd MMM yyyy')}</span>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="p-4 text-center text-sm text-gray-500">
            No active membership found.
          </div>
        </Card>
      )}
    </div>
  );
}
