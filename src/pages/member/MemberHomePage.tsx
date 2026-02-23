import { useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMemberAuth } from '../../hooks/useMemberAuth';
import { useFreshData } from '../../hooks/useFreshData';
import { subscriptionService, slotService, attendanceService, membershipPlanService } from '../../services';
import { PageLoading } from '../../components/common/LoadingSpinner';
import { Card } from '../../components/common/Card';
import { format, parseISO, differenceInDays } from 'date-fns';

export function MemberHomePage() {
  const { member, memberId, isAdminViewing, selectMember, refreshMember } = useMemberAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Auto-select member from viewAs query param (admin coming from MemberDetailPage)
  const viewAsId = searchParams.get('viewAs');
  useEffect(() => {
    if (viewAsId && isAdminViewing) {
      selectMember(viewAsId);
      setSearchParams({}, { replace: true });
    }
  }, [viewAsId, isAdminViewing, selectMember, setSearchParams]);
  const { isLoading } = useFreshData(['members', 'subscriptions', 'attendance', 'slots']);

  // After API data loads, refresh member from localStorage (fixes race condition)
  useEffect(() => {
    if (!isLoading && !member && memberId) {
      refreshMember();
    }
  }, [isLoading, member, memberId, refreshMember]);

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
    const monthStart = today.substring(0, 7) + '-01';
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
        <h1 className="text-xl font-bold text-gray-900">
          Hi, {member?.firstName}!
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {isAdminViewing ? `Viewing as ${member?.firstName} ${member?.lastName}` : 'Welcome to your yoga portal'}
        </p>
      </div>

      {/* Subscription card */}
      {activeSub ? (
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-indigo-600 uppercase tracking-wide">Active Membership</span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Active</span>
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

      {/* This month stats */}
      <Card>
        <div className="p-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">This Month</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{monthStats.attended}</div>
              <div className="text-xs text-gray-500">Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-700">{monthStats.total}</div>
              <div className="text-xs text-gray-500">Working Days</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${monthStats.rate >= 80 ? 'text-green-600' : monthStats.rate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                {monthStats.rate}%
              </div>
              <div className="text-xs text-gray-500">Attendance</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick navigation */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/member/attendance" className="block">
          <Card className="hover:shadow-md transition-shadow h-full">
            <div className="p-4 text-center">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div className="text-sm font-medium text-gray-900">Attendance</div>
              <div className="text-xs text-gray-500">View history</div>
            </div>
          </Card>
        </Link>
        <Link to="/member/membership" className="block">
          <Card className="hover:shadow-md transition-shadow h-full">
            <div className="p-4 text-center">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-sm font-medium text-gray-900">My Membership</div>
              <div className="text-xs text-gray-500">Plans & invoices</div>
            </div>
          </Card>
        </Link>
        <Link to="/member/my-report" className="block">
          <Card className="hover:shadow-md transition-shadow h-full">
            <div className="p-4 text-center">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="text-sm font-medium text-gray-900">My Report</div>
              <div className="text-xs text-gray-500">Personal summary</div>
            </div>
          </Card>
        </Link>
        <Link to="/member/batch-report" className="block">
          <Card className="hover:shadow-md transition-shadow h-full">
            <div className="p-4 text-center">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="text-sm font-medium text-gray-900">Batch Report</div>
              <div className="text-xs text-gray-500">Batch summary</div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
