import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Alert, PageLoading, Badge, DateNavigator } from '../../../components/common';
import {
  sessionExecutionService,
  sessionPlanService,
  sessionPlanAllocationService,
  slotService,
  asanaService,
  settingsService,
} from '../../../services';
import { useFreshData } from '../../../hooks';
import { BREATHING_CUE_OPTIONS } from '../../../constants';
import { SECTION_LABELS } from '../../../types';
import { downloadSessionPlanAsJPG } from '../../../utils/sessionPlanImage';
import type { SessionPlan, DifficultyLevel, SectionType, SessionSlot } from '../../../types';
import type { SessionPlanImageData, SessionPlanImageSection, SessionPlanImageItem } from '../../../utils/sessionPlanImage';
import { format, parse, differenceInMinutes, isToday } from 'date-fns';

// Helper to parse slot time (e.g., "07:30 AM") to today's Date
function parseSlotTime(startTime: string): Date {
  const today = new Date();
  try {
    // Try parsing "HH:mm" format first
    if (/^\d{2}:\d{2}$/.test(startTime)) {
      return parse(startTime, 'HH:mm', today);
    }
    // Try "hh:mm a" format (e.g., "07:30 AM")
    return parse(startTime, 'hh:mm a', today);
  } catch {
    return today;
  }
}

// Get the best slot to auto-select based on current time
function getAutoSelectedSlot(slots: SessionSlot[]): string | null {
  if (slots.length === 0) return null;

  const now = new Date();

  // Sort slots by time
  const sortedSlots = [...slots].sort((a, b) => {
    const timeA = parseSlotTime(a.startTime);
    const timeB = parseSlotTime(b.startTime);
    return timeA.getTime() - timeB.getTime();
  });

  // Find the next upcoming slot (within 15 min or just started)
  for (const slot of sortedSlots) {
    const slotTime = parseSlotTime(slot.startTime);
    const minUntilStart = differenceInMinutes(slotTime, now);

    // If slot starts within next 15 minutes OR started within last 60 minutes
    if (minUntilStart >= -60 && minUntilStart <= 15) {
      return slot.id;
    }
  }

  // If no slot is upcoming soon, find the next slot today
  for (const slot of sortedSlots) {
    const slotTime = parseSlotTime(slot.startTime);
    if (slotTime > now) {
      return slot.id;
    }
  }

  // Default to first slot
  return sortedSlots[0]?.id || null;
}

