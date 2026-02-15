import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, Button, Badge, PageLoading, Alert } from '../../../components/common';
import { sessionPlanService, asanaService, settingsService } from '../../../services';
import { useFreshData } from '../../../hooks';
import { BODY_AREA_LABELS, BREATHING_CUE_OPTIONS } from '../../../constants';
import { SECTION_LABELS } from '../../../types';
import { OveruseWarningBadge } from '../../../components/sessionPlanning/OveruseWarningBadge';
import { downloadSessionPlanAsJPG } from '../../../utils/sessionPlanImage';
import type { DifficultyLevel, BodyArea, SectionType, SessionPlan, Asana } from '../../../types';
import type { SessionPlanImageData, SessionPlanImageSection, SessionPlanImageItem } from '../../../utils/sessionPlanImage';
import { format } from 'date-fns';

export function SessionPlanDetailPage() {
  const { isLoading } = useFreshData(['session-plans', 'asanas', 'session-executions']);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [collapsedSections, setCollapsedSections] = useState<Set<SectionType>>(new Set());
  const [expandedSurya, setExpandedSurya] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);

  const plan = useMemo(() => {
    if (isLoading || !id) return null;
    return sessionPlanService.getById(id);
  }, [id, isLoading]);

  const allAsanas = useMemo(() => {
    if (isLoading) return [];
    return asanaService.getAll();
  }, [isLoading]);

  const overuseWarning = useMemo(() => {
    if (!id) return { isOverused: false };
    return sessionPlanService.getOveruseWarning(id);
  }, [id]);

  if (isLoading) {
    return <PageLoading />;
  }

  if (!plan) {
    return (
      <div className="space-y-6">
        <Alert variant="error">Session plan not found</Alert>
        <Button onClick={() => navigate('/admin/session-plans')}>
          Back to Session Plans
        </Button>
      </div>
    );
  }

  const getAsana = (asanaId: string) => allAsanas.find(a => a.id === asanaId);

  // Prepare image data for JPG download
  const prepareImageData = (plan: SessionPlan, asanas: Asana[]): SessionPlanImageData => {
    const settings = settingsService.getOrDefault();
    const asanaMap = new Map(asanas.map(a => [a.id, a]));

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
              isVinyasa: !!isVinyasa,
              childSteps,
            };
          }),
      }));

    return {
      planName: plan.name,
      planLevel: plan.level,
      planDescription: plan.description,
      sections,
      studioName: settings.studioName,
      logoData: settings.logoData,
    };
  };

  const handleDownloadJPG = async () => {
    if (!plan) return;
    setDownloading(true);
    try {
      const imageData = prepareImageData(plan, allAsanas);
      await downloadSessionPlanAsJPG(imageData);
    } catch (err) {
      console.error('Failed to download JPG:', err);
    } finally {
      setDownloading(false);
    }
  };

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

  // Helper to format vinyasa child asanas with Sanskrit names and breathing cues
  const formatVinyasaChildren = (asanaId: string) => {
    const asana = getAsana(asanaId);
    if (!asana?.childAsanas?.length) return null;

    return asana.childAsanas
      .sort((a, b) => a.order - b.order)
      .map((child, idx) => {
        const childAsana = getAsana(child.asanaId);
        if (!childAsana) return <span key={idx}>?</span>;
        const childSanskrit = childAsana.sanskritName ? ` (${childAsana.sanskritName})` : '';
        const cue = getBreathingCue(childAsana.breathingCue);

        return (
          <span key={idx}>
            {idx > 0 && <span className="text-gray-400"> → </span>}
            <span>{childAsana.name}{childSanskrit}</span>
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

  // Helper to get minimal breathing cue indicator
  const getBreathingCue = (cue?: string) => {
    if (!cue) return null;
    const option = BREATHING_CUE_OPTIONS.find(o => o.value === cue);
    if (!option) return null;
    // Use short abbreviations: In, Ex, Ho
    const abbrev = cue === 'inhale' ? 'In' : cue === 'exhale' ? 'Ex' : 'Ho';
    return { abbrev, color: option.color };
  };

  // Calculate totals
  const totalItems = plan.sections.reduce((sum, s) => sum + s.items.length, 0);
  const totalDuration = plan.sections.reduce(
    (sum, s) => sum + s.items.reduce((iSum, item) => iSum + (item.durationMinutes || 0), 0),
    0
  );

  // Calculate body areas
  const bodyAreaCounts: Record<string, number> = {};
  plan.sections.forEach(section => {
    section.items.forEach(item => {
      const asana = getAsana(item.asanaId);
      if (asana) {
        [...asana.primaryBodyAreas, ...asana.secondaryBodyAreas].forEach(area => {
          bodyAreaCounts[area] = (bodyAreaCounts[area] || 0) + 1;
        });
      }
    });
  });

  const dominantAreas = Object.entries(bodyAreaCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([area]) => area as BodyArea);

  // Calculate benefits
  const benefitCounts: Record<string, number> = {};
  plan.sections.forEach(section => {
    section.items.forEach(item => {
      const asana = getAsana(item.asanaId);
      if (asana) {
        asana.benefits.forEach(benefit => {
          benefitCounts[benefit] = (benefitCounts[benefit] || 0) + 1;
        });
      }
    });
  });

  const keyBenefits = Object.entries(benefitCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([benefit]) => benefit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{plan.name}</h1>
            <Badge variant={getDifficultyColor(plan.level)}>
              {plan.level.charAt(0).toUpperCase() + plan.level.slice(1)}
            </Badge>
            <Badge variant={plan.isActive ? 'green' : 'gray'}>
              {plan.isActive ? 'Active' : 'Inactive'}
            </Badge>
            {overuseWarning.isOverused && overuseWarning.reason && (
              <OveruseWarningBadge reason={overuseWarning.reason} />
            )}
          </div>
          {plan.description && (
            <p className="text-gray-600 mt-2 italic">— {plan.description}</p>
          )}
          <div className="text-sm text-gray-500 mt-2">
            Version {plan.version} · Used {plan.usageCount} times
            {plan.lastUsedAt && (
              <> · Last used <span className="whitespace-nowrap">{format(new Date(plan.lastUsedAt), 'dd MMM yyyy')}</span></>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => navigate('/admin/session-plans')}>
            Back
          </Button>
          <Link to={`/admin/session-plans/${plan.id}/edit`}>
            <Button variant="outline">Edit</Button>
          </Link>
          <Button
            variant="outline"
            onClick={handleDownloadJPG}
            disabled={downloading}
          >
            {downloading ? 'Saving...' : 'Download JPG'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - Collapsible sections matching Today's Sessions format */}
        <div className="lg:col-span-2 space-y-2">
          {plan.sections
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
                  {/* Section Header - clickable */}
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
                          const asana = getAsana(item.asanaId);
                          const isVinyasa = asana?.type === 'vinyasa' || asana?.type === 'surya_namaskar';
                          const sanskritName = asana?.sanskritName;

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
                                            {formatVinyasaChildren(item.asanaId)}
                                          </span>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        :{' '}
                                        <span className="text-gray-700 inline-flex flex-wrap items-center gap-x-0">
                                          {formatVinyasaChildren(item.asanaId)}
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
                                      const cue = getBreathingCue(asana?.breathingCue);
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

          {/* Empty state if no sections have items */}
          {plan.sections.every(s => s.items.length === 0) && (
            <Card className="p-8 text-center">
              <p className="text-gray-500">No asanas in this plan yet.</p>
              <Link to={`/admin/session-plans/${plan.id}/edit`}>
                <Button variant="outline" className="mt-4">Add Asanas</Button>
              </Link>
            </Card>
          )}
        </div>

        {/* Summary Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4 p-4 space-y-4">
            <h3 className="font-medium text-gray-900">Plan Summary</h3>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-indigo-600">{totalItems}</div>
                <div className="text-xs text-gray-500">Total Items</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-indigo-600">{totalDuration}</div>
                <div className="text-xs text-gray-500">Minutes</div>
              </div>
            </div>

            {/* Body areas */}
            {dominantAreas.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <div className="text-sm font-medium text-gray-700">Focus Areas</div>
                <div className="flex flex-wrap gap-1">
                  {dominantAreas.map(area => (
                    <span
                      key={area}
                      className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded"
                    >
                      {BODY_AREA_LABELS[area]}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Benefits */}
            {keyBenefits.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <div className="text-sm font-medium text-gray-700">Key Benefits</div>
                <ul className="text-sm text-gray-600 space-y-1">
                  {keyBenefits.map(benefit => (
                    <li key={benefit} className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Usage info */}
            <div className="space-y-2 border-t pt-4">
              <div className="text-sm font-medium text-gray-700">Usage Stats</div>
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Times used</span>
                  <span className="font-medium">{plan.usageCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last used</span>
                  <span className="font-medium">
                    {plan.lastUsedAt
                      ? format(new Date(plan.lastUsedAt), 'dd MMM yyyy')
                      : 'Never'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Version</span>
                  <span className="font-medium">{plan.version}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
