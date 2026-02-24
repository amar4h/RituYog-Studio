import { useState, useMemo, useEffect } from 'react';
import { useMemberAuth } from '../../hooks/useMemberAuth';
import { useFreshData } from '../../hooks/useFreshData';
import { sessionAnalyticsService, subscriptionService } from '../../services';
import { PageLoading } from '../../components/common/LoadingSpinner';
import { ReportCard } from '../../components/member/ReportCard';
import { getReportPeriod, PERIOD_TYPE_OPTIONS } from '../../utils/reportPeriods';
import { downloadMemberReportAsJPG } from '../../utils/memberReportImage';
import type { PeriodType, PeriodOffset } from '../../utils/reportPeriods';
import type { MemberReportData } from '../../utils/memberReportImage';

export function MemberReportPage() {
  const { member, memberId, refreshMember } = useMemberAuth();
  const [periodType, setPeriodType] = useState<PeriodType>('weekly');
  const [periodOffset, setPeriodOffset] = useState<PeriodOffset>(new Date().getDay() === 1 ? 'previous' : 'current');
  const [downloading, setDownloading] = useState(false);

  const { isLoading } = useFreshData([
    'members', 'subscriptions', 'attendance', 'asanas',
    'session-plans', 'session-plan-allocations', 'session-executions', 'slots',
  ]);

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
      s => s.memberId === member.id &&
        (s.status === 'active' || s.status === 'expired') &&
        s.startDate <= today
    );
    // Pick the most recent one
    return subs.sort((a, b) => b.startDate.localeCompare(a.startDate))[0] || null;
  }, [member, today]);

  const period = useMemo(() => getReportPeriod(periodType, periodOffset), [periodType, periodOffset]);

  const reportData = useMemo<MemberReportData | null>(() => {
    if (!member || !activeSub) return null;
    try {
      return sessionAnalyticsService.getMemberSessionReport(
        member.id, activeSub.slotId, period.startDate, period.endDate
      );
    } catch {
      return null;
    }
  }, [member, activeSub, period]);

  const handleDownload = async () => {
    if (!reportData) return;
    setDownloading(true);
    try {
      await downloadMemberReportAsJPG(reportData, period);
    } catch (err) {
      console.error('Download failed:', err);
    }
    setDownloading(false);
  };

  if (isLoading) return <PageLoading />;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-900">My Report</h1>

      {/* Period selector */}
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={periodType}
          onChange={(e) => setPeriodType(e.target.value as PeriodType)}
          className="flex-1 px-3 py-2 border border-gray-200/80 rounded-xl bg-gray-50/50 text-sm focus:ring-2 focus:ring-indigo-500"
        >
          {PERIOD_TYPE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="flex gap-1">
          <button
            onClick={() => setPeriodOffset('current')}
            className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              periodOffset === 'current'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm shadow-indigo-500/25'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Current
          </button>
          <button
            onClick={() => setPeriodOffset('previous')}
            className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              periodOffset === 'previous'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm shadow-indigo-500/25'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Previous
          </button>
        </div>
      </div>

      {/* Disclaimer for periods before session tracking started */}
      {period.startDate < '2026-02-16' && (
        <div className="px-3 py-2 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-700">
          Session plan tracking started on 16 Feb 2026. Data for earlier dates may be incomplete.
        </div>
      )}

      {/* Report content */}
      {reportData ? (
        <>
          <ReportCard type="member" data={reportData} period={period} />
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium text-sm hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
          >
            {downloading ? 'Generating...' : 'Download as Image'}
          </button>
        </>
      ) : (
        <div className="text-center py-8 text-sm text-gray-500">
          {!activeSub ? 'No subscription found.' : 'No report data available for this period.'}
        </div>
      )}
    </div>
  );
}
