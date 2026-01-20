/**
 * Rupee symbol support for jsPDF
 * Generates the ₹ symbol dynamically using HTML Canvas
 */

import jsPDF from 'jspdf';

// Cache for the generated rupee symbol image
let rupeeImageCache: string | null = null;

/**
 * Generate a rupee symbol image using HTML Canvas
 * This creates a clean, scalable ₹ symbol that works in PDFs
 */
function generateRupeeImage(): string {
  if (rupeeImageCache) {
    return rupeeImageCache;
  }

  // Create a canvas to render the rupee symbol
  const canvas = document.createElement('canvas');
  const size = 64; // Higher resolution for better quality
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Cannot create canvas context');
  }

  // Clear canvas with transparency
  ctx.clearRect(0, 0, size, size);

  // Draw the ₹ symbol using a system font that supports it
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Try different fonts that might have the rupee symbol
  const fonts = [
    'Arial Unicode MS',
    'Noto Sans',
    'Segoe UI Symbol',
    'Arial',
    'sans-serif'
  ];

  ctx.font = `bold ${size * 0.8}px ${fonts.join(', ')}`;
  ctx.fillText('₹', size / 2, size / 2 + 2);

  // Convert to PNG data URL
  rupeeImageCache = canvas.toDataURL('image/png');
  return rupeeImageCache;
}

/**
 * Draw an amount with the Indian Rupee symbol (₹)
 * Uses canvas-generated image for the symbol
 */
export function drawAmountWithRupee(
  doc: jsPDF,
  amount: number,
  x: number,
  y: number,
  options: {
    align?: 'left' | 'right';
    fontSize?: number;
    fontStyle?: 'normal' | 'bold';
    color?: { r: number; g: number; b: number };
  } = {}
): void {
  const {
    align = 'left',
    fontSize = 10,
    fontStyle = 'normal',
    color = { r: 30, g: 30, b: 30 }
  } = options;

  // Format amount with Indian number formatting (lakhs/crores)
  const formattedAmount = amount.toLocaleString('en-IN');

  // Calculate dimensions - symbol size proportional to font size
  const symbolSize = fontSize * 0.35; // Size in mm
  const symbolSpacing = 0.5; // Space after symbol in mm

  // Set text properties
  doc.setFont('helvetica', fontStyle);
  doc.setFontSize(fontSize);
  doc.setTextColor(color.r, color.g, color.b);

  // Calculate total width for right alignment
  const textWidth = doc.getTextWidth(formattedAmount);
  const totalWidth = symbolSize + symbolSpacing + textWidth;

  let startX: number;
  if (align === 'right') {
    startX = x - totalWidth;
  } else {
    startX = x;
  }

  try {
    // Generate and add the rupee symbol image
    const rupeeImage = generateRupeeImage();

    // Adjust Y position to align with text baseline
    const symbolY = y - symbolSize * 0.82;

    doc.addImage(rupeeImage, 'PNG', startX, symbolY, symbolSize, symbolSize);

    // Draw the amount text after the symbol
    doc.text(formattedAmount, startX + symbolSize + symbolSpacing, y);
  } catch {
    // Fallback to "Rs." if canvas/image fails
    const fallbackText = `Rs. ${formattedAmount}`;
    if (align === 'right') {
      doc.text(fallbackText, x, y, { align: 'right' });
    } else {
      doc.text(fallbackText, x, y);
    }
  }
}

/**
 * Helper to get the width of a formatted rupee amount
 */
export function getRupeeAmountWidth(doc: jsPDF, amount: number, fontSize: number): number {
  const formattedAmount = amount.toLocaleString('en-IN');
  doc.setFontSize(fontSize);
  const textWidth = doc.getTextWidth(formattedAmount);
  const symbolSize = fontSize * 0.35;
  const symbolSpacing = 0.5;
  return symbolSize + symbolSpacing + textWidth;
}
