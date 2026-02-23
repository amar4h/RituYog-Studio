import { useState, useMemo, useEffect } from 'react';
import { useMemberAuth } from '../../hooks/useMemberAuth';
import { useFreshData } from '../../hooks/useFreshData';
import { sessionAnalyticsService, subscriptionService, slotService } from '../../services';
import { PageLoading } from '../../components/common/LoadingSpinner';
import { ReportCard } from '../../components/member/ReportCard';
import { getReportPeriod, PERIOD_TYPE_OPTIONS } from '../../utils/reportPeriods';
import { downloadBatchReportAsJPG } from '../../utils/memberReportImage';
import type { PeriodType, PeriodOffset } from '../../utils/reportPeriods';
import type { BatchReportData } from '../../utils/memberReportImage';

export function BatchReportPage() {
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
    return subs.sort((a, b) => b.startDate.localeCompare(a.startDate))[0] || null;
  }, [member, today]);

  const slot = useMemo(() => {
    if (!activeSub?.slotId) return null;
    return slotService.getById(activeSub.slotId);
  }, [activeSub]);

  const period = useMemo(() => getReportPeriod(periodType, periodOffset), [periodType, periodOffset]);

  const reportData = useMemo<BatchReportData | null>(() => {
    if (!activeSub?.slotId) return null;
    try {
      return sessionAnalyticsService.getBatchSessionReport(
        activeSub.slotId, period.startDate, period.endDate
      );
    } catch {
      return null;
    }
  }, [activeSub, period]);

  const handleDownload = async () => {
    if (!reportData) return;
    setDownloading(true);
    try {
      await downloadBatchReportAsJPG(reportData, period);
    } catch (err) {
      console.error('Download failed:', err);
    }
    setDownloading(false);
  };

  if (isLoading) return <PageLoading />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-gray-900">Batch Report</h1>
        {slot && (
          <p className="text-sm text-gray-500 mt-0.5">{slot.displayName}</p>
        )}
      </div>

      {/* Period selector */}
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={periodType}
          onChange={(e) => setPeriodType(e.target.value as PeriodType)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
        >
          {PERIOD_TYPE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="flex gap-1">
          <button
            onClick={() => setPeriodOffset('current')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
              periodOffset === 'current'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Current
          </button>
          <button
            onClick={() => setPeriodOffset('previous')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
              periodOffset === 'previous'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Previous
          </button>
        </div>
      </div>

      {/* Disclaimer for periods before session tracking started */}
      {period.startDate < '2026-02-16' && (
        <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          Session plan tracking started on 16 Feb 2026. Data for earlier dates may be incomplete.
        </div>
      )}

      {/* Report content */}
      {reportData ? (
        <>
          <ReportCard type="batch" data={reportData} period={period} />
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-50"
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
