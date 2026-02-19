/**
 * Member & Batch Session Report Image Generator
 * Renders professional infographic JPGs using Canvas 2D API.
 *
 * Two report types:
 * 1. Per-member: personalized yoga journey report
 * 2. Per-batch: aggregate slot summary
 */

import type { ReportPeriod } from './reportPeriods';

// ============================================
// TYPES
// ============================================

export interface MemberReportData {
  memberName: string;
  slotDisplayName: string;
  sessionsAttended: number;
  totalWorkingDays: number;
  attendanceRate: number;
  uniqueAsanasCount: number;
  topAsanas: Array<{ name: string; count: number }>;
  bodyAreas: Array<{ area: string; label: string; percentage: number }>;
  topBenefits: Array<{ benefit: string; count: number }>;
  missedSessions: number;
  missedBodyAreas: Array<{ area: string; label: string; percentage: number }>;
  missedBenefits: Array<{ benefit: string; count: number }>;
  studioName: string;
  logoData?: string;
}

export interface BatchReportData {
  slotDisplayName: string;
  totalSessions: number;
  uniqueAsanasCount: number;
  totalBenefits: number;
  avgAttendees: number;
  topAsanas: Array<{ name: string; count: number }>;
  bodyAreas: Array<{ area: string; label: string; percentage: number }>;
  topBenefits: Array<{ benefit: string; count: number }>;
  studioName: string;
  logoData?: string;
}

// ============================================
// CONSTANTS
// ============================================

const BRAND = '#4F46E5';
const BRAND_LIGHT = '#E0E7FF';
const BRAND_DARK = '#1E1B4B';
const GREEN = '#059669';
const AMBER = '#D97706';
const RED = '#DC2626';
const W = 360;
const SCALE = 3;
const PAD = 14;
const FONT = 'Segoe UI, Roboto, Helvetica, Arial, sans-serif';
const HEADER_H = 40;

// ============================================
// HELPERS
// ============================================

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_').substring(0, 50);
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.substring(0, max - 1) + '…';
}

