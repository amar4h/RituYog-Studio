/**
 * Session Plan Image Generator
 * Renders a compact, branded session plan as a JPG image for download/sharing.
 * Uses html2canvas to capture an off-screen DOM element.
 *
 * NOTE: html2canvas clips text descenders (g, p, y) when `overflow: hidden` is
 * used on text containers. To avoid this, we NEVER use `overflow: hidden` on any
 * element that contains text. Instead, we truncate text in JavaScript.
 */

import html2canvas from 'html2canvas';
import type { SectionType } from '../types';

// ============================================
// TYPES
// ============================================

export interface SessionPlanImageItem {
  name: string;
  sanskritName?: string;
  variation?: string;
  durationMinutes?: number;
  reps?: number;
  breathingCue?: 'inhale' | 'exhale' | 'hold';
  isVinyasa: boolean;
  childSteps?: string[];
}

export interface SessionPlanImageSection {
  sectionType: SectionType;
  label: string;
  items: SessionPlanImageItem[];
}

export interface SessionPlanImageData {
  planName: string;
  planLevel: string;
  planDescription?: string;
  sections: SessionPlanImageSection[];
  // Branding
  studioName: string;
  logoData?: string; // base64 image
  // Optional context (for RecordExecutionPage)
  slotTime?: string;
  date?: string;
}

// ============================================
// CONSTANTS
// ============================================

const BRAND_COLOR = '#4F46E5'; // indigo-600
const BRAND_LIGHT = '#EEF2FF'; // indigo-50
const CANVAS_WIDTH = 375;

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  beginner: { bg: '#D1FAE5', text: '#065F46' },
  intermediate: { bg: '#FEF3C7', text: '#92400E' },
  advanced: { bg: '#FEE2E2', text: '#991B1B' },
};

// ============================================
// SIZE TIERS
// ============================================

interface SizeTier {
  titleSize: number;
  sectionHeaderSize: number;
  itemSize: number;
  itemPadding: number;
  sectionGap: number;
  showSanskrit: boolean;
  childStepMaxChars: number;
  titleMaxChars: number;
  descMaxChars: number;
}

function getSizeTier(totalItems: number): SizeTier {
  if (totalItems <= 8) {
    return { titleSize: 13, sectionHeaderSize: 10, itemSize: 10, itemPadding: 4, sectionGap: 6, showSanskrit: true, childStepMaxChars: 80, titleMaxChars: 40, descMaxChars: 70 };
  }
  if (totalItems <= 15) {
    return { titleSize: 12, sectionHeaderSize: 9, itemSize: 9, itemPadding: 3, sectionGap: 4, showSanskrit: true, childStepMaxChars: 65, titleMaxChars: 45, descMaxChars: 80 };
  }
  if (totalItems <= 22) {
    return { titleSize: 11, sectionHeaderSize: 8, itemSize: 8, itemPadding: 2, sectionGap: 3, showSanskrit: true, childStepMaxChars: 50, titleMaxChars: 50, descMaxChars: 90 };
  }
  return { titleSize: 10, sectionHeaderSize: 7, itemSize: 7, itemPadding: 1, sectionGap: 2, showSanskrit: false, childStepMaxChars: 40, titleMaxChars: 55, descMaxChars: 100 };
}

// ============================================
// DOM HELPERS
// ============================================

function el(tag: string, styles: Partial<CSSStyleDeclaration> = {}, text?: string): HTMLElement {
  const elem = document.createElement(tag);
  Object.assign(elem.style, styles);
  if (text) elem.textContent = text;
  return elem;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_').substring(0, 50);
}

/** Truncate text to maxChars with ellipsis */
function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars - 1) + '…';
}

// ============================================
// LAYOUT BUILDER
// ============================================

