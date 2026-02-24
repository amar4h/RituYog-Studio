import { Card } from '../common/Card';
import type { MemberReportData, BatchReportData } from '../../utils/memberReportImage';
import type { ReportPeriod } from '../../utils/reportPeriods';
import { BODY_AREA_LABELS } from '../../constants';
import type { BodyArea } from '../../types';

interface MemberReportCardProps {
  type: 'member';
  data: MemberReportData;
  period: ReportPeriod;
}

interface BatchReportCardProps {
  type: 'batch';
  data: BatchReportData;
  period: ReportPeriod;
}

type ReportCardProps = MemberReportCardProps | BatchReportCardProps;

function StatTile({ label, value, subtitle, color }: { label: string; value: string | number; subtitle?: string; color: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    purple: 'bg-purple-50 text-purple-700',
    blue: 'bg-blue-50 text-blue-700',
    gray: 'bg-gray-50 text-gray-700',
  };
  return (
    <div className={`p-3 rounded-xl ${colors[color] || colors.gray}`}>
      <div className="text-xs font-medium opacity-75">{label}</div>
      <div className="text-xl font-black mt-0.5">{value}</div>
      {subtitle && <div className="text-xs opacity-60">{subtitle}</div>}
    </div>
  );
}

function SectionHeader({ title, color = 'indigo' }: { title: string; color?: string }) {
  const borderColors: Record<string, string> = {
    indigo: 'border-indigo-500',
    amber: 'border-amber-500',
    purple: 'border-purple-500',
    green: 'border-green-500',
  };
  return (
    <div className={`border-l-4 ${borderColors[color] || borderColors.indigo} pl-3 py-1 mb-3`}>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
    </div>
  );
}

function HorizontalBar({ label, percentage }: { label: string; percentage: number }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-gray-700">{label}</span>
        <span className="text-gray-500">{Math.round(percentage)}%</span>
      </div>
      <div className="h-2.5 bg-gray-100/80 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
          style={{ width: `${Math.max(percentage, 2)}%` }}
        />
      </div>
    </div>
  );
}

function BadgeRow({ items }: { items: Array<{ label: string; count?: number }> }) {
  if (items.length === 0) return <p className="text-xs text-gray-400">No data for this period</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs">
          {item.label}
          {item.count !== undefined && (
            <span className="bg-indigo-200 text-indigo-800 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
              {item.count}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

export function ReportCard(props: ReportCardProps) {
  const { type, data, period } = props;

  if (type === 'member') {
    const d = data as MemberReportData;
    return (
      <div className="space-y-4">
        {/* Period label */}
        <div className="text-center text-sm text-gray-500">{period.label}</div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <StatTile label="Sessions" value={d.sessionsAttended} subtitle={`of ${d.totalWorkingDays}`} color="indigo" />
          <StatTile label="Rate" value={`${Math.round(d.attendanceRate)}%`} color={d.attendanceRate >= 80 ? 'green' : d.attendanceRate >= 50 ? 'amber' : 'amber'} />
          <StatTile label="Asanas" value={d.uniqueAsanasCount} subtitle="unique" color="purple" />
        </div>

        {/* Practices Performed */}
        {d.topAsanas.length > 0 && (
          <Card>
            <div className="p-4">
              <SectionHeader title="Practices Performed" color="indigo" />
              <div className="space-y-1.5">
                {d.topAsanas.map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{i + 1}. {a.name}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{a.count}x</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Body Areas Worked */}
        {d.bodyAreas.length > 0 && (
          <Card>
            <div className="p-4">
              <SectionHeader title="Body Areas Worked" color="green" />
              {d.bodyAreas.map((area, i) => (
                <HorizontalBar
                  key={i}
                  label={BODY_AREA_LABELS[area.area as BodyArea] || area.label || area.area}
                  percentage={area.percentage}
                />
              ))}
            </div>
          </Card>
        )}

        {/* Benefits Gained */}
        {d.topBenefits.length > 0 && (
          <Card>
            <div className="p-4">
              <SectionHeader title="Benefits Gained" color="purple" />
              <BadgeRow items={d.topBenefits.map(b => ({ label: b.benefit, count: b.count }))} />
            </div>
          </Card>
        )}

        {/* What You Missed */}
        {d.missedSessions > 0 && (d.missedAsanas.length > 0 || d.missedBodyAreas.length > 0 || d.missedBenefits.length > 0) && (
          <Card>
            <div className="p-4 bg-amber-50 rounded-lg">
              <SectionHeader title={`What You Missed (${d.missedSessions} sessions)`} color="amber" />

              {d.missedAsanas.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-amber-700 mb-1">Missed Practices</p>
                  <BadgeRow items={d.missedAsanas.map(a => ({ label: a.name, count: a.count }))} />
                </div>
              )}

              {d.missedBodyAreas.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-amber-700 mb-1">Missed Body Areas</p>
                  {d.missedBodyAreas.map((area, i) => (
                    <HorizontalBar
                      key={i}
                      label={BODY_AREA_LABELS[area.area as BodyArea] || area.label || area.area}
                      percentage={area.percentage}
                    />
                  ))}
                </div>
              )}

              {d.missedBenefits.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-amber-700 mb-1">Missed Benefits</p>
                  <BadgeRow items={d.missedBenefits.map(b => ({ label: b.benefit, count: b.count }))} />
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    );
  }

  // Batch report
  const d = data as BatchReportData;
  return (
    <div className="space-y-4">
      <div className="text-center text-sm text-gray-500">{period.label}</div>

      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Total Sessions" value={d.totalSessions} color="indigo" />
        <StatTile label="Avg Attendees" value={d.avgAttendees} color="blue" />
        <StatTile label="Unique Asanas" value={d.uniqueAsanasCount} color="purple" />
        <StatTile label="Benefits" value={d.totalBenefits} color="green" />
      </div>

      {d.topAsanas.length > 0 && (
        <Card>
          <div className="p-4">
            <SectionHeader title="Top Practices" color="indigo" />
            <div className="space-y-1.5">
              {d.topAsanas.map((a, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{i + 1}. {a.name}</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{a.count}x</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {d.bodyAreas.length > 0 && (
        <Card>
          <div className="p-4">
            <SectionHeader title="Body Areas Covered" color="green" />
            {d.bodyAreas.map((area, i) => (
              <HorizontalBar
                key={i}
                label={BODY_AREA_LABELS[area.area as BodyArea] || area.label || area.area}
                percentage={area.percentage}
              />
            ))}
          </div>
        </Card>
      )}

      {d.topBenefits.length > 0 && (
        <Card>
          <div className="p-4">
            <SectionHeader title="Benefits Addressed" color="purple" />
            <BadgeRow items={d.topBenefits.map(b => ({ label: b.benefit, count: b.count }))} />
          </div>
        </Card>
      )}
    </div>
  );
}
