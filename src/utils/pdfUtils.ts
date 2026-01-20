/**
 * PDF Generation Utility for Invoices
 * Modern, clean invoice design using jsPDF
 */

import jsPDF from 'jspdf';
import type { Invoice, Member, StudioSettings, InvoiceTemplate, MembershipSubscription, MembershipPlan, Payment } from '../types';
import { formatDate } from './dateUtils';
import { DEFAULT_INVOICE_TEMPLATE } from '../constants';
import { drawAmountWithRupee, getRupeeAmountWidth } from './rupeeFont';

interface InvoiceData {
  invoice: Invoice;
  member: Member | null;
  subscription?: MembershipSubscription | null;
  plan?: MembershipPlan | null;
  payments: Payment[];
  settings: StudioSettings;
}

/**
 * Check if the currency symbol is Indian Rupee
 */
function isRupeeSymbol(symbol: string): boolean {
  return symbol === '₹' || symbol === 'INR' || symbol === 'Rs';
}

/**
 * Format currency for non-Rupee currencies (fallback)
 */
function formatAmountText(amount: number, symbol: string): string {
  return `${symbol}${amount.toLocaleString('en-IN')}`;
}

/**
 * Helper to draw amount - uses Rupee drawing for ₹, text for others
 */
function drawAmount(
  doc: jsPDF,
  amount: number,
  symbol: string,
  x: number,
  y: number,
  options: {
    align?: 'left' | 'right';
    fontSize?: number;
    fontStyle?: 'normal' | 'bold';
    color?: { r: number; g: number; b: number };
  } = {}
): void {
  const { align = 'left', fontSize = 10, fontStyle = 'normal', color = { r: 30, g: 30, b: 30 } } = options;

  if (isRupeeSymbol(symbol)) {
    // Use custom rupee drawing
    drawAmountWithRupee(doc, amount, x, y, { align, fontSize, fontStyle, color });
  } else {
    // Use regular text for other currencies
    doc.setFont('helvetica', fontStyle);
    doc.setFontSize(fontSize);
    doc.setTextColor(color.r, color.g, color.b);
    const text = formatAmountText(amount, symbol);
    if (align === 'right') {
      doc.text(text, x, y, { align: 'right' });
    } else {
      doc.text(text, x, y);
    }
  }
}

/**
 * Generate modern PDF invoice using jsPDF
 */