export function RecordExecutionPage() {
  const { isLoading, refetch } = useFreshData([
    'session-executions',
    'session-plans',
    'session-plan-allocations',
    'slots',
    'asanas',
  ]);
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<SectionType>>(new Set());
  const [expandedSurya, setExpandedSurya] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [markingComplete, setMarkingComplete] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const slots = useMemo(() => {
    if (isLoading) return [];
    return slotService.getActive();
  }, [isLoading, refreshKey]);

  // Auto-select slot based on current time (only on initial load and when viewing today)
  useEffect(() => {
    if (slots.length > 0 && !selectedSlotId) {
      const isTodaySelected = isToday(new Date(selectedDate));
      if (isTodaySelected) {
        const autoSlot = getAutoSelectedSlot(slots);
        if (autoSlot) {
          setSelectedSlotId(autoSlot);
        }
      } else {
        // For other dates, select first slot
        setSelectedSlotId(slots[0]?.id || null);
      }
    }
  }, [slots, selectedDate, selectedSlotId]);

  // Reset slot selection when date changes
  useEffect(() => {
    const isTodaySelected = isToday(new Date(selectedDate));
    if (isTodaySelected && slots.length > 0) {
      const autoSlot = getAutoSelectedSlot(slots);
      setSelectedSlotId(autoSlot);
    } else if (slots.length > 0) {
      setSelectedSlotId(slots[0]?.id || null);
    }
    // Reset UI state when date changes
    setCollapsedSections(new Set());
    setError('');
    setSuccess('');
  }, [selectedDate]);

  // Get data for selected slot
  const slotData = useMemo(() => {
    if (isLoading || !selectedSlotId) return { allocation: null, execution: null, plan: null };

    const allocation = sessionPlanAllocationService.getBySlotAndDate(selectedSlotId, selectedDate);
    const execution = sessionExecutionService.getBySlotAndDate(selectedSlotId, selectedDate);
    const plan = allocation ? sessionPlanService.getById(allocation.sessionPlanId) : null;

    return { allocation, execution, plan };
  }, [isLoading, selectedSlotId, selectedDate, refreshKey]);

  const selectedSlot = useMemo(() => {
    return slots.find(s => s.id === selectedSlotId) || null;
  }, [slots, selectedSlotId]);

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

  const toggleSection = (sectionType: SectionType) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionType)) {
        newSet.delete(sectionType);
      } else {
        newSet.add(sectionType);
      }
      return newSet;
    });
  };

  const handleMarkComplete = async () => {
    if (!selectedSlotId || !slotData.plan) return;

    setError('');
    setSuccess('');
    setMarkingComplete(true);

    try {
      sessionExecutionService.create(
        slotData.plan.id,
        selectedSlotId,
        selectedDate,
        undefined,
        undefined
      );

      setSuccess(`${selectedSlot?.displayName || 'Session'} marked as complete!`);
      setRefreshKey(k => k + 1);
      refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record execution');
    } finally {
      setMarkingComplete(false);
    }
  };

  const getSlotStatus = (slotId: string) => {
    const execution = sessionExecutionService.getBySlotAndDate(slotId, selectedDate);
    const allocation = sessionPlanAllocationService.getBySlotAndDate(slotId, selectedDate);

    if (execution) return 'completed';
    if (allocation) return 'scheduled';
    return 'no-plan';
  };

  const handleDownloadJPG = async (plan: SessionPlan) => {
    setDownloading(true);
    try {
      const settings = settingsService.getOrDefault();
      const allAsanas = asanaService.getAll();
      const asanaMap = new Map(allAsanas.map(a => [a.id, a]));

      const sections: SessionPlanImageSection[] = plan.sections
        .filter(s => s.items.length > 0)
        .sort((a, b) => a.order - b.order)
        .map(section => ({
          sectionType: section.sectionType,
          label: SECTION_LABELS[section.sectionType],
          items: section.items
            .sort((a, b) => a.order - b.order)
            .map((item): SessionPlanImageItem => {
              const asana = asanaMap.get(item.asanaId);
              const isVinyasa = asana?.type === 'vinyasa' || asana?.type === 'surya_namaskar';
              let childSteps: string[] | undefined;
              if (isVinyasa && asana?.childAsanas?.length) {
                childSteps = asana.childAsanas
                  .sort((a, b) => a.order - b.order)
                  .map(child => asanaMap.get(child.asanaId)?.name || '?');
              }
              return {
                name: asana?.name || 'Unknown Asana',
                sanskritName: asana?.sanskritName,
                variation: item.variation,
                durationMinutes: item.durationMinutes,
                reps: item.reps,
                breathingCue: asana?.breathingCue,
                isVinyasa: !!isVinyasa,
                childSteps,
              };
            }),
        }));

      const imageData: SessionPlanImageData = {
        planName: plan.name,
        planLevel: plan.level,
        planDescription: plan.description,
        sections,
        studioName: settings.studioName,
        logoData: settings.logoData,
        slotTime: selectedSlot?.startTime,
        date: format(new Date(selectedDate), 'dd MMM yyyy'),
      };

      await downloadSessionPlanAsJPG(imageData);
    } catch (err) {
      console.error('Failed to download JPG:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Compact Header - Date + Slots in single line */}
      <div className="bg-white sticky top-0 z-10 flex items-center gap-2 py-2 overflow-x-auto">
        {/* Date Navigation - compact */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => {
              const prev = new Date(selectedDate);
              prev.setDate(prev.getDate() - 1);
              setSelectedDate(format(prev, 'yyyy-MM-dd'));
            }}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
            className={`px-2 py-1 text-xs font-medium rounded ${
              isToday(new Date(selectedDate))
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isToday(new Date(selectedDate))
              ? 'Today'
              : format(new Date(selectedDate), 'dd MMM')}
          </button>
          <button
            onClick={() => {
              const next = new Date(selectedDate);
              next.setDate(next.getDate() + 1);
              setSelectedDate(format(next, 'yyyy-MM-dd'));
            }}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-300 flex-shrink-0" />

        {/* Slot Selector - compact, time only */}
        <div className="flex gap-1.5">
          {slots.map(slot => {
            const status = getSlotStatus(slot.id);
            const isSelected = slot.id === selectedSlotId;

            return (
              <button
                key={slot.id}
                onClick={() => {
                  setSelectedSlotId(slot.id);
                  setCollapsedSections(new Set());
                  setError('');
                  setSuccess('');
                }}
                className={`
                  px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap
                  transition-all touch-manipulation
                  ${isSelected
                    ? 'bg-indigo-600 text-white'
                    : status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : status === 'scheduled'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                  }
                `}
              >
                {slot.startTime}
              </button>
            );
          })}
        </div>
      </div>

      {/* Alerts */}
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

      {/* Selected Slot Content */}
      {selectedSlot && (
        <Card className="overflow-hidden">

          {/* Plan Content */}
          <div className="p-3">
            {slotData.plan ? (
              <>
                {/* Plan header with inline action */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-gray-900">{slotData.plan.name}</span>
                  <Badge variant={getDifficultyColor(slotData.plan.level)} size="sm">
                    {slotData.plan.level}
                  </Badge>
                  {/* Download JPG button */}
                  <button
                    onClick={() => handleDownloadJPG(slotData.plan!)}
                    disabled={downloading}
                    className="p-1 text-gray-400 hover:text-indigo-600 transition-colors touch-manipulation"
                    title="Download as JPG"
                  >
                    {downloading ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    )}
                  </button>
                  <span className="flex-1" />
                  {/* Inline action button */}
                  {slotData.execution ? (
                    <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Done
                    </span>
                  ) : (
                    <button
                      onClick={handleMarkComplete}
                      disabled={markingComplete}
                      className={`
                        px-3 py-1 rounded text-sm font-medium text-white
                        transition-colors touch-manipulation
                        ${markingComplete
                          ? 'bg-gray-400 cursor-wait'
                          : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
                        }
                      `}
                    >
                      {markingComplete ? '...' : '✓ Done'}
                    </button>
                  )}
                </div>
                {slotData.plan.description && (
                  <p className="text-xs text-gray-500 italic mb-2">— {slotData.plan.description}</p>
                )}

                {/* Sections - expanded by default, with green/red shading */}
                <div className="space-y-2">
                  {slotData.plan.sections
                    .filter(s => s.items.length > 0)
                    .sort((a, b) => a.order - b.order)
                    .map(section => {
                      const isCollapsed = collapsedSections.has(section.sectionType);

                      return (
                        <div
                          key={section.sectionType}
                          className={`
                            rounded-lg overflow-hidden transition-colors
                            ${isCollapsed ? 'bg-gray-50' : 'bg-slate-50'}
                          `}
                        >
                          {/* Section Header - clickable, compact */}
                          <button
                            onClick={() => toggleSection(section.sectionType)}
                            className={`
                              w-full flex items-center justify-between px-3 py-2
                              transition-colors touch-manipulation
                              ${isCollapsed ? 'bg-gray-100' : 'bg-slate-100'}
                            `}
                          >
                            <div className="flex items-center gap-2">
                              <svg
                                className={`w-3 h-3 transition-transform ${isCollapsed ? '' : 'rotate-90'} text-gray-500`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <span className="font-medium text-sm text-gray-800">
                                {SECTION_LABELS[section.sectionType]}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({section.items.length})
                              </span>
                            </div>
                            <svg
                              className="w-4 h-4 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              {isCollapsed ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              )}
                            </svg>
                          </button>

                          {/* Section Content - compact asana list */}
                          {!isCollapsed && (
                            <div className="px-3 pb-2">
                              {section.items
                                .sort((a, b) => a.order - b.order)
                                .map((item, idx) => {
                                  const asana = asanaService.getById(item.asanaId);
                                  const isVinyasa = asana?.type === 'vinyasa' || asana?.type === 'surya_namaskar';
                                  const sanskritName = asana?.sanskritName;

                                  // Helper to format vinyasa child asanas with Sanskrit names and breathing cues
                                  const formatVinyasaChildren = () => {
                                    if (!asana?.childAsanas?.length) return null;

                                    return asana.childAsanas
                                      .sort((a, b) => a.order - b.order)
                                      .map((child, childIdx) => {
                                        const childAsana = asanaService.getById(child.asanaId);
                                        if (!childAsana) return <span key={childIdx}>?</span>;
                                        const childSanskrit = childAsana.sanskritName && childAsana.sanskritName !== childAsana.name ? ` (${childAsana.sanskritName})` : '';
                                        const cue = getBreathingCue();
                                        // Get breathing cue for child asana
                                        const childCue = childAsana.breathingCue ? (() => {
                                          const option = BREATHING_CUE_OPTIONS.find(o => o.value === childAsana.breathingCue);
                                          if (!option) return null;
                                          const abbrev = childAsana.breathingCue === 'inhale' ? 'In' : childAsana.breathingCue === 'exhale' ? 'Ex' : 'Ho';
                                          return { abbrev, color: option.color };
                                        })() : null;

                                        return (
                                          <span key={childIdx}>
                                            {childIdx > 0 && <span className="text-gray-400"> → </span>}
                                            <span>{childAsana.name}{childSanskrit}</span>
                                            {childCue && (
                                              <span className={`ml-0.5 text-[9px] font-medium px-0.5 rounded ${
                                                childCue.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                                                childCue.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                                                'bg-orange-100 text-orange-600'
                                              }`}>
                                                {childCue.abbrev}
                                              </span>
                                            )}
                                          </span>
                                        );
                                      });
                                  };

                                  // Helper to get minimal breathing cue indicator
                                  const getBreathingCue = () => {
                                    if (!asana?.breathingCue) return null;
                                    const option = BREATHING_CUE_OPTIONS.find(o => o.value === asana.breathingCue);
                                    if (!option) return null;
                                    const abbrev = asana.breathingCue === 'inhale' ? 'In' : asana.breathingCue === 'exhale' ? 'Ex' : 'Ho';
                                    return { abbrev, color: option.color };
                                  };

                                  return (
                                    <div
                                      key={`${item.asanaId}-${idx}`}
                                      className="flex items-start gap-2 py-1.5 border-b border-slate-100 last:border-b-0 text-sm"
                                    >
                                      {/* Number */}
                                      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-indigo-600 text-white text-xs font-bold rounded-full mt-0.5">
                                        {idx + 1}
                                      </span>
                                      {/* Name - for vinyasa/surya, show with collapsible details */}
                                      <div className="flex-1 min-w-0">
                                        {isVinyasa ? (
                                          <span className="text-gray-900 break-words">
                                            <span className="font-medium text-pink-600">{asana?.name}</span>
                                            {asana?.type === 'surya_namaskar' && asana?.childAsanas?.length ? (
                                              <>
                                                <button
                                                  onClick={() => setExpandedSurya(prev => {
                                                    const next = new Set(prev);
                                                    const key = `${item.asanaId}-${idx}`;
                                                    next.has(key) ? next.delete(key) : next.add(key);
                                                    return next;
                                                  })}
                                                  className="ml-1.5 text-[10px] text-gray-500 hover:text-indigo-600 transition-colors align-middle"
                                                  title={expandedSurya.has(`${item.asanaId}-${idx}`) ? 'Hide steps' : 'Show steps'}
                                                >
                                                  {expandedSurya.has(`${item.asanaId}-${idx}`)
                                                    ? '▾ hide steps'
                                                    : `▸ ${asana.childAsanas.length} steps`}
                                                </button>
                                                {expandedSurya.has(`${item.asanaId}-${idx}`) && (
                                                  <span className="text-gray-700 inline-flex flex-wrap items-center gap-x-0 mt-0.5 block">
                                                    {formatVinyasaChildren()}
                                                  </span>
                                                )}
                                              </>
                                            ) : (
                                              <>
                                                :{' '}
                                                <span className="text-gray-700 inline-flex flex-wrap items-center gap-x-0">
                                                  {formatVinyasaChildren()}
                                                </span>
                                              </>
                                            )}
                                          </span>
                                        ) : (
                                          <>
                                            <span className="font-medium text-gray-900">{asana?.name || 'Unknown Asana'}</span>
                                            {sanskritName && (
                                              <span className="text-gray-400 text-xs italic ml-1">({sanskritName})</span>
                                            )}
                                            {/* Minimal breathing cue indicator */}
                                            {(() => {
                                              const cue = getBreathingCue();
                                              if (!cue) return null;
                                              return (
                                                <span className={`ml-1 text-[10px] font-medium px-1 rounded ${
                                                  cue.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                                                  cue.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                                                  'bg-orange-100 text-orange-600'
                                                }`}>
                                                  {cue.abbrev}
                                                </span>
                                              );
                                            })()}
                                          </>
                                        )}
                                        {/* Variation */}
                                        {item.variation && (
                                          <span className="text-purple-600 text-xs ml-1">• {item.variation}</span>
                                        )}
                                      </div>
                                      {/* Duration/Reps - right aligned */}
                                      <div className="flex gap-1 flex-shrink-0">
                                        {item.durationMinutes && (
                                          <span className="text-blue-600 font-medium text-xs whitespace-nowrap">{item.durationMinutes}m</span>
                                        )}
                                        {item.reps && (
                                          <span className="text-blue-600 font-medium text-xs whitespace-nowrap">{item.reps}x</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>

              </>
            ) : (
              /* No plan allocated */
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="text-gray-500 text-lg mb-4">No session plan allocated for this slot.</div>
                <button
                  onClick={() => navigate('/admin/session-allocations')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Allocate Session Plan
                </button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Empty state if no slots */}
      {slots.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-gray-500">No session slots configured.</p>
          <button
            onClick={() => navigate('/admin/sessions')}
            className="text-indigo-600 hover:text-indigo-700 font-medium text-sm mt-2"
          >
            Configure Slots
          </button>
        </Card>
      )}
    </div>
  );
}
