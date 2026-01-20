/**
 * Formatting Utility Functions
 */

import { CURRENCY_SYMBOL } from '../constants';

// ============================================
// CURRENCY FORMATTING
// ============================================

export function formatCurrency(amount: number): string {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString('en-IN')}`;
}

export function formatCurrencyCompact(amount: number): string {
  if (amount >= 100000) {
    return `${CURRENCY_SYMBOL}${(amount / 100000).toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `${CURRENCY_SYMBOL}${(amount / 1000).toFixed(1)}K`;
  }
  return formatCurrency(amount);
}

export function parseCurrency(value: string): number {
  // Remove currency symbol and commas
  const cleaned = value.replace(/[₹,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// ============================================
// PHONE NUMBER FORMATTING
// ============================================

export function formatPhone(phone: string): string {
  // Format 10-digit Indian phone number
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

export function formatPhoneWithCountryCode(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return formatPhone(phone);
}

export function getWhatsAppLink(phone: string, message?: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const fullNumber = cleaned.length === 10 ? `91${cleaned}` : cleaned;
  const baseUrl = `https://wa.me/${fullNumber}`;
  return message ? `${baseUrl}?text=${encodeURIComponent(message)}` : baseUrl;
}

// ============================================
// NAME FORMATTING
// ============================================

export function formatName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export function formatNameWithInitial(firstName: string, lastName: string): string {
  if (!lastName) return firstName;
  return `${firstName} ${lastName.charAt(0)}.`;
}

export function getInitials(firstName: string, lastName: string): string {
  const first = firstName?.charAt(0).toUpperCase() || '';
  const last = lastName?.charAt(0).toUpperCase() || '';
  return `${first}${last}`;
}

export function capitalizeFirst(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function capitalizeWords(str: string): string {
  if (!str) return '';
  return str.split(' ').map(capitalizeFirst).join(' ');
}

// ============================================
// NUMBER FORMATTING
// ============================================

export function formatNumber(num: number): string {
  return num.toLocaleString('en-IN');
}

export function formatPercentage(value: number, decimals: number = 0): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatOrdinal(num: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = num % 100;
  return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

// ============================================
// STRING UTILITIES
// ============================================

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function pluralize(count: number, singular: string, plural?: string): string {
  const pluralForm = plural || `${singular}s`;
  return count === 1 ? singular : pluralForm;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} ${pluralize(minutes, 'minute')}`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} ${pluralize(hours, 'hour')}`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

// ============================================
// STATUS FORMATTING
// ============================================

export function formatStatus(status: string): string {
  return status
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .split(' ')
    .map(capitalizeFirst)
    .join(' ');
}

// ============================================
// EMAIL FORMATTING
// ============================================

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local}***@${domain}`;
  }
  return `${local.slice(0, 2)}***@${domain}`;
}

// ============================================
// FILE SIZE FORMATTING
// ============================================

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================
// INVOICE/RECEIPT FORMATTING
// ============================================

export function formatInvoiceNumber(prefix: string, number: number): string {
  return `${prefix}-${String(number).padStart(5, '0')}`;
}

export function parseInvoiceNumber(invoiceNumber: string): { prefix: string; number: number } | null {
  const match = invoiceNumber.match(/^([A-Z]+)-(\d+)$/);
  if (!match) return null;
  return {
    prefix: match[1],
    number: parseInt(match[2], 10),
  };
}
