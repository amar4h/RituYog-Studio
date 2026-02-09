import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Input,
  Select,
  DataTable,
  Badge,
  EmptyState,
  EmptyIcons,
  PageLoading,
} from '../../../components/common';
import { sessionExecutionService, sessionPlanService, slotService } from '../../../services';
import { useFreshData } from '../../../hooks';
import { DIFFICULTY_LEVEL_OPTIONS } from '../../../constants';
import type { SessionExecution, DifficultyLevel } from '../../../types';
import type { Column } from '../../../components/common';
import { format, subDays, parseISO } from 'date-fns';

export function SessionExecutionListPage() {
  const { isLoading } = useFreshData(['session-executions', 'session-plans', 'slots']);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const slots = useMemo(() => {
    if (isLoading) return [];
    return slotService.getAll();
  }, [isLoading]);

  if (isLoading) {
    return <PageLoading />;
  }

  const allExecutions = sessionExecutionService.getAll();

  // Filter executions
  const executions = allExecutions.filter(execution => {
    const matchesSearch = !search ||
      execution.sessionPlanName.toLowerCase().includes(search.toLowerCase());

    const matchesLevel = !levelFilter || execution.sessionPlanLevel === levelFilter;

    const matchesDateFrom = !dateFrom || execution.date >= dateFrom;
    const matchesDateTo = !dateTo || execution.date <= dateTo;

    return matchesSearch && matchesLevel && matchesDateFrom && matchesDateTo;
  }).sort((a, b) => {
    // Sort by date descending, then by slot
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return a.slotId.localeCompare(b.slotId);
  });

  const getSlotName = (slotId: string) => {
    const slot = slots.find(s => s.id === slotId);
    return slot?.displayName || 'Unknown Slot';
  };

  const getDifficultyColor = (difficulty: DifficultyLevel): 'green' | 'yellow' | 'red' => {
    const colorMap: Record<DifficultyLevel, 'green' | 'yellow' | 'red'> = {
      beginner: 'green',
      intermediate: 'yellow',
      advanced: 'red',
    };
    return colorMap[difficulty] || 'green';
  };

  const columns: Column<SessionExecution>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (execution) => (
        <span className="font-medium text-gray-900 whitespace-nowrap">
          {format(parseISO(execution.date), 'dd MMM yyyy')}
        </span>
      ),
    },
    {
      key: 'slot',
      header: 'Slot',
      render: (execution) => (
        <span className="text-gray-600">{getSlotName(execution.slotId)}</span>
      ),
    },
    {
      key: 'plan',
      header: 'Session Plan',
      render: (execution) => (
        <div>
          <div className="font-medium text-gray-900">{execution.sessionPlanName}</div>
          <Badge variant={getDifficultyColor(execution.sessionPlanLevel)}>
            {execution.sessionPlanLevel}
          </Badge>
        </div>
      ),
    },
    {
      key: 'attendees',
      header: 'Attendees',
      render: (execution) => (
        <div className="text-center">
          <div className="font-medium text-gray-900">{execution.attendeeCount}</div>
          <div className="text-xs text-gray-500">members</div>
        </div>
      ),
    },
    {
      key: 'instructor',
      header: 'Instructor',
      render: (execution) => (
        <span className="text-gray-600">{execution.instructor || '-'}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (execution) => (
        <Link to={`/admin/session-executions/${execution.id}`}>
          <Button variant="outline" size="sm">View</Button>
        </Link>
      ),
    },
  ];

  // Stats
  const totalExecutions = executions.length;
  const totalAttendees = executions.reduce((sum, e) => sum + e.attendeeCount, 0);
  const avgAttendees = totalExecutions > 0 ? Math.round(totalAttendees / totalExecutions) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Session Executions</h1>
          <p className="text-gray-600">Track executed yoga sessions</p>
        </div>
        <Button onClick={() => navigate('/admin/session-executions/record')}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Record Execution
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-500">Sessions in Period</div>
          <div className="text-2xl font-bold text-gray-900">{totalExecutions}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Total Attendees</div>
          <div className="text-2xl font-bold text-indigo-600">{totalAttendees}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Avg per Session</div>
          <div className="text-2xl font-bold text-green-600">{avgAttendees}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Input
            placeholder="Search plans..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            options={[
              { value: '', label: 'All Levels' },
              ...DIFFICULTY_LEVEL_OPTIONS,
            ]}
          />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            label="From"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            label="To"
          />
        </div>
      </Card>

      {/* Executions table */}
      {executions.length === 0 ? (
        <EmptyState
          icon={EmptyIcons.document}
          title="No executions found"
          description={search || levelFilter
            ? "Try adjusting your filters to find what you're looking for."
            : "No sessions have been recorded yet."
          }
          action={
            !search && !levelFilter && (
              <Button onClick={() => navigate('/admin/session-executions/record')}>
                Record Session
              </Button>
            )
          }
        />
      ) : (
        <Card>
          <DataTable
            data={executions}
            columns={columns}
            keyExtractor={(execution) => execution.id}
          />
        </Card>
      )}
    </div>
  );
}
