import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Button, Input, Select, DataTable, Badge, StatusBadge, EmptyState, EmptyIcons, Alert, PageLoading } from '../../../components/common';
import { asanaService } from '../../../services';
import { useFreshData } from '../../../hooks';
import { ASANA_TYPE_OPTIONS, DIFFICULTY_LEVEL_OPTIONS, BODY_AREA_OPTIONS, BODY_AREA_LABELS, BREATHING_CUE_OPTIONS } from '../../../constants';
import type { Asana, AsanaType, DifficultyLevel, BodyArea } from '../../../types';
import type { Column } from '../../../components/common';

export function AsanaListPage() {
  const { isLoading } = useFreshData(['asanas']);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('');
  const [bodyAreaFilter, setBodyAreaFilter] = useState<string>('');
  const [showInactive, setShowInactive] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  if (isLoading) {
    return <PageLoading />;
  }

  const allAsanas = asanaService.getAll();

  // Filter asanas
  const asanas = allAsanas.filter(asana => {
    const matchesSearch = !search ||
      asana.name.toLowerCase().includes(search.toLowerCase()) ||
      (asana.sanskritName && asana.sanskritName.toLowerCase().includes(search.toLowerCase()));

    const matchesType = !typeFilter || asana.type === typeFilter;
    const matchesDifficulty = !difficultyFilter || asana.difficulty === difficultyFilter;
    const matchesBodyArea = !bodyAreaFilter ||
      asana.primaryBodyAreas.includes(bodyAreaFilter as BodyArea) ||
      asana.secondaryBodyAreas.includes(bodyAreaFilter as BodyArea);
    const matchesActive = showInactive || asana.isActive;

    return matchesSearch && matchesType && matchesDifficulty && matchesBodyArea && matchesActive;
  });

  const getTypeLabel = (type: AsanaType) => {
    return ASANA_TYPE_OPTIONS.find(t => t.value === type)?.label || type;
  };

  const getTypeColor = (type: AsanaType): 'blue' | 'purple' | 'cyan' | 'orange' | 'green' | 'pink' | 'amber' => {
    const colorMap: Record<AsanaType, 'blue' | 'purple' | 'cyan' | 'orange' | 'green' | 'pink' | 'amber'> = {
      asana: 'blue',
      pranayama: 'purple',
      kriya: 'cyan',
      exercise: 'orange',
      relaxation: 'green',
      vinyasa: 'pink',
      surya_namaskar: 'amber',
    };
    return colorMap[type] || 'blue';
  };

  const getDifficultyColor = (difficulty: DifficultyLevel): 'green' | 'yellow' | 'red' => {
    const colorMap: Record<DifficultyLevel, 'green' | 'yellow' | 'red'> = {
      beginner: 'green',
      intermediate: 'yellow',
      advanced: 'red',
    };
    return colorMap[difficulty] || 'green';
  };

  const getBreathingCueInfo = (cue?: string) => {
    if (!cue) return null;
    const option = BREATHING_CUE_OPTIONS.find(o => o.value === cue);
    return option ? { label: option.label, color: option.color } : null;
  };

  const handleToggleActive = async (asana: Asana) => {
    try {
      asanaService.update(asana.id, { isActive: !asana.isActive });
      setSuccess(`${asana.name} ${asana.isActive ? 'deactivated' : 'activated'} successfully`);
    } catch (err) {
      setError('Failed to update asana status');
    }
  };

  // Helper to get minimal breathing cue abbreviation
  const getBreathingCueAbbrev = (cue?: string) => {
    if (!cue) return null;
    const option = BREATHING_CUE_OPTIONS.find(o => o.value === cue);
    if (!option) return null;
    const abbrev = cue === 'inhale' ? 'In' : cue === 'exhale' ? 'Ex' : 'Ho';
    return { abbrev, color: option.color };
  };

  // Helper to format vinyasa/surya_namaskar child asanas as inline flow with breathing cues
  const formatVinyasaFlow = (asana: Asana) => {
    const isSequenceType = asana.type === 'vinyasa' || asana.type === 'surya_namaskar';
    if (!isSequenceType || !asana.childAsanas?.length) return null;

    return asana.childAsanas
      .sort((a, b) => a.order - b.order)
      .map((child, idx) => {
        const childAsana = asanaService.getById(child.asanaId);
        if (!childAsana) return <span key={idx}>?</span>;
        const sanskrit = childAsana.sanskritName && childAsana.sanskritName !== childAsana.name ? ` (${childAsana.sanskritName})` : '';
        const cue = getBreathingCueAbbrev(childAsana.breathingCue);

        return (
          <span key={idx}>
            {idx > 0 && <span className="text-gray-400"> → </span>}
            <span>{childAsana.name}{sanskrit}</span>
            {cue && (
              <span className={`ml-0.5 text-[9px] font-medium px-0.5 rounded ${
                cue.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                cue.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                'bg-orange-100 text-orange-600'
              }`}>
                {cue.abbrev}
              </span>
            )}
          </span>
        );
      });
  };

  const columns: Column<Asana>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (asana) => {
        const breathingCue = getBreathingCueInfo(asana.breathingCue);
        return (
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={`/admin/asanas/${asana.id}`}
                className="font-medium text-gray-900 hover:text-indigo-600"
              >
                {asana.name}
              </Link>
              {/* Show breathing cue badge - minimal */}
              {breathingCue && (
                <span className={`px-1 py-0.5 text-[10px] rounded font-medium ${
                  breathingCue.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                  breathingCue.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                  'bg-orange-100 text-orange-600'
                }`}>
                  {breathingCue.color === 'blue' ? 'In' : breathingCue.color === 'purple' ? 'Ex' : 'Ho'}
                </span>
              )}
              {/* Show child count badge for vinyasa/surya_namaskar */}
              {(asana.type === 'vinyasa' || asana.type === 'surya_namaskar') && asana.childAsanas && asana.childAsanas.length > 0 && (
                <span className={`px-1.5 py-0.5 text-xs rounded-full font-medium ${
                  asana.type === 'surya_namaskar' ? 'bg-amber-100 text-amber-700' : 'bg-pink-100 text-pink-700'
                }`}>
                  {asana.childAsanas.length} asanas
                </span>
              )}
            </div>
            {asana.sanskritName && asana.sanskritName !== asana.name && (
              <p className="text-sm text-gray-500 italic">{asana.sanskritName}</p>
            )}
            {/* Show vinyasa/surya_namaskar flow inline with names, Sanskrit names, and breathing cues */}
            {(asana.type === 'vinyasa' || asana.type === 'surya_namaskar') && asana.childAsanas && asana.childAsanas.length > 0 && (
              <div className="text-xs text-gray-600 mt-1 break-words inline-flex flex-wrap items-center gap-x-0">
                {formatVinyasaFlow(asana)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'type',
      header: 'Type',
      render: (asana) => (
        <Badge variant={getTypeColor(asana.type)}>{getTypeLabel(asana.type)}</Badge>
      ),
    },
    {
      key: 'difficulty',
      header: 'Difficulty',
      render: (asana) => (
        <Badge variant={getDifficultyColor(asana.difficulty)}>
          {asana.difficulty.charAt(0).toUpperCase() + asana.difficulty.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'bodyAreas',
      header: 'Primary Body Areas',
      render: (asana) => (
        <div className="flex flex-wrap gap-1">
          {asana.primaryBodyAreas.slice(0, 3).map((area) => (
            <span
              key={area}
              className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded"
            >
              {BODY_AREA_LABELS[area]}
            </span>
          ))}
          {asana.primaryBodyAreas.length > 3 && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
              +{asana.primaryBodyAreas.length - 3}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'benefits',
      header: 'Benefits',
      render: (asana) => (
        <div className="text-sm text-gray-600 max-w-xs truncate" title={asana.benefits.join(', ')}>
          {asana.benefits.slice(0, 2).join(', ')}
          {asana.benefits.length > 2 && ` +${asana.benefits.length - 2} more`}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (asana) => (
        <StatusBadge status={asana.isActive ? 'Active' : 'Inactive'} />
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (asana) => (
        <div className="flex gap-2 justify-end">
          <Link to={`/admin/asanas/${asana.id}`}>
            <Button variant="outline" size="sm">Edit</Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleActive(asana)}
            className={asana.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
          >
            {asana.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ];

  // Stats by type
  const typeStats = ASANA_TYPE_OPTIONS.map(type => ({
    type: type.value,
    label: type.label,
    count: allAsanas.filter(a => a.type === type.value && a.isActive).length,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asanas</h1>
          <p className="text-gray-600">Manage your yoga poses, pranayama, and kriyas library</p>
        </div>
        <Button onClick={() => navigate('/admin/asanas/new')}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Asana
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

      {/* Stats - Compact horizontal badges */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-full text-sm font-medium whitespace-nowrap">
          <span className="text-gray-300">Total:</span>
          <span>{allAsanas.filter(a => a.isActive).length}</span>
        </span>
        {typeStats.map(stat => (
          <button
            key={stat.type}
            onClick={() => setTypeFilter(typeFilter === stat.type ? '' : stat.type)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              typeFilter === stat.type
                ? 'ring-2 ring-offset-1 ring-indigo-500'
                : ''
            } ${
              stat.type === 'asana' ? 'bg-blue-100 text-blue-700' :
              stat.type === 'pranayama' ? 'bg-purple-100 text-purple-700' :
              stat.type === 'kriya' ? 'bg-cyan-100 text-cyan-700' :
              stat.type === 'exercise' ? 'bg-orange-100 text-orange-700' :
              stat.type === 'relaxation' ? 'bg-green-100 text-green-700' :
              'bg-pink-100 text-pink-700'
            }`}
          >
            <span>{stat.label}</span>
            <span className="font-bold">{stat.count}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: '', label: 'All Types' },
              ...ASANA_TYPE_OPTIONS,
            ]}
          />
          <Select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            options={[
              { value: '', label: 'All Difficulties' },
              ...DIFFICULTY_LEVEL_OPTIONS,
            ]}
          />
          <Select
            value={bodyAreaFilter}
            onChange={(e) => setBodyAreaFilter(e.target.value)}
            options={[
              { value: '', label: 'All Body Areas' },
              ...BODY_AREA_OPTIONS,
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
        </div>
        <div className="mt-3 text-sm text-gray-600">
          {asanas.length} {asanas.length === 1 ? 'asana' : 'asanas'} found
        </div>
      </Card>

      {/* Asanas table */}
      {asanas.length === 0 ? (
        <EmptyState
          icon={EmptyIcons.document}
          title="No asanas found"
          description={search || typeFilter || difficultyFilter || bodyAreaFilter
            ? "Try adjusting your filters to find what you're looking for."
            : "Get started by adding your first asana to the library."
          }
          action={
            !search && !typeFilter && !difficultyFilter && !bodyAreaFilter && (
              <Link to="/admin/asanas/new">
                <Button>Add Asana</Button>
              </Link>
            )
          }
        />
      ) : (
        <Card>
          <DataTable
            data={asanas}
            columns={columns}
            keyExtractor={(asana) => asana.id}
          />
        </Card>
      )}
    </div>
  );
}
