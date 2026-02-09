import { useState } from 'react';
import { asanaService } from '../../services';
import { SECTION_LABELS } from '../../types';
import type { SessionPlanSection, SectionType } from '../../types';

interface SectionAccordionProps {
  section: SessionPlanSection;
  defaultExpanded?: boolean;
  compact?: boolean; // Mobile-friendly compact mode
}

export function SectionAccordion({ section, defaultExpanded = false, compact = false }: SectionAccordionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const itemCount = section.items.length;

  if (itemCount === 0) {
    return null; // Don't show empty sections
  }

  const toggle = () => setExpanded(!expanded);

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      {/* Section header - clickable to expand/collapse */}
      <button
        onClick={toggle}
        className="w-full flex items-center gap-2 py-2 text-left hover:bg-gray-50 transition-colors"
      >
        {/* Expand/collapse indicator */}
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>

        {/* Section name */}
        <span className="font-medium text-gray-700 text-sm">
          {SECTION_LABELS[section.sectionType]}
        </span>

        {/* Item count badge */}
        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
          {itemCount}
        </span>
      </button>

      {/* Expanded content - asana list */}
      {expanded && (
        <div className={`pb-2 ${compact ? 'pl-4' : 'pl-6'}`}>
          {section.items
            .sort((a, b) => a.order - b.order)
            .map((item, idx) => {
              const asana = asanaService.getById(item.asanaId);
              const asanaName = asana?.name || 'Unknown Asana';

              // Format duration/reps
              let durationText = '';
              if (item.durationMinutes) {
                durationText = `${item.durationMinutes} min`;
              } else if (item.reps) {
                durationText = `${item.reps} reps`;
              }

              return (
                <div
                  key={`${item.asanaId}-${idx}`}
                  className={`flex items-start gap-2 ${compact ? 'py-1' : 'py-1.5'} text-sm`}
                >
                  <span className="text-gray-400 mt-0.5">-</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-800">{asanaName}</span>
                    {item.variation && (
                      <span className="text-gray-500 text-xs ml-1">({item.variation})</span>
                    )}
                    {durationText && (
                      <span className="text-indigo-600 text-xs ml-2">{durationText}</span>
                    )}
                    {item.notes && (
                      <p className="text-gray-500 text-xs mt-0.5 truncate">{item.notes}</p>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

// Compact section chips for collapsed view (mobile)
interface SectionChipsProps {
  sections: SessionPlanSection[];
  expandedSections: Set<SectionType>;
  onToggleSection: (sectionType: SectionType) => void;
}

export function SectionChips({ sections, expandedSections, onToggleSection }: SectionChipsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {sections
        .filter(s => s.items.length > 0)
        .sort((a, b) => a.order - b.order)
        .map(section => {
          const isExpanded = expandedSections.has(section.sectionType);
          return (
            <button
              key={section.sectionType}
              onClick={() => onToggleSection(section.sectionType)}
              className={`
                inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
                transition-colors
                ${isExpanded
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              <svg
                className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {getSectionShortLabel(section.sectionType)}
              <span className="opacity-70">({section.items.length})</span>
            </button>
          );
        })}
    </div>
  );
}

// Short labels for chips
function getSectionShortLabel(sectionType: SectionType): string {
  const shortLabels: Record<SectionType, string> = {
    WARM_UP: 'Warm Up',
    SURYA_NAMASKARA: 'Surya',
    ASANA_SEQUENCE: 'Asanas',
    PRANAYAMA: 'Pranayama',
    SHAVASANA: 'Shavasana'
  };
  return shortLabels[sectionType];
}