function buildCompactLayout(container: HTMLElement, data: SessionPlanImageData): void {
  const totalItems = data.sections.reduce((sum, s) => sum + s.items.length, 0);
  const tier = getSizeTier(totalItems);

  // --- Branded Header Strip ---
  const header = el('div', {
    backgroundColor: BRAND_COLOR,
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '-12px -12px 8px -12px',
  });

  if (data.logoData) {
    const logo = document.createElement('img');
    logo.src = data.logoData;
    Object.assign(logo.style, { width: '24px', height: '24px', borderRadius: '4px', objectFit: 'contain', backgroundColor: '#ffffff' });
    header.appendChild(logo);
  }

  const studioName = el('div', {
    color: '#ffffff',
    fontSize: '11px',
    lineHeight: '1.6',
    fontWeight: '600',
    flex: '1',
    whiteSpace: 'nowrap',
  }, truncate(data.studioName, 30));
  header.appendChild(studioName);

  // Level badge — extra bottom padding so html2canvas clips padding, not text
  const levelColors = LEVEL_COLORS[data.planLevel] || LEVEL_COLORS.beginner;
  const levelBadge = el('div', {
    fontSize: '9px',
    fontWeight: '600',
    padding: '3px 6px',
    borderRadius: '4px',
    backgroundColor: levelColors.bg,
    color: levelColors.text,
    whiteSpace: 'nowrap',
    lineHeight: '1.4',
    display: 'inline-flex',
    alignItems: 'center',
  }, data.planLevel.charAt(0).toUpperCase() + data.planLevel.slice(1));
  header.appendChild(levelBadge);

  container.appendChild(header);

  // --- Plan Name (JS-truncated, no overflow:hidden) ---
  const planTitle = el('div', {
    fontSize: `${tier.titleSize}px`,
    lineHeight: '1.6',
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: '2px',
    whiteSpace: 'nowrap',
  }, truncate(data.planName, tier.titleMaxChars));
  container.appendChild(planTitle);

  // --- Description (JS-truncated, no overflow:hidden) ---
  if (data.planDescription && totalItems < 20) {
    const desc = el('div', {
      fontSize: '8px',
      lineHeight: '1.6',
      color: '#6B7280',
      fontStyle: 'italic',
      marginBottom: '4px',
      whiteSpace: 'nowrap',
    }, `— ${truncate(data.planDescription, tier.descMaxChars)}`);
    container.appendChild(desc);
  }

  // --- Watermark (logo behind content) ---
  if (data.logoData) {
    const watermark = document.createElement('img');
    watermark.src = data.logoData;
    Object.assign(watermark.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '150px',
      height: '150px',
      opacity: '0.06',
      objectFit: 'contain',
      pointerEvents: 'none',
      zIndex: '0',
    });
    container.appendChild(watermark);
  }

  // --- Sections ---
  const sectionsWrap = el('div', { position: 'relative', zIndex: '1' });

  data.sections.forEach((section) => {
    if (section.items.length === 0) return;

    const sectionDiv = el('div', { marginBottom: `${tier.sectionGap}px` });

    // Section header with left border
    const sectionHeader = el('div', {
      borderLeft: `3px solid ${BRAND_COLOR}`,
      backgroundColor: BRAND_LIGHT,
      padding: '3px 6px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1px',
    });

    const sectionLabel = el('span', {
      fontSize: `${tier.sectionHeaderSize}px`,
      lineHeight: '1.6',
      fontWeight: '600',
      color: '#1E1B4B',
    }, section.label);
    sectionHeader.appendChild(sectionLabel);

    const itemCount = el('span', {
      fontSize: `${tier.sectionHeaderSize - 1}px`,
      lineHeight: '1.6',
      color: '#6366F1',
    }, `(${section.items.length})`);
    sectionHeader.appendChild(itemCount);

    sectionDiv.appendChild(sectionHeader);

    // Items
    const rowPad = Math.max(tier.itemPadding, 3);
    section.items.forEach((item, idx) => {
      const itemDiv = el('div', {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: `${rowPad}px 4px ${rowPad}px 8px`,
        lineHeight: '1',
        borderBottom: idx < section.items.length - 1 ? '1px solid #F3F4F6' : 'none',
      });

      // Number
      const num = el('span', {
        fontSize: `${tier.itemSize - 1}px`,
        lineHeight: '1',
        color: '#4F46E5',
        fontWeight: '600',
        minWidth: '14px',
        flexShrink: '0',
      }, `${idx + 1}.`);
      itemDiv.appendChild(num);

      // Name area — NO overflow:hidden to prevent descender clipping
      const nameArea = el('div', {
        flex: '1',
        fontSize: `${tier.itemSize}px`,
        lineHeight: '1',
        color: '#1F2937',
        minWidth: '0',
      });

      // In Surya Namaskara section, show only the name (no child steps)
      const showChildSteps = item.isVinyasa && section.sectionType !== 'SURYA_NAMASKARA';

      if (item.isVinyasa) {
        const nameSpan = el('span', { fontWeight: '500', color: '#DB2777' }, item.name);
        nameArea.appendChild(nameSpan);

        if (showChildSteps && item.childSteps && item.childSteps.length > 0) {
          const flow = item.childSteps.join(' → ');
          const truncated = flow.length > tier.childStepMaxChars
            ? flow.substring(0, tier.childStepMaxChars) + '...'
            : flow;
          const flowSpan = el('span', {
            fontSize: `${tier.itemSize - 1}px`,
            color: '#6B7280',
            marginLeft: '3px',
          }, `: ${truncated}`);
          nameArea.appendChild(flowSpan);
        }
      } else {
        const nameSpan = el('span', { fontWeight: '500' }, item.name);
        nameArea.appendChild(nameSpan);

        if (tier.showSanskrit && item.sanskritName) {
          const sanskrit = el('span', {
            fontSize: `${tier.itemSize}px`,
            color: '#6B7280',
            fontStyle: 'italic',
            marginLeft: '3px',
          }, `(${item.sanskritName})`);
          nameArea.appendChild(sanskrit);
        }

        if (item.variation) {
          const variation = el('span', {
            fontSize: `${tier.itemSize - 1}px`,
            color: '#7C3AED',
            marginLeft: '3px',
          }, `• ${item.variation}`);
          nameArea.appendChild(variation);
        }
      }

      itemDiv.appendChild(nameArea);

      // Breathing cue badge
      if (item.breathingCue) {
        const cueColors: Record<string, { bg: string; text: string }> = {
          inhale: { bg: '#DBEAFE', text: '#2563EB' },
          exhale: { bg: '#F3E8FF', text: '#7C3AED' },
          hold: { bg: '#FFEDD5', text: '#EA580C' },
        };
        const cueAbbrev: Record<string, string> = { inhale: 'In', exhale: 'Ex', hold: 'Ho' };
        const colors = cueColors[item.breathingCue] || cueColors.inhale;
        const cueBadge = el('span', {
          fontSize: `${tier.itemSize - 2}px`,
          fontWeight: '600',
          padding: '2px 3px',
          borderRadius: '2px',
          backgroundColor: colors.bg,
          color: colors.text,
          whiteSpace: 'nowrap',
          flexShrink: '0',
          lineHeight: '1',
        }, cueAbbrev[item.breathingCue] || '');
        itemDiv.appendChild(cueBadge);
      }

      // Duration/Reps
      const durText = [
        item.durationMinutes ? `${item.durationMinutes}m` : '',
        item.reps ? `${item.reps}x` : '',
      ].filter(Boolean).join(' ');

      if (durText) {
        const dur = el('span', {
          fontSize: `${tier.itemSize - 1}px`,
          lineHeight: '1',
          color: '#4F46E5',
          fontWeight: '500',
          whiteSpace: 'nowrap',
          flexShrink: '0',
        }, durText);
        itemDiv.appendChild(dur);
      }

      sectionDiv.appendChild(itemDiv);
    });

    sectionsWrap.appendChild(sectionDiv);
  });

  container.appendChild(sectionsWrap);

  // --- Footer (optional context) ---
  if (data.date || data.slotTime) {
    const footer = el('div', {
      fontSize: '8px',
      lineHeight: '1.6',
      color: '#9CA3AF',
      textAlign: 'center',
      marginTop: '6px',
      borderTop: '1px solid #E5E7EB',
      paddingTop: '4px',
    }, [data.date, data.slotTime].filter(Boolean).join(' · '));
    container.appendChild(footer);
  }
}

// ============================================
// MAIN EXPORT
// ============================================

export async function downloadSessionPlanAsJPG(data: SessionPlanImageData): Promise<void> {
  // Create off-screen container — no overflow:hidden so text descenders render fully
  const container = el('div', {
    position: 'fixed',
    left: '-9999px',
    top: '0',
    width: `${CANVAS_WIDTH}px`,
    backgroundColor: '#FFFFFF',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    lineHeight: '1.6',
    padding: '12px',
    boxSizing: 'border-box',
  });

  buildCompactLayout(container, data);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      width: CANVAS_WIDTH,
      backgroundColor: '#FFFFFF',
      useCORS: false,
      logging: false,
    });

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Failed to create image'))),
        'image/jpeg',
        0.92
      );
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sanitizeFilename(data.planName)}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } finally {
    document.body.removeChild(container);
  }
}