export async function generateInvoicePDF(data: InvoiceData): Promise<Blob> {
  const { invoice, member, subscription, plan, payments, settings } = data;
  // Merge with defaults to ensure all fields exist
  const template = {
    ...DEFAULT_INVOICE_TEMPLATE,
    ...settings.invoiceTemplate,
  };
  // Always use currency symbol from template, fallback to ₹
  const currencySymbol = template.currencySymbol || '₹';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const rightCol = pageWidth - margin;
  const contentWidth = pageWidth - margin * 2;

  // Helper to convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 79, g: 70, b: 229 };
  };

  const accent = hexToRgb(template.accentColor);
  const balance = invoice.totalAmount - invoice.amountPaid;

  let y = margin;
  const headerTop = y; // Top alignment reference point

  // ==================== HEADER (top-justified) ====================

  // Logo - 26mm to align with studio info block
  const logoSize = 26;
  let logoWidth = 0;
  if (template.showLogo && settings.logoData) {
    try {
      doc.addImage(settings.logoData, 'AUTO', margin, headerTop, logoSize, logoSize);
      logoWidth = logoSize + 4;
    } catch {
      // Skip logo on error
    }
  }

  // Studio name - top-justified, same color as header text (accent color)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(accent.r, accent.g, accent.b);
  doc.text(settings.studioName, margin + logoWidth, headerTop + 5);

  // Studio contact info - same color as header text (accent color)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(accent.r, accent.g, accent.b);

  let contactY = headerTop + 11;
  if (template.showStudioAddress && settings.address) {
    doc.text(settings.address, margin + logoWidth, contactY, { maxWidth: 60 });
    const addressLines = doc.splitTextToSize(settings.address, 60);
    contactY += addressLines.length * 4;
  }
  if (template.showStudioPhone && settings.phone) {
    doc.text(settings.phone, margin + logoWidth, contactY);
    contactY += 4;
  }
  if (template.showStudioEmail && settings.email) {
    doc.text(settings.email, margin + logoWidth, contactY);
  }

  // INVOICE label - right aligned, top-justified
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(accent.r, accent.g, accent.b);
  doc.text(template.headerText || 'INVOICE', rightCol, headerTop + 8, { align: 'right' });

  y = 55;

  // ==================== INVOICE DETAILS ====================

  // Left column: Bill To
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text('BILL TO', margin, y);

  y += 5;
  if (member) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    doc.text(`${member.firstName} ${member.lastName}`, margin, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    y += 5;
    doc.text(member.email, margin, y);
    y += 4;
    doc.text(member.phone, margin, y);
    if (member.address) {
      y += 4;
      const addressLines = doc.splitTextToSize(member.address, 70);
      doc.text(addressLines, margin, y);
      y += (addressLines.length - 1) * 4;
    }
  }

  // Right column: Invoice details - fixed right alignment
  const detailsLabelX = rightCol - 55;
  const detailsValueX = rightCol;
  let detailY = 55;

  const addDetail = (label: string, value: string, highlight = false) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(130, 130, 130);
    doc.text(label, detailsLabelX, detailY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    if (highlight) {
      doc.setTextColor(accent.r, accent.g, accent.b);
    } else {
      doc.setTextColor(30, 30, 30);
    }
    doc.text(value, detailsValueX, detailY, { align: 'right' });
    detailY += 7;
  };

  addDetail('Invoice No.', invoice.invoiceNumber, true);
  addDetail('Issue Date', formatDate(invoice.invoiceDate));
  addDetail('Due Date', formatDate(invoice.dueDate));

  // Status badge
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(130, 130, 130);
  doc.text('Status', detailsLabelX, detailY);

  const statusColors: Record<string, { r: number; g: number; b: number; bg: { r: number; g: number; b: number } }> = {
    'paid': { r: 22, g: 163, b: 74, bg: { r: 220, g: 252, b: 231 } },
    'partially-paid': { r: 202, g: 138, b: 4, bg: { r: 254, g: 249, b: 195 } },
    'overdue': { r: 220, g: 38, b: 38, bg: { r: 254, g: 226, b: 226 } },
    'sent': { r: 37, g: 99, b: 235, bg: { r: 219, g: 234, b: 254 } },
    'draft': { r: 107, g: 114, b: 128, bg: { r: 243, g: 244, b: 246 } },
    'cancelled': { r: 107, g: 114, b: 128, bg: { r: 243, g: 244, b: 246 } },
  };

  const statusStyle = statusColors[invoice.status] || statusColors['draft'];
  const statusText = invoice.status.toUpperCase().replace('-', ' ');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const statusWidth = doc.getTextWidth(statusText) + 6;

  doc.setFillColor(statusStyle.bg.r, statusStyle.bg.g, statusStyle.bg.b);
  doc.roundedRect(detailsValueX - statusWidth - 1, detailY - 3.5, statusWidth + 2, 5.5, 1, 1, 'F');
  doc.setTextColor(statusStyle.r, statusStyle.g, statusStyle.b);
  doc.text(statusText, detailsValueX, detailY, { align: 'right' });

  y = Math.max(y + 12, detailY + 12);

  // ==================== LINE ITEMS TABLE ====================

  // Table header line
  doc.setDrawColor(accent.r, accent.g, accent.b);
  doc.setLineWidth(0.6);
  doc.line(margin, y, rightCol, y);

  y += 7;

  // Column positions - aligned with invoice details section on the right
  // The AMOUNT column should align with the totals section (which uses detailsValueX = rightCol)
  const col = {
    desc: margin,
    descWidth: 70,
    qty: detailsLabelX - 30,      // QTY positioned before the details section
    rate: detailsLabelX,          // RATE aligns with labels (Subtotal, Total, etc.)
    amount: detailsValueX,        // AMOUNT aligns with values (same as invoice details)
  };

  // Column headers
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('DESCRIPTION', col.desc, y);
  doc.text('QTY', col.qty, y, { align: 'center' });
  doc.text('RATE', col.rate, y, { align: 'right' });
  doc.text('AMOUNT', col.amount, y, { align: 'right' });

  y += 3;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.line(margin, y, rightCol, y);

  y += 6;

  // Line items
  invoice.items.forEach((item) => {
    const startY = y;

    // Description with wrapping
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);

    const descLines = doc.splitTextToSize(item.description, col.descWidth);
    doc.text(descLines, col.desc, y);

    // Calculate row height based on description
    let rowHeight = descLines.length * 4;

    // Subscription period subtitle (if applicable)
    if (subscription && plan) {
      const subY = y + rowHeight;
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      const periodText = `${plan.name} • ${formatDate(subscription.startDate)} - ${formatDate(subscription.endDate)}`;
      doc.text(periodText, col.desc, subY);
      rowHeight += 4;
    }

    // Quantity - center aligned
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(String(item.quantity), col.qty, startY, { align: 'center' });

    // Rate (unit price) - right aligned
    drawAmount(doc, item.unitPrice, currencySymbol, col.rate, startY, {
      align: 'right',
      fontSize: 10,
      fontStyle: 'normal',
      color: { r: 60, g: 60, b: 60 }
    });

    // Amount (total) - right aligned
    drawAmount(doc, item.total, currencySymbol, col.amount, startY, {
      align: 'right',
      fontSize: 10,
      fontStyle: 'bold',
      color: { r: 30, g: 30, b: 30 }
    });

    y += Math.max(rowHeight, 6) + 4;
  });

  // Bottom line
  y += 2;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.line(margin, y, rightCol, y);

  // ==================== TOTALS ====================
  // Use same positioning as invoice details section for alignment
  y += 8;
  const totalsLabelX = detailsLabelX; // Same as invoice details labels
  const totalsValueX = detailsValueX; // Same as invoice details values (rightCol)

  // Helper to add a totals row with amount - uses drawAmount for proper ₹ symbol
  const addTotalRowWithAmount = (label: string, amount: number, options?: {
    labelColor?: { r: number; g: number; b: number };
    valueColor?: { r: number; g: number; b: number };
    bold?: boolean;
    fontSize?: number;
    prefix?: string;
  }) => {
    const opts = options || {};
    const labelColor = opts.labelColor || { r: 100, g: 100, b: 100 };
    const valueColor = opts.valueColor || { r: 30, g: 30, b: 30 };

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(opts.fontSize || 9);
    doc.setTextColor(labelColor.r, labelColor.g, labelColor.b);
    doc.text(label, totalsLabelX, y);

    // Draw the amount with proper rupee symbol
    if (opts.prefix === '-') {
      // For negative amounts (discounts), draw minus sign then amount
      doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
      doc.setFontSize(opts.fontSize || 10);
      doc.setTextColor(valueColor.r, valueColor.g, valueColor.b);

      // Get the width of the amount to position the minus sign correctly
      const amountWidth = isRupeeSymbol(currencySymbol)
        ? getRupeeAmountWidth(doc, amount, opts.fontSize || 10)
        : doc.getTextWidth(formatAmountText(amount, currencySymbol));

      // Draw the amount
      drawAmount(doc, amount, currencySymbol, totalsValueX, y, {
        align: 'right',
        fontSize: opts.fontSize || 10,
        fontStyle: opts.bold ? 'bold' : 'normal',
        color: valueColor
      });

      // Draw minus sign before the amount
      doc.text('-', totalsValueX - amountWidth - 1.5, y);
    } else {
      drawAmount(doc, amount, currencySymbol, totalsValueX, y, {
        align: 'right',
        fontSize: opts.fontSize || 10,
        fontStyle: opts.bold ? 'bold' : 'normal',
        color: valueColor
      });
    }
    y += 7;
  };

  // Subtotal
  addTotalRowWithAmount('Subtotal', invoice.amount);

  // Discount
  if (invoice.discount && invoice.discount > 0) {
    const discountLabel = invoice.discountReason ? `Discount (${invoice.discountReason})` : 'Discount';
    addTotalRowWithAmount(discountLabel, invoice.discount, {
      labelColor: { r: 22, g: 163, b: 74 },
      valueColor: { r: 22, g: 163, b: 74 },
      prefix: '-',
    });
  }

  // Separator line
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.line(totalsLabelX, y - 3, rightCol, y - 3);

  // Total
  addTotalRowWithAmount('Total', invoice.totalAmount, {
    bold: true,
    fontSize: 10,
    valueColor: { r: 30, g: 30, b: 30 },
  });

  // Amount Paid
  addTotalRowWithAmount('Paid', invoice.amountPaid, {
    labelColor: { r: 22, g: 163, b: 74 },
    valueColor: { r: 22, g: 163, b: 74 },
  });

  // Balance Due - prominent box
  const balanceBoxWidth = rightCol - totalsLabelX + 10;

  if (balance > 0) {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(252, 165, 165);
  } else {
    doc.setFillColor(220, 252, 231);
    doc.setDrawColor(134, 239, 172);
  }
  doc.setLineWidth(0.4);
  doc.roundedRect(totalsLabelX - 5, y - 3, balanceBoxWidth, 12, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const balanceColor = balance > 0 ? { r: 185, g: 28, b: 28 } : { r: 22, g: 101, b: 52 };
  doc.setTextColor(balanceColor.r, balanceColor.g, balanceColor.b);
  doc.text('Balance Due', totalsLabelX, y + 4);
  drawAmount(doc, balance, currencySymbol, totalsValueX, y + 4, {
    align: 'right',
    fontSize: 10,
    fontStyle: 'bold',
    color: balanceColor
  });

  y += 22;

  // ==================== PAYMENT QR CODE ====================
  // Show QR code when: showPaymentQR is enabled AND paymentQRData exists AND there's a balance due
  const shouldShowQR = template.showPaymentQR === true &&
                       template.paymentQRData &&
                       template.paymentQRData.length > 0 &&
                       balance > 0;

  if (shouldShowQR) {
    const qrSize = 35;
    const qrX = margin;
    const qrY = y;

    try {
      // Add QR code image
      doc.addImage(template.paymentQRData!, 'PNG', qrX, qrY, qrSize, qrSize);

      // QR code label
      if (template.paymentQRLabel) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(accent.r, accent.g, accent.b);
        doc.text(template.paymentQRLabel, qrX + qrSize / 2, qrY + qrSize + 5, { align: 'center' });
      }

      y = qrY + qrSize + 12;
    } catch (err) {
      // Log error for debugging but continue without QR
      console.warn('Failed to add QR code to PDF:', err);
    }
  }

  // ==================== PAYMENT HISTORY ====================

  if (payments.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(accent.r, accent.g, accent.b);
    doc.text('Payment History', margin, y);

    y += 6;

    payments.forEach((payment) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);

      const methodLabel = payment.paymentMethod.charAt(0).toUpperCase() +
                          payment.paymentMethod.slice(1).replace('-', ' ');
      doc.text(formatDate(payment.paymentDate), margin, y);
      doc.text(methodLabel, margin + 28, y);

      // Draw payment amount with rupee symbol
      drawAmount(doc, payment.amount, currencySymbol, margin + 65, y, {
        align: 'left',
        fontSize: 9,
        fontStyle: 'bold',
        color: { r: 22, g: 163, b: 74 }
      });

      if (payment.receiptNumber) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(140, 140, 140);
        doc.text(`#${payment.receiptNumber}`, margin + 95, y);
      }

      y += 5;
    });

    y += 6;
  }

  // ==================== NOTES ====================

  if (invoice.notes) {
    doc.setFillColor(255, 251, 235);
    doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(180, 83, 9);
    doc.text('Note:', margin + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(146, 64, 14);
    doc.text(invoice.notes, margin + 18, y + 5, { maxWidth: contentWidth - 22 });

    y += 18;
  }

  // ==================== FOOTER ====================

  // Calculate space needed for terms and footer
  let termsHeight = 0;
  let termsLines: string[] = [];

  if (template.termsText) {
    doc.setFontSize(8);
    termsLines = doc.splitTextToSize(template.termsText, contentWidth);
    termsHeight = 10 + termsLines.length * 3.5;
  }

  const footerHeight = template.footerText ? 15 : 0;
  const totalFooterHeight = termsHeight + footerHeight + 5;

  // Position terms at the bottom, leaving space for footer
  const termsY = pageHeight - totalFooterHeight;

  // Terms & Conditions
  if (template.termsText && termsLines.length > 0) {
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(margin, termsY, rightCol, termsY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text('Terms & Conditions', margin, termsY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);

    // Render each line of terms
    let lineY = termsY + 10;
    termsLines.forEach((line) => {
      doc.text(line, margin, lineY);
      lineY += 3.5;
    });
  }

  // Footer message
  if (template.footerText) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(accent.r, accent.g, accent.b);
    doc.text(template.footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  return doc.output('blob');
}

/**
 * Get invoice PDF as blob URL for preview
 */
export async function getInvoicePDFUrl(data: InvoiceData): Promise<string> {
  const blob = await generateInvoicePDF(data);
  return URL.createObjectURL(blob);
}

/**
 * Download invoice as PDF
 */
export async function downloadInvoicePDF(data: InvoiceData): Promise<void> {
  const blob = await generateInvoicePDF(data);
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${data.invoice.invoiceNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
