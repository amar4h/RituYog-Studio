import { useState, useMemo } from 'react';
import { Card, Button, Select, PageLoading, Badge } from '../../../components/common';
import { sessionAnalyticsService, asanaService, sessionPlanService, slotService } from '../../../services';
import { useFreshData } from '../../../hooks';
import { BODY_AREA_LABELS } from '../../../constants';
import type { DifficultyLevel, BodyArea } from '../../../types';
import { format, subMonths, subDays, startOfMonth, endOfMonth } from 'date-fns';

type ReportTab = 'asana-usage' | 'body-area' | 'benefits' | 'plan-effectiveness';
type PeriodType = '30d' | '3m' | '6m' | '12m';

export function SessionReportsPage() {
  const { isLoading } = useFreshData(['session-executions', 'asanas', 'session-plans', 'slots']);
  const [activeTab, setActiveTab] = useState<ReportTab>('asana-usage');
  const [period, setPeriod] = useState<PeriodType>('3m');
  const [selectedSlotId, setSelectedSlotId] = useState<string>(''); // '' means all slots

  // Get slots for filter
  const slots = useMemo(() => {
    if (isLoading) return [];
    return slotService.getActive();
  }, [isLoading]);

  // Calculate date range based on period
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const end = format(now, 'yyyy-MM-dd');
    let start: string;

    switch (period) {
      case '30d':
        start = format(subDays(now, 30), 'yyyy-MM-dd');
        break;
      case '3m':
        start = format(subMonths(now, 3), 'yyyy-MM-dd');
        break;
      case '6m':
        start = format(subMonths(now, 6), 'yyyy-MM-dd');
        break;
      case '12m':
        start = format(subMonths(now, 12), 'yyyy-MM-dd');
        break;
      default:
        start = format(subMonths(now, 3), 'yyyy-MM-dd');
    }

    return { startDate: start, endDate: end };
  }, [period]);

  // Get report data (filtered by slot if selected)
  const slotFilter = selectedSlotId || undefined;

  const asanaUsage = useMemo(() => {
    if (isLoading) return [];
    return sessionAnalyticsService.getAsanaUsage(startDate, endDate, slotFilter);
  }, [isLoading, startDate, endDate, slotFilter]);

  const bodyAreaFocus = useMemo(() => {
    if (isLoading) return [];
    return sessionAnalyticsService.getBodyAreaFocus(startDate, endDate, slotFilter);
  }, [isLoading, startDate, endDate, slotFilter]);

  const benefitCoverage = useMemo(() => {
    if (isLoading) return [];
    return sessionAnalyticsService.getBenefitCoverage(startDate, endDate, slotFilter);
  }, [isLoading, startDate, endDate, slotFilter]);

  const planEffectiveness = useMemo(() => {
    if (isLoading) return [];
    return sessionAnalyticsService.getPlanEffectiveness(slotFilter);
  }, [isLoading, slotFilter]);

  if (isLoading) {
    return <PageLoading />;
  }

  const getDifficultyColor = (difficulty: DifficultyLevel): 'green' | 'yellow' | 'red' => {
    const colorMap: Record<DifficultyLevel, 'green' | 'yellow' | 'red'> = {
      beginner: 'green',
      intermediate: 'yellow',
      advanced: 'red',
    };
    return colorMap[difficulty] || 'green';
  };

  const tabs: { id: ReportTab; label: string }[] = [
    { id: 'asana-usage', label: 'Asana Usage' },
    { id: 'body-area', label: 'Body Area Focus' },
    { id: 'benefits', label: 'Benefits' },
    { id: 'plan-effectiveness', label: 'Plan Effectiveness' },
  ];

  const periods: { value: PeriodType; label: string }[] = [
    { value: '30d', label: 'Last 30 Days' },
    { value: '3m', label: 'Last 3 Months' },
    { value: '6m', label: 'Last 6 Months' },
    { value: '12m', label: 'Last 12 Months' },
  ];

  // Slot options for filter
  const slotOptions = [
    { value: '', label: 'All Slots' },
    ...slots.map(s => ({ value: s.id, label: s.startTime })),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Session Reports</h1>
          <p className="text-gray-600">
            Analytics on yoga sessions and asana usage
            {selectedSlotId && slots.find(s => s.id === selectedSlotId) && (
              <span className="ml-1 text-indigo-600 font-medium">
                • {slots.find(s => s.id === selectedSlotId)?.startTime} slot
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Slot Filter */}
          <div className="flex gap-1">
            {slotOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSelectedSlotId(opt.value)}
                className={`
                  px-2.5 py-1.5 rounded text-xs font-medium transition-colors
                  ${selectedSlotId === opt.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {/* Period Filter */}
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodType)}
            options={periods.map(p => ({ value: p.value, label: p.label }))}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-1 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'asana-usage' && (
        <Card className="p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Asana Usage Report</h3>
          {asanaUsage.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No sessions recorded in this period
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Asana
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Times Used
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Duration
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {asanaUsage.slice(0, 20).map((item, index) => (
                    <tr key={item.asanaId}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-medium text-gray-900">{item.asanaName}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {item.timesUsed}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-500">
                        {item.avgDuration > 0 ? `${item.avgDuration} min` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'body-area' && (
        <Card className="p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Body Area Focus Report</h3>
          {bodyAreaFocus.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No sessions recorded in this period
            </p>
          ) : (
            <div className="space-y-4">
              {bodyAreaFocus.map(item => (
                <div key={item.area} className="flex items-center gap-4">
                  <div className="w-32 flex-shrink-0">
                    <span className="font-medium text-gray-900">
                      {BODY_AREA_LABELS[item.area]}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <span className="w-12 text-sm text-gray-600 text-right">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="w-24 text-right">
                    <span className="text-sm text-gray-500">
                      {item.primaryCount} primary, {item.secondaryCount} secondary
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'benefits' && (
        <Card className="p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Benefit Coverage Report</h3>
          {benefitCoverage.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No sessions recorded in this period
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {benefitCoverage.slice(0, 15).map((item, index) => (
                <div
                  key={item.benefit}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center bg-green-100 text-green-600 text-xs font-medium rounded-full">
                      {index + 1}
                    </span>
                    <span className="text-sm text-gray-900">{item.benefit}</span>
                  </div>
                  <span className="text-sm font-medium text-indigo-600">
                    {item.sessionCount} sessions
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'plan-effectiveness' && (
        <Card className="p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Plan Effectiveness Report</h3>
          {planEffectiveness.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No session plans found
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Level
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Used
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Focus Areas
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {planEffectiveness.map(item => (
                    <tr key={item.planId}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-medium text-gray-900">{item.planName}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <Badge variant={getDifficultyColor(item.level)}>
                          {item.level}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {item.usageCount} times
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-500">
                        {item.daysSinceLastUse !== null
                          ? item.daysSinceLastUse === 0
                            ? 'Today'
                            : `${item.daysSinceLastUse} days ago`
                          : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {item.dominantBodyAreas.slice(0, 3).map(area => (
                            <span
                              key={area}
                              className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                            >
                              {BODY_AREA_LABELS[area]}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-sm text-gray-500">Unique Asanas Used</div>
          <div className="text-2xl font-bold text-indigo-600">{asanaUsage.length}</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-sm text-gray-500">Body Areas Covered</div>
          <div className="text-2xl font-bold text-green-600">
            {bodyAreaFocus.filter(a => a.totalCount > 0).length}
          </div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-sm text-gray-500">Benefits Addressed</div>
          <div className="text-2xl font-bold text-purple-600">{benefitCoverage.length}</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-sm text-gray-500">Active Plans</div>
          <div className="text-2xl font-bold text-orange-600">{planEffectiveness.length}</div>
        </Card>
      </div>
    </div>
  );
}