function setFont(ctx: CanvasRenderingContext2D, size: number, weight = 'normal', italic = false): void {
  ctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${FONT}`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) return reject(new Error('Failed to create image'));
        resolve(b);
      },
      'image/jpeg',
      0.92
    );
  });
}

function downloadBlob(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return canvasToBlob(canvas).then((b) => {
    const url = URL.createObjectURL(b);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
}

// ============================================
// DRAWING HELPERS
// ============================================

function drawHeader(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement | null,
  studioName: string,
  rightText: string,
) {
  ctx.fillStyle = BRAND;
  ctx.fillRect(0, 0, W, HEADER_H);
  const hcy = HEADER_H / 2;
  let hx = PAD;

  if (logo) {
    const ls = 24;
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, hx, hcy - ls / 2, ls, ls, 3);
    ctx.fill();
    ctx.drawImage(logo, hx, hcy - ls / 2, ls, ls);
    hx += ls + 6;
  }

  ctx.fillStyle = '#ffffff';
  setFont(ctx, 14, '600');
  ctx.textBaseline = 'middle';
  ctx.fillText(truncate(studioName, 20), hx, hcy);

  // Right badge
  setFont(ctx, 10, '600');
  const rw = ctx.measureText(rightText).width + 10;
  const rh = 18;
  const rx = W - PAD - rw;
  const ry = hcy - rh / 2;
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  roundRect(ctx, rx, ry, rw, rh, 3);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(rightText, rx + 5, hcy);
}

function drawWatermark(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement | null,
  totalH: number,
) {
  if (!logo) return;
  ctx.save();
  ctx.globalAlpha = 0.12;
  const ws = 200;
  ctx.drawImage(logo, W / 2 - ws / 2, totalH / 2 - ws / 2, ws, ws);
  ctx.restore();
}

function drawStatTile(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  value: string, label: string, bgColor: string,
): void {
  ctx.fillStyle = bgColor;
  roundRect(ctx, x, y, w, h, 6);
  ctx.fill();

  const cx = x + w / 2;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  // Support two-line labels with \n
  const lines = label.split('\n');
  if (lines.length > 1) {
    setFont(ctx, 18, 'bold');
    ctx.fillText(value, cx, y + h * 0.32);
    setFont(ctx, 8, '500');
    ctx.fillText(lines[0], cx, y + h * 0.62);
    ctx.fillText(lines[1], cx, y + h * 0.78);
  } else {
    setFont(ctx, 20, 'bold');
    ctx.fillText(value, cx, y + h * 0.38);
    setFont(ctx, 9, '500');
    ctx.fillText(label, cx, y + h * 0.72);
  }
  ctx.textAlign = 'left';
}

function drawSectionHeader(
  ctx: CanvasRenderingContext2D,
  y: number, label: string, accentColor = BRAND, bgColor = BRAND_LIGHT,
): number {
  const h = 22;
  ctx.fillStyle = bgColor;
  ctx.fillRect(PAD + 3, y, W - PAD * 2 - 3, h);
  ctx.fillStyle = accentColor;
  ctx.fillRect(PAD, y, 3, h);
  ctx.fillStyle = BRAND_DARK;
  setFont(ctx, 12, '600');
  ctx.textBaseline = 'middle';
  ctx.fillText(label, PAD + 8, y + h / 2);
  return y + h + 4;
}

function drawBadge(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  text: string,
  bgColor: string, textColor: string,
): number {
  setFont(ctx, 10, '500');
  const tw = ctx.measureText(text).width;
  const bw = tw + 10;
  const bh = 18;
  ctx.fillStyle = bgColor;
  roundRect(ctx, x, y, bw, bh, 4);
  ctx.fill();
  ctx.fillStyle = textColor;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 5, y + bh / 2);
  return bw;
}

function drawBadgeRow(
  ctx: CanvasRenderingContext2D,
  y: number,
  items: string[],
  bgColor: string, textColor: string,
): number {
  let bx = PAD;
  let by = y;
  const maxX = W - PAD;

  for (const text of items) {
    setFont(ctx, 10, '500');
    const tw = ctx.measureText(text).width + 10;
    if (bx + tw > maxX && bx > PAD) {
      bx = PAD;
      by += 22;
    }
    drawBadge(ctx, bx, by, text, bgColor, textColor);
    bx += tw + 4;
  }
  return by + 22;
}

function drawHorizontalBar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, maxW: number, h: number,
  percentage: number, barColor: string,
): void {
  // Track (lighter shade of section header blue #E0E7FF)
  ctx.fillStyle = '#EEF2FF';
  roundRect(ctx, x, y, maxW, h, 3);
  ctx.fill();
  // Bar
  if (percentage > 0) {
    const barW = Math.max(4, (percentage / 100) * maxW);
    ctx.fillStyle = barColor;
    roundRect(ctx, x, y, barW, h, 3);
    ctx.fill();
  }
}

// ============================================
// MEMBER REPORT CANVAS
// ============================================

function calcMemberHeight(data: MemberReportData): number {
  let h = HEADER_H + 6; // header
  h += 28; // name
  h += 16; // slot subtitle
  h += 6; // gap
  h += 52; // stat tiles
  h += 10; // gap

  // Asanas section
  if (data.topAsanas.length > 0) {
    h += 26; // header
    h += Math.ceil(data.topAsanas.length / 2) * 16; // 2-col list
    h += 6;
  }

  // Body areas section
  if (data.bodyAreas.length > 0) {
    h += 26; // header
    h += data.bodyAreas.length * 18; // bars
    h += 6;
  }

  // Benefits section
  if (data.topBenefits.length > 0) {
    h += 26; // header
    h += Math.ceil(data.topBenefits.length / 3) * 22; // badge rows
    h += 6;
  }

  // Missed section
  if (data.missedSessions > 0) {
    h += 26; // header
    h += 16; // missed count text
    if (data.missedBodyAreas.length > 0) h += 16;
    if (data.missedBenefits.length > 0) {
      h += Math.ceil(data.missedBenefits.length / 3) * 22;
    }
    h += 6;
  }

  h += 20; // footer
  return Math.max(h, Math.round(W * 16 / 9)); // min 16:9
}

async function _renderMemberReport(
  data: MemberReportData,
  period: ReportPeriod,
): Promise<{ canvas: HTMLCanvasElement; filename: string }> {
  const logo = data.logoData ? await loadImage(data.logoData) : null;
  const totalH = calcMemberHeight(data);

  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = Math.ceil(totalH * SCALE);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, totalH);

  // Header
  drawHeader(ctx, logo, data.studioName, period.label);
  drawWatermark(ctx, logo, totalH);

  let y = HEADER_H + 6;

  // Member name
  ctx.fillStyle = '#111827';
  setFont(ctx, 20, 'bold');
  ctx.textBaseline = 'top';
  ctx.fillText(truncate(data.memberName, 28), PAD, y);
  y += 28;

  // Slot subtitle
  ctx.fillStyle = '#6B7280';
  setFont(ctx, 12);
  ctx.fillText(data.slotDisplayName, PAD, y);
  y += 16 + 6;

  // ─── STAT TILES ───
  const tileW = Math.floor((W - PAD * 2 - 8) / 3);
  const tileH = 50;
  const rateColor = data.attendanceRate >= 70 ? GREEN : AMBER;
  const missedColor = data.missedSessions > 0 ? RED : GREEN;

  drawStatTile(ctx, PAD, y, tileW, tileH,
    `${data.sessionsAttended}/${data.totalWorkingDays}`, 'Sessions', BRAND);
  drawStatTile(ctx, PAD + tileW + 4, y, tileW, tileH,
    `${data.attendanceRate}%`, 'Rate', rateColor);
  drawStatTile(ctx, PAD + (tileW + 4) * 2, y, tileW, tileH,
    `${data.missedSessions}`, 'Missed', missedColor);
  y += tileH + 10;

  // ─── PRACTICES PERFORMED ───
  if (data.topAsanas.length > 0) {
    y = drawSectionHeader(ctx, y, `PRACTICES PERFORMED (${data.uniqueAsanasCount})`);
    const colW = (W - PAD * 2) / 2;
    for (let i = 0; i < data.topAsanas.length; i++) {
      const a = data.topAsanas[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const ax = PAD + col * colW;
      const ay = y + row * 16;

      ctx.fillStyle = '#4F46E5';
      setFont(ctx, 10, '600');
      ctx.textBaseline = 'top';
      ctx.fillText(`${i + 1}.`, ax, ay);

      ctx.fillStyle = '#1F2937';
      setFont(ctx, 11, '500');
      ctx.fillText(truncate(a.name, 18), ax + 16, ay);

      ctx.fillStyle = '#6366F1';
      setFont(ctx, 9, '500');
      ctx.fillText(`${a.count}x`, ax + colW - 22, ay + 1);
    }
    y += Math.ceil(data.topAsanas.length / 2) * 16 + 6;
  }

  // ─── BODY AREAS WORKED ───
  if (data.bodyAreas.length > 0) {
    y = drawSectionHeader(ctx, y, 'BODY AREAS WORKED');
    const labelW = 80;
    const barX = PAD + labelW + 4;
    const barMaxW = W - PAD - barX - 30;
    for (const area of data.bodyAreas) {
      ctx.fillStyle = '#374151';
      setFont(ctx, 10, '500');
      ctx.textBaseline = 'top';
      ctx.fillText(truncate(area.label, 14), PAD, y + 1);
      drawHorizontalBar(ctx, barX, y + 1, barMaxW, 10, area.percentage, '#6366F1');
      ctx.fillStyle = '#6B7280';
      setFont(ctx, 9);
      ctx.fillText(`${area.percentage}%`, barX + barMaxW + 4, y + 1);
      y += 18;
    }
    y += 6;
  }

  // ─── BENEFITS GAINED ───
  if (data.topBenefits.length > 0) {
    y = drawSectionHeader(ctx, y, 'BENEFITS GAINED');
    y = drawBadgeRow(ctx, y, data.topBenefits.map(b => b.benefit), '#D1FAE5', '#065F46');
    y += 6;
  }

  // ─── WHAT YOU MISSED ───
  if (data.missedSessions > 0) {
    y = drawSectionHeader(ctx, y, 'WHAT YOU MISSED', '#D97706', '#FEF3C7');

    ctx.fillStyle = '#92400E';
    setFont(ctx, 11, '500');
    ctx.textBaseline = 'top';
    ctx.fillText(`${data.missedSessions} session${data.missedSessions !== 1 ? 's' : ''} missed`, PAD + 4, y);
    y += 16;

    if (data.missedBodyAreas.length > 0) {
      ctx.fillStyle = '#78350F';
      setFont(ctx, 10);
      const areas = data.missedBodyAreas.map(a => a.label).join(', ');
      ctx.fillText(`Areas: ${truncate(areas, 45)}`, PAD + 4, y);
      y += 16;
    }

    if (data.missedBenefits.length > 0) {
      y = drawBadgeRow(ctx, y, data.missedBenefits.map(b => b.benefit), '#FEF3C7', '#92400E');
    }
    y += 6;
  }

  // ─── FOOTER ───
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, y + 0.5);
  ctx.lineTo(W - PAD, y + 0.5);
  ctx.stroke();
  y += 6;

  ctx.fillStyle = '#9CA3AF';
  setFont(ctx, 9);
  ctx.textBaseline = 'top';
  const footerParts = [period.label, data.slotDisplayName].filter(Boolean).join(' · ');
  const ftw = ctx.measureText(footerParts).width;
  ctx.fillText(footerParts, (W - ftw) / 2, y);

  // Export
  const filename = `${sanitizeFilename(data.memberName)}_${sanitizeFilename(period.label)}_Report.jpg`;
  return { canvas, filename };
}

export async function downloadMemberReportAsJPG(
  data: MemberReportData,
  period: ReportPeriod,
): Promise<void> {
  const { canvas, filename } = await _renderMemberReport(data, period);
  await downloadBlob(canvas, filename);
}

export async function getMemberReportBlob(
  data: MemberReportData,
  period: ReportPeriod,
): Promise<{ blob: Blob; filename: string }> {
  const { canvas, filename } = await _renderMemberReport(data, period);
  const blob = await canvasToBlob(canvas);
  return { blob, filename };
}

// ============================================
// BATCH REPORT CANVAS
// ============================================

function calcBatchHeight(data: BatchReportData): number {
  let h = HEADER_H + 6;
  h += 26; // title
  h += 16; // subtitle
  h += 6;
  h += 52; // stat tiles
  h += 10;

  if (data.topAsanas.length > 0) {
    h += 26;
    h += Math.ceil(data.topAsanas.length / 2) * 16;
    h += 6;
  }

  if (data.bodyAreas.length > 0) {
    h += 26;
    h += data.bodyAreas.length * 18;
    h += 6;
  }

  if (data.topBenefits.length > 0) {
    h += 26;
    h += Math.ceil(data.topBenefits.length / 3) * 22;
    h += 6;
  }

  h += 20;
  return Math.max(h, Math.round(W * 16 / 9));
}

async function _renderBatchReport(
  data: BatchReportData,
  period: ReportPeriod,
): Promise<{ canvas: HTMLCanvasElement; filename: string }> {
  const logo = data.logoData ? await loadImage(data.logoData) : null;
  const totalH = calcBatchHeight(data);

  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = Math.ceil(totalH * SCALE);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, totalH);

  drawHeader(ctx, logo, data.studioName, data.slotDisplayName);
  drawWatermark(ctx, logo, totalH);

  let y = HEADER_H + 6;

  // Title
  ctx.fillStyle = '#111827';
  setFont(ctx, 18, 'bold');
  ctx.textBaseline = 'top';
  ctx.fillText('Batch Summary', PAD, y);
  y += 26;

  // Subtitle
  ctx.fillStyle = '#6B7280';
  setFont(ctx, 12);
  ctx.fillText(`${data.slotDisplayName} · ${period.label}`, PAD, y);
  y += 16 + 6;

  // ─── STAT TILES (4 tiles) ───
  const tileW = Math.floor((W - PAD * 2 - 12) / 4);
  const tileH = 50;
  drawStatTile(ctx, PAD, y, tileW, tileH,
    `${data.totalSessions}`, 'Sessions', BRAND);
  drawStatTile(ctx, PAD + tileW + 4, y, tileW, tileH,
    `${data.uniqueAsanasCount}`, 'Asanas', '#7C3AED');
  drawStatTile(ctx, PAD + (tileW + 4) * 2, y, tileW, tileH,
    `${data.totalBenefits}`, 'Benefits', GREEN);
  drawStatTile(ctx, PAD + (tileW + 4) * 3, y, tileW, tileH,
    `${data.avgAttendees}`, 'Avg Mem/Day', AMBER);
  y += tileH + 10;

  // ─── TOP PRACTICES ───
  if (data.topAsanas.length > 0) {
    y = drawSectionHeader(ctx, y, `PRACTICES PERFORMED (${data.uniqueAsanasCount})`);
    const colW = (W - PAD * 2) / 2;
    for (let i = 0; i < data.topAsanas.length; i++) {
      const a = data.topAsanas[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const ax = PAD + col * colW;
      const ay = y + row * 16;

      ctx.fillStyle = '#4F46E5';
      setFont(ctx, 10, '600');
      ctx.textBaseline = 'top';
      ctx.fillText(`${i + 1}.`, ax, ay);

      ctx.fillStyle = '#1F2937';
      setFont(ctx, 11, '500');
      ctx.fillText(truncate(a.name, 18), ax + 18, ay);

      ctx.fillStyle = '#6366F1';
      setFont(ctx, 9, '500');
      ctx.fillText(`${a.count}x`, ax + colW - 22, ay + 1);
    }
    y += Math.ceil(data.topAsanas.length / 2) * 16 + 6;
  }

  // ─── BODY AREAS COVERED ───
  if (data.bodyAreas.length > 0) {
    y = drawSectionHeader(ctx, y, 'BODY AREAS COVERED');
    const labelW = 80;
    const barX = PAD + labelW + 4;
    const barMaxW = W - PAD - barX - 30;
    for (const area of data.bodyAreas) {
      ctx.fillStyle = '#374151';
      setFont(ctx, 10, '500');
      ctx.textBaseline = 'top';
      ctx.fillText(truncate(area.label, 14), PAD, y + 1);
      drawHorizontalBar(ctx, barX, y + 1, barMaxW, 10, area.percentage, '#6366F1');
      ctx.fillStyle = '#6B7280';
      setFont(ctx, 9);
      ctx.fillText(`${area.percentage}%`, barX + barMaxW + 4, y + 1);
      y += 18;
    }
    y += 6;
  }

  // ─── BENEFITS ADDRESSED ───
  if (data.topBenefits.length > 0) {
    y = drawSectionHeader(ctx, y, 'BENEFITS ADDRESSED');
    y = drawBadgeRow(ctx, y, data.topBenefits.map(b => b.benefit), '#D1FAE5', '#065F46');
    y += 6;
  }

  // ─── FOOTER ───
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, y + 0.5);
  ctx.lineTo(W - PAD, y + 0.5);
  ctx.stroke();
  y += 6;

  ctx.fillStyle = '#9CA3AF';
  setFont(ctx, 9);
  ctx.textBaseline = 'top';
  const footer = period.label;
  const ftw = ctx.measureText(footer).width;
  ctx.fillText(footer, (W - ftw) / 2, y);

  const filename = `${sanitizeFilename(data.slotDisplayName)}_${sanitizeFilename(period.label)}_Batch_Report.jpg`;
  return { canvas, filename };
}

export async function downloadBatchReportAsJPG(
  data: BatchReportData,
  period: ReportPeriod,
): Promise<void> {
  const { canvas, filename } = await _renderBatchReport(data, period);
  await downloadBlob(canvas, filename);
}

export async function getBatchReportBlob(
  data: BatchReportData,
  period: ReportPeriod,
): Promise<{ blob: Blob; filename: string }> {
  const { canvas, filename } = await _renderBatchReport(data, period);
  const blob = await canvasToBlob(canvas);
  return { blob, filename };
}
