import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Button, Input, Select, Alert, PageLoading, Modal, Badge } from '../../../components/common';
import { sessionPlanService, asanaService } from '../../../services';
import { useFreshData } from '../../../hooks';
import {
  DIFFICULTY_LEVEL_OPTIONS,
  INTENSITY_LEVEL_OPTIONS,
  BODY_AREA_LABELS,
  ASANA_TYPE_OPTIONS,
} from '../../../constants';
import type {
  SessionPlan,
  SessionPlanSection,
  SectionItem,
  SectionType,
  DifficultyLevel,
  IntensityLevel,
  Asana,
  BodyArea,
} from '../../../types';
import { SECTION_TYPES, SECTION_LABELS, SECTION_ORDER } from '../../../types';

// Section accordion component
interface SectionBuilderProps {
  section: SessionPlanSection;
  asanas: Asana[];
  onAddAsana: () => void;
  onRemoveItem: (index: number) => void;
  onUpdateItem: (index: number, updates: Partial<SectionItem>) => void;
  onMoveItem: (fromIndex: number, toIndex: number) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

function SectionBuilder({
  section,
  asanas,
  onAddAsana,
  onRemoveItem,
  onUpdateItem,
  onMoveItem,
  isExpanded,
  onToggle,
}: SectionBuilderProps) {
  const getAsanaName = (asanaId: string) => {
    const asana = asanas.find(a => a.id === asanaId);
    return asana?.name || 'Unknown Asana';
  };

  const getAsanaSanskrit = (asanaId: string) => {
    const asana = asanas.find(a => a.id === asanaId);
    return asana?.sanskritName;
  };

  const totalDuration = section.items.reduce(
    (sum, item) => sum + (item.durationMinutes || 0),
    0
  );

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Section Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 flex items-center justify-center bg-indigo-600 text-white text-sm font-medium rounded-full">
            {section.order}
          </span>
          <span className="font-medium text-gray-900">
            {SECTION_LABELS[section.sectionType]}
          </span>
          <span className="text-sm text-gray-500">
            ({section.items.length} {section.items.length === 1 ? 'item' : 'items'})
          </span>
          {totalDuration > 0 && (
            <span className="text-sm text-indigo-600">
              {totalDuration} min
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Section Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {section.items.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              No asanas in this section yet
            </div>
          ) : (
            <div className="space-y-3">
              {section.items.map((item, index) => (
                <div
                  key={`${item.asanaId}-${index}`}
                  className="p-3 bg-gray-50 rounded-lg space-y-3"
                >
                  {/* Top row: Order controls + Asana name + Remove button */}
                  <div className="flex items-start gap-3">
                    {/* Order controls */}
                    <div className="flex flex-col gap-0.5 items-center">
                      <button
                        type="button"
                        onClick={() => onMoveItem(index, index - 1)}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        title="Move up"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <span className="text-xs text-gray-500 w-4 text-center">{item.order}</span>
                      <button
                        type="button"
                        onClick={() => onMoveItem(index, index + 1)}
                        disabled={index === section.items.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        title="Move down"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    {/* Asana info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">{getAsanaName(item.asanaId)}</div>
                      {getAsanaSanskrit(item.asanaId) && (
                        <div className="text-sm text-gray-500 italic">{getAsanaSanskrit(item.asanaId)}</div>
                      )}
                    </div>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => onRemoveItem(index)}
                      className="text-red-500 hover:text-red-700 p-1 flex-shrink-0"
                      title="Remove"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Bottom row: Item controls - responsive grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">Variation</label>
                      <input
                        type="text"
                        value={item.variation || ''}
                        onChange={(e) => onUpdateItem(index, { variation: e.target.value })}
                        placeholder="e.g., Modified"
                        className="px-2 py-1.5 text-sm border rounded w-full"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">Duration (min)</label>
                      <input
                        type="number"
                        value={item.durationMinutes || ''}
                        onChange={(e) => onUpdateItem(index, { durationMinutes: parseInt(e.target.value) || undefined })}
                        placeholder="0"
                        min="0"
                        className="px-2 py-1.5 text-sm border rounded w-full"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">Reps</label>
                      <input
                        type="number"
                        value={item.reps || ''}
                        onChange={(e) => onUpdateItem(index, { reps: parseInt(e.target.value) || undefined })}
                        placeholder="0"
                        min="0"
                        className="px-2 py-1.5 text-sm border rounded w-full"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">Intensity</label>
                      <select
                        value={item.intensity}
                        onChange={(e) => onUpdateItem(index, { intensity: e.target.value as IntensityLevel })}
                        className="px-2 py-1.5 text-sm border rounded w-full"
                      >
                        {INTENSITY_LEVEL_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddAsana}
            className="w-full"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Asana
          </Button>
        </div>
      )}
    </div>
  );
}

// Asana Picker Modal with multi-select support
interface AsanaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (asana: Asana) => void;
  onRemove: (asanaId: string) => void;
  asanas: Asana[];
  sectionType: SectionType;
  selectedAsanaIds: string[]; // IDs of asanas already in this section
}

function AsanaPickerModal({ isOpen, onClose, onSelect, onRemove, asanas, sectionType, selectedAsanaIds }: AsanaPickerModalProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('');
  const [newlySelected, setNewlySelected] = useState<Set<string>>(new Set());

  // Suggest appropriate asana types for each section
  const getSuggestedType = () => {
    switch (sectionType) {
      case 'SURYA_NAMASKARA':
        return 'surya_namaskar';
      case 'PRANAYAMA':
        return 'pranayama';
      case 'SHAVASANA':
        return 'relaxation';
      default:
        return '';
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTypeFilter(getSuggestedType());
      setNewlySelected(new Set()); // Reset newly selected when modal opens
    }
  }, [isOpen, sectionType]);

  const filteredAsanas = useMemo(() => {
    return asanas.filter(asana => {
      const matchesSearch = !search ||
        asana.name.toLowerCase().includes(search.toLowerCase()) ||
        asana.sanskritName?.toLowerCase().includes(search.toLowerCase());
      const matchesType = !typeFilter || asana.type === typeFilter;
      const matchesDifficulty = !difficultyFilter || asana.difficulty === difficultyFilter;
      return matchesSearch && matchesType && matchesDifficulty;
    });
  }, [asanas, search, typeFilter, difficultyFilter]);

  const handleToggleSelect = (asana: Asana, isAlreadyInSection: boolean) => {
    const isInNewlySelected = newlySelected.has(asana.id);

    if (isAlreadyInSection || isInNewlySelected) {
      // Remove from section and clear from newlySelected
      setNewlySelected(prev => {
        const next = new Set(prev);
        next.delete(asana.id);
        return next;
      });
      onRemove(asana.id);
    } else {
      // Add to selection
      setNewlySelected(prev => {
        const next = new Set(prev);
        next.add(asana.id);
        return next;
      });
      onSelect(asana);
    }
  };

  const handleDone = () => {
    setNewlySelected(new Set());
    onClose();
  };

  if (!isOpen) return null;

  // Count total selected in this session (already in section + newly selected)
  const totalSelected = selectedAsanaIds.length + newlySelected.size;

  return (
    <Modal isOpen={isOpen} onClose={handleDone} title={`Add Asanas to ${SECTION_LABELS[sectionType]}`} size="lg">
      <div className="space-y-4">
        {/* Selection Summary */}
        {totalSelected > 0 && (
          <div className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg text-sm">
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-indigo-700">
              {totalSelected} asana{totalSelected !== 1 ? 's' : ''} in section
              {newlySelected.size > 0 && (
                <span className="ml-1 text-indigo-500">
                  (+{newlySelected.size} just added)
                </span>
              )}
            </span>
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            placeholder="Search asanas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: '', label: 'All Types' },
              ...ASANA_TYPE_OPTIONS.map(opt => ({ value: opt.value, label: opt.label })),
            ]}
          />
          <Select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            options={[
              { value: '', label: 'All Levels' },
              ...DIFFICULTY_LEVEL_OPTIONS,
            ]}
          />
        </div>

        {/* Asana grid */}
        <div className="max-h-80 overflow-y-auto">
          {filteredAsanas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No asanas found matching your filters
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredAsanas.map(asana => {
                const isAlreadyInSection = selectedAsanaIds.includes(asana.id);
                const isNewlySelected = newlySelected.has(asana.id);
                const isSelected = isAlreadyInSection || isNewlySelected;

                return (
                  <button
                    key={asana.id}
                    type="button"
                    onClick={() => handleToggleSelect(asana, isAlreadyInSection)}
                    className={`text-left p-3 border rounded-lg transition-colors relative ${
                      isSelected
                        ? 'bg-indigo-100 border-indigo-400 ring-2 ring-indigo-400'
                        : 'hover:bg-indigo-50 hover:border-indigo-300'
                    }`}
                  >
                    {/* Selection indicator - shows check or X based on hover */}
                    {isSelected && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center bg-indigo-600 group">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                    <div className="font-medium text-gray-900 pr-6">{asana.name}</div>
                    {asana.sanskritName && (
                      <div className="text-sm text-gray-500 italic">{asana.sanskritName}</div>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Badge variant={asana.difficulty === 'beginner' ? 'green' : asana.difficulty === 'intermediate' ? 'yellow' : 'red'}>
                        {asana.difficulty}
                      </Badge>
                      <Badge variant="gray">{asana.type}</Badge>
                    </div>
                    {isSelected && (
                      <div className="text-xs text-indigo-600 mt-1">Tap to remove</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-2 border-t">
          <Button variant="primary" onClick={handleDone}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// Summary Sidebar
interface PlanSummaryProps {
  sections: SessionPlanSection[];
  asanas: Asana[];
}

function PlanSummary({ sections, asanas }: PlanSummaryProps) {
  // Calculate totals
  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);
  const totalDuration = sections.reduce(
    (sum, s) => sum + s.items.reduce((iSum, item) => iSum + (item.durationMinutes || 0), 0),
    0
  );

  // Calculate body areas coverage
  const bodyAreaCounts: Record<string, { primary: number; secondary: number }> = {};
  sections.forEach(section => {
    section.items.forEach(item => {
      const asana = asanas.find(a => a.id === item.asanaId);
      if (asana) {
        asana.primaryBodyAreas.forEach(area => {
          if (!bodyAreaCounts[area]) bodyAreaCounts[area] = { primary: 0, secondary: 0 };
          bodyAreaCounts[area].primary++;
        });
        asana.secondaryBodyAreas.forEach(area => {
          if (!bodyAreaCounts[area]) bodyAreaCounts[area] = { primary: 0, secondary: 0 };
          bodyAreaCounts[area].secondary++;
        });
      }
    });
  });

  const sortedAreas = Object.entries(bodyAreaCounts)
    .map(([area, counts]) => ({ area: area as BodyArea, ...counts, total: counts.primary + counts.secondary }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Calculate benefits coverage
  const benefitCounts: Record<string, number> = {};
  sections.forEach(section => {
    section.items.forEach(item => {
      const asana = asanas.find(a => a.id === item.asanaId);
      if (asana) {
        asana.benefits.forEach(benefit => {
          benefitCounts[benefit] = (benefitCounts[benefit] || 0) + 1;
        });
      }
    });
  });

  const topBenefits = Object.entries(benefitCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([benefit]) => benefit);

  return (
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

      {/* Per-section breakdown */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-700">Sections</div>
        {sections.map(section => (
          <div key={section.sectionType} className="flex justify-between text-sm">
            <span className="text-gray-600">{SECTION_LABELS[section.sectionType]}</span>
            <span className="font-medium">{section.items.length}</span>
          </div>
        ))}
      </div>

      {/* Body areas */}
      {sortedAreas.length > 0 && (
        <div className="space-y-2 border-t pt-4">
          <div className="text-sm font-medium text-gray-700">Focus Areas</div>
          <div className="flex flex-wrap gap-1">
            {sortedAreas.map(({ area, total }) => (
              <span
                key={area}
                className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded"
              >
                {BODY_AREA_LABELS[area]} ({total})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Benefits */}
      {topBenefits.length > 0 && (
        <div className="space-y-2 border-t pt-4">
          <div className="text-sm font-medium text-gray-700">Key Benefits</div>
          <ul className="text-sm text-gray-600 space-y-1">
            {topBenefits.map(benefit => (
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
    </Card>
  );
}

// Main Form Page
export function SessionPlanFormPage() {
  const { isLoading } = useFreshData(['session-plans', 'asanas']);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    level: 'beginner' as DifficultyLevel,
    isActive: true,
  });

  // Initialize sections with fixed 5-section structure
  const [sections, setSections] = useState<SessionPlanSection[]>(() =>
    SECTION_TYPES.map(sectionType => ({
      sectionType,
      order: SECTION_ORDER[sectionType],
      items: [],
    }))
  );

  const [expandedSections, setExpandedSections] = useState<Set<SectionType>>(
    new Set(['WARM_UP', 'ASANA_SEQUENCE'])
  );

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Asana picker state
  const [pickerSection, setPickerSection] = useState<SectionType | null>(null);

  // Get all asanas
  const allAsanas = useMemo(() => {
    if (isLoading) return [];
    return asanaService.getActive();
  }, [isLoading]);

  // Load existing plan for editing
  useEffect(() => {
    if (isEditing && id && !isLoading) {
      const plan = sessionPlanService.getById(id);
      if (plan) {
        setFormData({
          name: plan.name,
          description: plan.description || '',
          level: plan.level,
          isActive: plan.isActive,
        });
        // Merge existing sections with the fixed structure
        const mergedSections = SECTION_TYPES.map(sectionType => {
          const existing = plan.sections.find(s => s.sectionType === sectionType);
          return existing || {
            sectionType,
            order: SECTION_ORDER[sectionType],
            items: [],
          };
        });
        setSections(mergedSections);
      } else {
        setError('Session plan not found');
      }
    }
  }, [id, isEditing, isLoading]);

  if (isLoading) {
    return <PageLoading />;
  }

  const toggleSection = (sectionType: SectionType) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionType)) {
        next.delete(sectionType);
      } else {
        next.add(sectionType);
      }
      return next;
    });
  };

  const handleAddAsana = (sectionType: SectionType, asana: Asana) => {
    setSections(prev =>
      prev.map(section => {
        if (section.sectionType !== sectionType) return section;
        // Prevent duplicate - check if asana already exists in this section
        if (section.items.some(item => item.asanaId === asana.id)) {
          return section;
        }
        const newItem: SectionItem = {
          asanaId: asana.id,
          order: section.items.length + 1,
          intensity: 'medium',
        };
        return {
          ...section,
          items: [...section.items, newItem],
        };
      })
    );
  };

  const handleRemoveAsana = (sectionType: SectionType, asanaId: string) => {
    setSections(prev =>
      prev.map(section => {
        if (section.sectionType !== sectionType) return section;
        const newItems = section.items.filter(item => item.asanaId !== asanaId);
        // Reorder remaining items
        return {
          ...section,
          items: newItems.map((item, i) => ({ ...item, order: i + 1 })),
        };
      })
    );
  };

  const handleRemoveItem = (sectionType: SectionType, index: number) => {
    setSections(prev =>
      prev.map(section => {
        if (section.sectionType !== sectionType) return section;
        const newItems = section.items.filter((_, i) => i !== index);
        // Reorder
        return {
          ...section,
          items: newItems.map((item, i) => ({ ...item, order: i + 1 })),
        };
      })
    );
  };

  const handleUpdateItem = (sectionType: SectionType, index: number, updates: Partial<SectionItem>) => {
    setSections(prev =>
      prev.map(section => {
        if (section.sectionType !== sectionType) return section;
        return {
          ...section,
          items: section.items.map((item, i) =>
            i === index ? { ...item, ...updates } : item
          ),
        };
      })
    );
  };

  const handleMoveItem = (sectionType: SectionType, fromIndex: number, toIndex: number) => {
    if (toIndex < 0) return;
    setSections(prev =>
      prev.map(section => {
        if (section.sectionType !== sectionType) return section;
        if (toIndex >= section.items.length) return section;

        const newItems = [...section.items];
        const [moved] = newItems.splice(fromIndex, 1);
        newItems.splice(toIndex, 0, moved);
        // Reorder
        return {
          ...section,
          items: newItems.map((item, i) => ({ ...item, order: i + 1 })),
        };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      // Validation
      if (!formData.name.trim()) {
        throw new Error('Plan name is required');
      }

      const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);
      if (totalItems === 0) {
        throw new Error('Please add at least one asana to the plan');
      }

      const planData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        level: formData.level,
        sections,
        isActive: formData.isActive,
      };

      if (isEditing && id) {
        sessionPlanService.update(id, planData);
      } else {
        sessionPlanService.create(planData);
      }

      navigate('/admin/session-plans');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save session plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Session Plan' : 'Create Session Plan'}
          </h1>
          <p className="text-gray-600">
            {isEditing ? 'Update session plan template' : 'Build a reusable yoga session template'}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin/session-plans')}>
          Cancel
        </Button>
      </div>

      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError('')}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content - 2 columns on large screens */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card className="p-4 space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Plan Name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Beginner Morning Flow"
                  required
                />
                <Select
                  label="Difficulty Level"
                  value={formData.level}
                  onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value as DifficultyLevel }))}
                  options={[...DIFFICULTY_LEVEL_OPTIONS]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description / Notes
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="General notes or guidance for this session (e.g., 'Good for monsoon', 'Focus on stress relief')..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Plan is active (can be used for sessions)
                </span>
              </label>
            </Card>

            {/* Sections */}
            <Card className="p-4 space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Session Sections</h3>
              <p className="text-sm text-gray-600">
                Build your session by adding asanas to each section. Sessions follow a fixed 5-section structure.
              </p>

              <div className="space-y-3">
                {sections.map(section => (
                  <SectionBuilder
                    key={section.sectionType}
                    section={section}
                    asanas={allAsanas}
                    onAddAsana={() => setPickerSection(section.sectionType)}
                    onRemoveItem={(index) => handleRemoveItem(section.sectionType, index)}
                    onUpdateItem={(index, updates) => handleUpdateItem(section.sectionType, index, updates)}
                    onMoveItem={(from, to) => handleMoveItem(section.sectionType, from, to)}
                    isExpanded={expandedSections.has(section.sectionType)}
                    onToggle={() => toggleSection(section.sectionType)}
                  />
                ))}
              </div>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => navigate('/admin/session-plans')}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : isEditing ? 'Update Plan' : 'Create Plan'}
              </Button>
            </div>
          </div>

          {/* Summary Sidebar - 1 column on large screens */}
          <div className="lg:col-span-1">
            <PlanSummary sections={sections} asanas={allAsanas} />
          </div>
        </div>
      </form>

      {/* Asana Picker Modal */}
      <AsanaPickerModal
        isOpen={pickerSection !== null}
        onClose={() => setPickerSection(null)}
        onSelect={(asana) => {
          if (pickerSection) {
            handleAddAsana(pickerSection, asana);
          }
        }}
        onRemove={(asanaId) => {
          if (pickerSection) {
            handleRemoveAsana(pickerSection, asanaId);
          }
        }}
        asanas={allAsanas}
        sectionType={pickerSection || 'ASANA_SEQUENCE'}
        selectedAsanaIds={
          pickerSection
            ? sections.find(s => s.sectionType === pickerSection)?.items.map(i => i.asanaId) || []
            : []
        }
      />
    </div>
  );
}
