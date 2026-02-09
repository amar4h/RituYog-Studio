import { useState, useMemo } from 'react';
import { Card, Button, Alert, PageLoading, Modal, Badge, Input } from '../../../components/common';
import {
  sessionPlanAllocationService,
  sessionPlanService,
  sessionExecutionService,
  slotService,
} from '../../../services';
import { useFreshData } from '../../../hooks';
import { BODY_AREA_LABELS, DIFFICULTY_LEVEL_OPTIONS } from '../../../constants';
import { OveruseWarningBadge } from '../../../components/sessionPlanning/OveruseWarningBadge';
import type { SessionPlan, SessionPlanAllocation, DifficultyLevel } from '../../../types';
import { format, addDays, subDays, startOfWeek, endOfWeek, isToday, isSameDay, parseISO } from 'date-fns';

// Session Plan Picker Modal
interface SessionPlanPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (plan: SessionPlan) => void;
  plans: SessionPlan[];
}

function SessionPlanPickerModal({ isOpen, onClose, onSelect, plans }: SessionPlanPickerModalProps) {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('');

  const filteredPlans = useMemo(() => {
    return plans.filter(plan => {
      const matchesSearch = !search ||
        plan.name.toLowerCase().includes(search.toLowerCase()) ||
        plan.description?.toLowerCase().includes(search.toLowerCase());
      const matchesLevel = !levelFilter || plan.level === levelFilter;
      return matchesSearch && matchesLevel;
    });
  }, [plans, search, levelFilter]);

  const getDifficultyColor = (difficulty: DifficultyLevel): 'green' | 'yellow' | 'red' => {
    const colorMap: Record<DifficultyLevel, 'green' | 'yellow' | 'red'> = {
      beginner: 'green',
      intermediate: 'yellow',
      advanced: 'red',
    };
    return colorMap[difficulty] || 'green';
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Session Plan" size="lg">
      <div className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            placeholder="Search plans..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Levels</option>
            {DIFFICULTY_LEVEL_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Plans grid */}
        <div className="max-h-96 overflow-y-auto">
          {filteredPlans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No plans found matching your criteria
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredPlans.map(plan => {
                const overuseWarning = sessionPlanService.getOveruseWarning(plan.id);
                const dominantAreas = sessionPlanService.getDominantBodyAreas(plan);

                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => {
                      onSelect(plan);
                      onClose();
                    }}
                    className={`text-left p-4 border rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-colors ${
                      overuseWarning.isOverused ? 'border-orange-200 bg-orange-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-gray-900">{plan.name}</div>
                      {overuseWarning.isOverused && overuseWarning.reason && (
                        <OveruseWarningBadge reason={overuseWarning.reason} />
                      )}
                    </div>
                    {plan.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{plan.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Badge variant={getDifficultyColor(plan.level)}>
                        {plan.level}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        Used {plan.usageCount} times
                      </span>
                    </div>
                    {dominantAreas.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {dominantAreas.slice(0, 3).map(area => (
                          <span
                            key={area}
                            className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                          >
                            {BODY_AREA_LABELS[area]}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// Slot Tile Component
interface SlotTileProps {
  slot: { id: string; displayName: string; startTime: string };
  date: string;
  allocation: SessionPlanAllocation | null;
  plan: SessionPlan | null;
  hasExecution: boolean;
  onAllocate: () => void;
  onCancel: () => void;
}

function SlotTile({ slot, date, allocation, plan, hasExecution, onAllocate, onCancel }: SlotTileProps) {
  const getStatusColor = () => {
    if (hasExecution) return 'bg-green-50 border-green-200';
    if (allocation?.status === 'scheduled') return 'bg-blue-50 border-blue-200';
    if (allocation?.status === 'cancelled') return 'bg-gray-50 border-gray-200';
    return 'bg-white border-gray-200';
  };

  const getStatusLabel = () => {
    if (hasExecution) return 'Executed';
    if (allocation?.status === 'scheduled') return 'Scheduled';
    if (allocation?.status === 'cancelled') return 'Cancelled';
    return 'Unscheduled';
  };

  const getStatusBadgeVariant = (): 'green' | 'blue' | 'gray' => {
    if (hasExecution) return 'green';
    if (allocation?.status === 'scheduled') return 'blue';
    return 'gray';
  };

  return (
    <div className={`p-3 border rounded-lg ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium text-gray-900 text-sm">{slot.displayName}</div>
        <Badge variant={getStatusBadgeVariant()}>{getStatusLabel()}</Badge>
      </div>
      <div className="text-xs text-gray-500 mb-3">{slot.startTime}</div>

      {plan ? (
        <div className="space-y-2">
          <div className="font-medium text-gray-900 text-sm">{plan.name}</div>
          <div className="flex items-center gap-2">
            <Badge variant={plan.level === 'beginner' ? 'green' : plan.level === 'intermediate' ? 'yellow' : 'red'}>
              {plan.level}
            </Badge>
          </div>
          {!hasExecution && allocation?.status === 'scheduled' && (
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                className="flex-1 text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onAllocate}
                className="flex-1 text-xs"
              >
                Change
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={onAllocate}
          className="w-full"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Allocate
        </Button>
      )}
    </div>
  );
}

// Main Page Component
export function SessionAllocationPage() {
  const { isLoading, refetch } = useFreshData([
    'session-plan-allocations',
    'session-plans',
    'session-executions',
    'slots',
  ]);

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshKey, setRefreshKey] = useState(0); // Trigger to force data refresh

  // Picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSlotId, setPickerSlotId] = useState<string | null>(null);
  const [pickerDate, setPickerDate] = useState<string | null>(null);
  const [bulkAllocateDate, setBulkAllocateDate] = useState<string | null>(null);

  const slots = useMemo(() => {
    if (isLoading) return [];
    return slotService.getActive();
  }, [isLoading, refreshKey]);

  const plans = useMemo(() => {
    if (isLoading) return [];
    return sessionPlanService.getActive();
  }, [isLoading, refreshKey]);

  const allocations = useMemo(() => {
    if (isLoading) return [];
    return sessionPlanAllocationService.getAll();
  }, [isLoading, refreshKey]);

  const executions = useMemo(() => {
    if (isLoading) return [];
    return sessionExecutionService.getAll();
  }, [isLoading, refreshKey]);

  // Get week dates
  const weekDates = useMemo(() => {
    const parsed = parseISO(selectedDate);
    const start = startOfWeek(parsed, { weekStartsOn: 1 }); // Monday start
    return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), 'yyyy-MM-dd'));
  }, [selectedDate]);

  const displayDates = viewMode === 'week' ? weekDates : [selectedDate];

  if (isLoading) {
    return <PageLoading />;
  }

  const getAllocationForSlot = (slotId: string, date: string): SessionPlanAllocation | null => {
    return allocations.find(
      a => a.slotId === slotId && a.date === date && a.status !== 'cancelled'
    ) || null;
  };

  const getPlanById = (planId: string): SessionPlan | null => {
    return plans.find(p => p.id === planId) || null;
  };

  const hasExecutionForSlot = (slotId: string, date: string): boolean => {
    return executions.some(e => e.slotId === slotId && e.date === date);
  };

  const handleOpenPicker = (slotId: string, date: string) => {
    setPickerSlotId(slotId);
    setPickerDate(date);
    setBulkAllocateDate(null);
    setPickerOpen(true);
  };

  const handleOpenBulkPicker = (date: string) => {
    setPickerSlotId(null);
    setPickerDate(null);
    setBulkAllocateDate(date);
    setPickerOpen(true);
  };

  const handleSelectPlan = async (plan: SessionPlan) => {
    setError('');
    setSuccess('');

    try {
      if (bulkAllocateDate) {
        // Bulk allocate to all slots
        const results = sessionPlanAllocationService.allocateToAllSlots(plan.id, bulkAllocateDate);
        setSuccess(`"${plan.name}" allocated to ${results.length} slots on ${format(parseISO(bulkAllocateDate), 'dd MMM yyyy')}`);
      } else if (pickerSlotId && pickerDate) {
        // Single slot allocation
        // First cancel existing allocation if any
        const existing = getAllocationForSlot(pickerSlotId, pickerDate);
        if (existing) {
          sessionPlanAllocationService.cancel(existing.id);
        }
        sessionPlanAllocationService.allocate(plan.id, pickerSlotId, pickerDate);
        const slot = slots.find(s => s.id === pickerSlotId);
        setSuccess(`"${plan.name}" allocated to ${slot?.displayName || 'slot'} on ${format(parseISO(pickerDate), 'dd MMM yyyy')}`);
      }
      setRefreshKey(k => k + 1); // Force UI refresh
      refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to allocate plan');
    }

    setPickerOpen(false);
    setPickerSlotId(null);
    setPickerDate(null);
    setBulkAllocateDate(null);
  };

  const handleCancelAllocation = async (allocationId: string) => {
    setError('');
    setSuccess('');

    try {
      sessionPlanAllocationService.cancel(allocationId);
      setSuccess('Allocation cancelled');
      setRefreshKey(k => k + 1); // Force UI refresh
      refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel allocation');
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const parsed = parseISO(selectedDate);
    const days = viewMode === 'week' ? 7 : 1;
    const newDate = direction === 'prev' ? subDays(parsed, days) : addDays(parsed, days);
    setSelectedDate(format(newDate, 'yyyy-MM-dd'));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Session Allocations</h1>
          <p className="text-gray-600">Pre-schedule session plans to slots</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'day' ? 'primary' : 'outline'}
            onClick={() => setViewMode('day')}
            size="sm"
          >
            Day
          </Button>
          <Button
            variant={viewMode === 'week' ? 'primary' : 'outline'}
            onClick={() => setViewMode('week')}
            size="sm"
          >
            Week
          </Button>
        </div>
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

      {/* Date Navigation */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <Button variant="outline" onClick={() => navigateDate('prev')}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>

          <div className="flex items-center gap-4">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
            >
              Today
            </Button>
          </div>

          <Button variant="outline" onClick={() => navigateDate('next')}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </Card>

      {/* Allocations Grid */}
      <div className="space-y-4">
        {displayDates.map(date => {
          const parsedDate = parseISO(date);
          const isTodayDate = isToday(parsedDate);
          const dayHasAllocation = slots.some(slot => getAllocationForSlot(slot.id, date));

          return (
            <Card key={date} className={`p-4 ${isTodayDate ? 'ring-2 ring-indigo-500' : ''}`}>
              {/* Date Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-lg font-medium text-gray-900">
                    {format(parsedDate, 'EEEE, dd MMM yyyy')}
                  </div>
                  {isTodayDate && (
                    <Badge variant="indigo">Today</Badge>
                  )}
                </div>
                {!dayHasAllocation && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenBulkPicker(date)}
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Apply to All Slots
                  </Button>
                )}
              </div>

              {/* Slot Tiles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {slots.map(slot => {
                  const allocation = getAllocationForSlot(slot.id, date);
                  const plan = allocation ? getPlanById(allocation.sessionPlanId) : null;
                  const hasExecution = hasExecutionForSlot(slot.id, date);

                  return (
                    <SlotTile
                      key={slot.id}
                      slot={slot}
                      date={date}
                      allocation={allocation}
                      plan={plan}
                      hasExecution={hasExecution}
                      onAllocate={() => handleOpenPicker(slot.id, date)}
                      onCancel={() => allocation && handleCancelAllocation(allocation.id)}
                    />
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Plan Picker Modal */}
      <SessionPlanPickerModal
        isOpen={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setPickerSlotId(null);
          setPickerDate(null);
          setBulkAllocateDate(null);
        }}
        onSelect={handleSelectPlan}
        plans={plans}
      />
    </div>
  );
}
