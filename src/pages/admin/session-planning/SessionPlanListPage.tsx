import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Button, Input, Select, DataTable, Badge, StatusBadge, EmptyState, EmptyIcons, Alert, PageLoading } from '../../../components/common';
import { sessionPlanService } from '../../../services';
import { useFreshData } from '../../../hooks';
import { DIFFICULTY_LEVEL_OPTIONS, BODY_AREA_LABELS } from '../../../constants';
import { OveruseWarningBadge } from '../../../components/sessionPlanning/OveruseWarningBadge';
import type { SessionPlan, DifficultyLevel, BodyArea } from '../../../types';
import type { Column } from '../../../components/common';
import { format } from 'date-fns';

export function SessionPlanListPage() {
  const { isLoading } = useFreshData(['session-plans', 'asanas', 'session-executions']);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [showInactive, setShowInactive] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  if (isLoading) {
    return <PageLoading />;
  }

  const allPlans = sessionPlanService.getAll();

  // Filter plans
  const plans = allPlans.filter(plan => {
    const matchesSearch = !search ||
      plan.name.toLowerCase().includes(search.toLowerCase()) ||
      (plan.description && plan.description.toLowerCase().includes(search.toLowerCase()));

    const matchesLevel = !levelFilter || plan.level === levelFilter;
    const matchesActive = showInactive || plan.isActive;

    return matchesSearch && matchesLevel && matchesActive;
  });

  const getDifficultyColor = (difficulty: DifficultyLevel): 'green' | 'yellow' | 'red' => {
    const colorMap: Record<DifficultyLevel, 'green' | 'yellow' | 'red'> = {
      beginner: 'green',
      intermediate: 'yellow',
      advanced: 'red',
    };
    return colorMap[difficulty] || 'green';
  };

  const handleClone = (plan: SessionPlan) => {
    try {
      const cloned = sessionPlanService.clone(plan.id);
      setSuccess(`"${plan.name}" cloned as "${cloned.name}"`);
      navigate(`/admin/session-plans/${cloned.id}/edit`);
    } catch (err) {
      setError('Failed to clone session plan');
    }
  };

  const handleToggleActive = (plan: SessionPlan) => {
    try {
      sessionPlanService.update(plan.id, { isActive: !plan.isActive });
      setSuccess(`"${plan.name}" ${plan.isActive ? 'deactivated' : 'activated'} successfully`);
    } catch (err) {
      setError('Failed to update plan status');
    }
  };

  const columns: Column<SessionPlan>[] = [
    {
      key: 'name',
      header: 'Plan Name',
      render: (plan) => {
        const overuseWarning = sessionPlanService.getOveruseWarning(plan.id);
        return (
          <div>
            <div className="flex items-center gap-2">
              <Link
                to={`/admin/session-plans/${plan.id}`}
                className="font-medium text-gray-900 hover:text-indigo-600"
              >
                {plan.name}
              </Link>
              {overuseWarning.isOverused && overuseWarning.reason && (
                <OveruseWarningBadge reason={overuseWarning.reason} />
              )}
            </div>
            {plan.description && (
              <p className="text-sm text-gray-500 truncate max-w-xs" title={plan.description}>
                {plan.description}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'level',
      header: 'Level',
      render: (plan) => (
        <Badge variant={getDifficultyColor(plan.level)}>
          {plan.level.charAt(0).toUpperCase() + plan.level.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'bodyAreas',
      header: 'Focus Areas',
      render: (plan) => {
        const areas = sessionPlanService.getDominantBodyAreas(plan);
        return (
          <div className="flex flex-wrap gap-1">
            {areas.slice(0, 3).map((area) => (
              <span
                key={area}
                className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded"
              >
                {BODY_AREA_LABELS[area]}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'usage',
      header: 'Usage',
      render: (plan) => (
        <div className="text-center">
          <div className="font-medium text-gray-900">{plan.usageCount}</div>
          <div className="text-xs text-gray-500">times used</div>
        </div>
      ),
    },
    {
      key: 'lastUsed',
      header: 'Last Used',
      render: (plan) => (
        <span className="text-gray-600 whitespace-nowrap">
          {plan.lastUsedAt
            ? format(new Date(plan.lastUsedAt), 'dd MMM yyyy')
            : 'Never'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (plan) => (
        <StatusBadge status={plan.isActive ? 'Active' : 'Inactive'} />
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (plan) => (
        <div className="flex gap-2 justify-end">
          <Link to={`/admin/session-plans/${plan.id}`}>
            <Button variant="outline" size="sm">View</Button>
          </Link>
          <Link to={`/admin/session-plans/${plan.id}/edit`}>
            <Button variant="outline" size="sm">Edit</Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleClone(plan)}
            title="Clone this plan"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </Button>
        </div>
      ),
    },
  ];

  // Stats
  const activePlans = allPlans.filter(p => p.isActive);
  const levelStats = DIFFICULTY_LEVEL_OPTIONS.map(level => ({
    level: level.value,
    label: level.label,
    count: activePlans.filter(p => p.level === level.value).length,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Session Plans</h1>
          <p className="text-gray-600">Create and manage yoga session templates</p>
        </div>
        <Button onClick={() => navigate('/admin/session-plans/new')}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Plan
        </Button>
      </div>

      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onDismiss={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-500">Total Active</div>
          <div className="text-2xl font-bold text-gray-900">{activePlans.length}</div>
        </Card>
        {levelStats.map(stat => (
          <Card key={stat.level} className="p-4">
            <div className="text-sm text-gray-500">{stat.label}</div>
            <div className="text-2xl font-bold text-indigo-600">{stat.count}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showInactive"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="showInactive" className="text-sm text-gray-600">
              Show inactive
            </label>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            {plans.length} {plans.length === 1 ? 'plan' : 'plans'} found
          </div>
        </div>
      </Card>

      {/* Plans table */}
      {plans.length === 0 ? (
        <EmptyState
          icon={EmptyIcons.document}
          title="No session plans found"
          description={search || levelFilter
            ? "Try adjusting your filters to find what you're looking for."
            : "Get started by creating your first session plan."
          }
          action={
            !search && !levelFilter && (
              <Link to="/admin/session-plans/new">
                <Button>Create Session Plan</Button>
              </Link>
            )
          }
        />
      ) : (
        <Card>
          <DataTable
            data={plans}
            columns={columns}
            keyExtractor={(plan) => plan.id}
          />
        </Card>
      )}
    </div>
  );
}
