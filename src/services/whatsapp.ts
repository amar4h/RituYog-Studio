/**
 * WhatsApp Service
 *
 * Handles WhatsApp messaging via wa.me click-to-chat links.
 * Semi-manual approach: generates pre-filled message links, admin clicks to send.
 */

import { settingsService, membershipPlanService } from './storage';
import { DEFAULT_WHATSAPP_TEMPLATES } from '../constants';
import type {
  Member,
  Lead,
  MembershipSubscription,
  MembershipPlan,
  SessionSlot,
  Payment,
  Invoice,
  WhatsAppTemplates,
  NotificationType
} from '../types';
import { format, differenceInDays, parseISO } from 'date-fns';

/**
 * Generate wa.me link with pre-filled message
 */
export function generateWhatsAppLink(phone: string, message: string): string {
  // Remove all non-digits
  const cleanPhone = phone.replace(/\D/g, '');
  // Add India country code if not present
  const indianPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
  // Encode message for URL
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${indianPhone}?text=${encodedMessage}`;
}

/**
 * Replace placeholders in template with actual data
 */
export function formatMessage(template: string, data: Record<string, string>): string {
  let message = template;
  Object.entries(data).forEach(([key, value]) => {
    // Replace both {key} and {Key} formats
    message = message.replace(new RegExp(`\\{${key}\\}`, 'gi'), value || '');
  });
  return message;
}

/**
 * Open WhatsApp in new tab
 */
export function openWhatsApp(phone: string, message: string): void {
  const link = generateWhatsAppLink(phone, message);
  window.open(link, '_blank');
}

/**
 * Get WhatsApp templates from settings (with fallback to defaults)
 * Merges with defaults to ensure all template arrays exist
 */
export function getWhatsAppTemplates(): WhatsAppTemplates {
  const settings = settingsService.get();
  const stored = settings?.whatsappTemplates;

  // If no stored templates, return defaults
  if (!stored) {
    return DEFAULT_WHATSAPP_TEMPLATES;
  }

  // Merge with defaults to ensure all template arrays exist
  return {
    renewalReminders: stored.renewalReminders?.length ? stored.renewalReminders : DEFAULT_WHATSAPP_TEMPLATES.renewalReminders,
    classReminder: stored.classReminder || DEFAULT_WHATSAPP_TEMPLATES.classReminder,
    paymentConfirmation: stored.paymentConfirmation || DEFAULT_WHATSAPP_TEMPLATES.paymentConfirmation,
    paymentReminders: stored.paymentReminders?.length ? stored.paymentReminders : DEFAULT_WHATSAPP_TEMPLATES.paymentReminders,
    leadFollowUps: stored.leadFollowUps?.length ? stored.leadFollowUps : DEFAULT_WHATSAPP_TEMPLATES.leadFollowUps,
    generalNotifications: stored.generalNotifications?.length
      ? mergeGeneralNotifications(stored.generalNotifications)
      : DEFAULT_WHATSAPP_TEMPLATES.generalNotifications,
  };
}

// Append new default general notification templates added in code updates
function mergeGeneralNotifications(saved: WhatsAppTemplates['generalNotifications']): WhatsAppTemplates['generalNotifications'] {
  const defaults = DEFAULT_WHATSAPP_TEMPLATES.generalNotifications;
  if (saved.length >= defaults.length) return saved;
  return [...saved, ...defaults.slice(saved.length)];
}

/**
 * Get studio info for placeholders
 */
function getStudioPlaceholders(): Record<string, string> {
  const settings = settingsService.get();
  return {
    studioName: settings?.studioName || 'Yoga Studio',
    studioPhone: settings?.phone || '',
    studioWebsite: settings?.website || '',
  };
}

/**
 * Format currency amount
 */
function formatAmount(amount: number): string {
  return `Rs ${amount.toLocaleString('en-IN')}`;
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'd MMM yyyy');
  } catch {
    return dateStr;
  }
}

// ============================================
// MESSAGE GENERATORS
// ============================================

export interface RenewalReminderData {
  member: Member;
  subscription: MembershipSubscription;
  plan: MembershipPlan;
  templateIndex?: number;  // Which template to use (0-based index)
}

export function generateRenewalReminder(data: RenewalReminderData): { phone: string; message: string; link: string } {
  const { member, subscription, plan, templateIndex = 0 } = data;
  const templates = getWhatsAppTemplates();
  const studioInfo = getStudioPlaceholders();

  const daysRemaining = differenceInDays(parseISO(subscription.endDate), new Date());

  // Get active plan prices for monthly and quarterly
  const allPlans = membershipPlanService.getActive();
  const monthlyPlan = allPlans.find(p => p.type === 'monthly');
  const quarterlyPlan = allPlans.find(p => p.type === 'quarterly');

  // Calculate discount percentage
  const discountPercent = subscription.originalAmount > 0
    ? Math.round((subscription.discountAmount / subscription.originalAmount) * 100)
    : 0;

  const placeholders: Record<string, string> = {
    memberName: `${member.firstName} ${member.lastName}`,
    memberFirstName: member.firstName,
    memberPhone: member.phone,
    memberEmail: member.email,
    planName: plan.name,
    startDate: formatDate(subscription.startDate),
    expiryDate: formatDate(subscription.endDate),
    daysRemaining: daysRemaining.toString(),
    discountAmount: formatAmount(subscription.discountAmount),
    payableAmount: formatAmount(subscription.payableAmount),
    currentDiscount: formatAmount(subscription.discountAmount),
    discountPercent: `${discountPercent}%`,
    monthlyPlanPrice: monthlyPlan ? formatAmount(monthlyPlan.price) : 'N/A',
    quarterlyPlanPrice: quarterlyPlan ? formatAmount(quarterlyPlan.price) : 'N/A',
    ...studioInfo,
  };

  // Get the template by index (with bounds checking)
  const templateArray = templates.renewalReminders;
  const selectedTemplate = templateArray[Math.min(templateIndex, templateArray.length - 1)];
  const message = formatMessage(selectedTemplate.template, placeholders);
  const phone = member.whatsappNumber || member.phone;

  return {
    phone,
    message,
    link: generateWhatsAppLink(phone, message),
  };
}

/**
 * Get available renewal reminder templates
 */
export function getRenewalReminderTemplates(): { name: string; template: string }[] {
  const templates = getWhatsAppTemplates();
  return templates.renewalReminders;
}

export interface ClassReminderData {
  member: Member;
  slot: SessionSlot;
  classDate: string; // 'Tomorrow' or formatted date
}

export function generateClassReminder(data: ClassReminderData): { phone: string; message: string; link: string } {
  const { member, slot, classDate } = data;
  const templates = getWhatsAppTemplates();
  const studioInfo = getStudioPlaceholders();

  const placeholders: Record<string, string> = {
    memberName: `${member.firstName} ${member.lastName}`,
    memberFirstName: member.firstName,
    classTime: slot.startTime,
    slotName: slot.displayName,
    classDate: classDate,
    ...studioInfo,
  };

  const message = formatMessage(templates.classReminder.template, placeholders);
  const phone = member.whatsappNumber || member.phone;

  return {
    phone,
    message,
    link: generateWhatsAppLink(phone, message),
  };
}

export interface PaymentConfirmationData {
  member: Member;
  payment: Payment;
  invoice: Invoice;
  plan: MembershipPlan;
  subscription?: MembershipSubscription;
}

export function generatePaymentConfirmation(data: PaymentConfirmationData): { phone: string; message: string; link: string } {
  const { member, payment, invoice, plan, subscription } = data;
  const templates = getWhatsAppTemplates();
  const studioInfo = getStudioPlaceholders();

  const placeholders: Record<string, string> = {
    memberName: `${member.firstName} ${member.lastName}`,
    memberFirstName: member.firstName,
    amount: formatAmount(payment.amount),
    paymentDate: formatDate(payment.paymentDate),
    invoiceNumber: invoice.invoiceNumber,
    planName: plan.name,
    membershipStartDate: subscription ? formatDate(subscription.startDate) : '',
    membershipEndDate: subscription ? formatDate(subscription.endDate) : '',
    ...studioInfo,
  };

  const message = formatMessage(templates.paymentConfirmation.template, placeholders);
  const phone = member.whatsappNumber || member.phone;

  return {
    phone,
    message,
    link: generateWhatsAppLink(phone, message),
  };
}

export interface PaymentReminderData {
  member: Member;
  invoice: Invoice;
  balance: number;
  templateIndex?: number;  // Which template to use (0-based index)
}

export function generatePaymentReminder(data: PaymentReminderData): { phone: string; message: string; link: string } {
  const { member, invoice, balance, templateIndex = 0 } = data;
  const templates = getWhatsAppTemplates();
  const studioInfo = getStudioPlaceholders();

  const placeholders: Record<string, string> = {
    memberName: `${member.firstName} ${member.lastName}`,
    memberFirstName: member.firstName,
    balanceAmount: balance.toLocaleString('en-IN'),  // Without Rs prefix as template already has ₹
    pendingAmount: formatAmount(balance),  // With Rs prefix for templates that need it
    invoiceNumber: invoice.invoiceNumber,
    invoiceAmount: formatAmount(invoice.totalAmount),
    dueDate: formatDate(invoice.dueDate),
    ...studioInfo,
  };

  // Get the template by index (with bounds checking)
  const templateArray = templates.paymentReminders;
  const selectedTemplate = templateArray[Math.min(templateIndex, templateArray.length - 1)];
  const message = formatMessage(selectedTemplate.template, placeholders);
  const phone = member.whatsappNumber || member.phone;

  return {
    phone,
    message,
    link: generateWhatsAppLink(phone, message),
  };
}

/**
 * Get available payment reminder templates
 */
export function getPaymentReminderTemplates(): { name: string; template: string }[] {
  const templates = getWhatsAppTemplates();
  return templates.paymentReminders;
}

export interface LeadFollowUpData {
  lead: Lead;
  templateIndex?: number;  // Which template to use (0-based index)
}

export function generateLeadFollowUp(data: LeadFollowUpData): { phone: string; message: string; link: string } {
  const { lead, templateIndex = 0 } = data;
  const templates = getWhatsAppTemplates();
  const studioInfo = getStudioPlaceholders();

  const placeholders: Record<string, string> = {
    leadName: `${lead.firstName} ${lead.lastName}`,
    leadPhone: lead.phone,
    ...studioInfo,
  };

  // Get the template by index (with bounds checking)
  const templateArray = templates.leadFollowUps;
  const selectedTemplate = templateArray[Math.min(templateIndex, templateArray.length - 1)];
  const message = formatMessage(selectedTemplate.template, placeholders);
  const phone = lead.whatsappNumber || lead.phone;

  return {
    phone,
    message,
    link: generateWhatsAppLink(phone, message),
  };
}

/**
 * Get available lead follow-up templates
 */
export function getLeadFollowUpTemplates(): { name: string; template: string }[] {
  const templates = getWhatsAppTemplates();
  return templates.leadFollowUps;
}

// ============================================
// LEAD REGISTRATION LINK MESSAGE
// ============================================

export interface LeadRegistrationLinkData {
  lead: Lead;
  registrationLink: string;
}

/**
 * Generate a WhatsApp message with registration completion link
 */
export function generateLeadRegistrationLink(data: LeadRegistrationLinkData): { phone: string; message: string; link: string } {
  const { lead, registrationLink } = data;
  const templates = getWhatsAppTemplates();
  const studioInfo = getStudioPlaceholders();

  const placeholders: Record<string, string> = {
    leadName: `${lead.firstName} ${lead.lastName}`,
    leadPhone: lead.phone,
    registrationLink,
    ...studioInfo,
  };

  // Use leadRegistrationLink template, fallback to a simple message if not configured
  const template = templates.leadRegistrationLink?.template ||
    `Hi {leadName}, please complete your registration at {studioName}: {registrationLink}`;

  const message = formatMessage(template, placeholders);
  const phone = lead.whatsappNumber || lead.phone;

  return {
    phone,
    message,
    link: generateWhatsAppLink(phone, message),
  };
}

// ============================================
// GENERAL NOTIFICATION MESSAGE
// ============================================

/**
 * Get next upcoming holiday from settings
 */
function getNextHoliday(): { name: string; date: string } | null {
  const settings = settingsService.get();
  if (!settings?.holidays || settings.holidays.length === 0) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingHolidays = settings.holidays
    .map(holiday => ({
      ...holiday,
      dateObj: parseISO(holiday.date),
    }))
    .filter(holiday => holiday.dateObj >= today)
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  if (upcomingHolidays.length === 0) {
    return null;
  }

  return {
    name: upcomingHolidays[0].name,
    date: format(upcomingHolidays[0].dateObj, 'd MMM yyyy'),
  };
}

export interface GeneralNotificationData {
  member: Member;
  slot?: SessionSlot;
  templateIndex: number; // 0=Holiday, 1=Google Review, 2=Welcome, 3=We Miss You, 4=Extra Membership Days
  extraDays?: number;
}

export function generateGeneralNotification(data: GeneralNotificationData): { phone: string; message: string; link: string } {
  const { member, slot, templateIndex } = data;
  const templates = getWhatsAppTemplates();
  const studioInfo = getStudioPlaceholders();
  const settings = settingsService.get();

  const placeholders: Record<string, string> = {
    memberName: `${member.firstName} ${member.lastName}`,
    memberFirstName: member.firstName,
    memberPhone: member.phone,
    memberEmail: member.email,
    googleReviewUrl: settings?.googleReviewUrl || '',
    slotName: slot?.displayName || '',
    extraDays: data.extraDays ? String(data.extraDays) : '',
    ...studioInfo,
  };

  // Add holiday placeholders
  const nextHoliday = getNextHoliday();
  if (nextHoliday) {
    placeholders.nextHolidayName = nextHoliday.name;
    placeholders.nextHolidayDate = nextHoliday.date;
  } else {
    placeholders.nextHolidayName = '';
    placeholders.nextHolidayDate = '';
  }

  const templateArray = templates.generalNotifications || [];
  const selectedTemplate = templateArray[Math.min(templateIndex, templateArray.length - 1)];

  if (!selectedTemplate) {
    return { phone: '', message: '', link: '' };
  }

  const message = formatMessage(selectedTemplate.template, placeholders);
  const phone = member.whatsappNumber || member.phone;

  return {
    phone,
    message,
    link: generateWhatsAppLink(phone, message),
  };
}

/**
 * Get available general notification templates
 */
export function getGeneralNotificationTemplates(): { name: string; template: string }[] {
  const templates = getWhatsAppTemplates();
  return templates.generalNotifications || [];
}

// ============================================
// EXPORTED SERVICE
// ============================================

export const whatsappService = {
  // Core utilities
  generateLink: generateWhatsAppLink,
  formatMessage,
  openWhatsApp,
  getTemplates: getWhatsAppTemplates,

  // Template helpers
  getRenewalReminderTemplates,
  getPaymentReminderTemplates,
  getLeadFollowUpTemplates,
  getGeneralNotificationTemplates,

  // Message generators
  generateRenewalReminder,
  generateClassReminder,
  generatePaymentConfirmation,
  generatePaymentReminder,
  generateLeadFollowUp,
  generateLeadRegistrationLink,
  generateGeneralNotification,

  // Quick send methods (opens WhatsApp directly)
  sendRenewalReminder: (data: RenewalReminderData) => {
    const { phone, message } = generateRenewalReminder(data);
    openWhatsApp(phone, message);
  },
  sendClassReminder: (data: ClassReminderData) => {
    const { phone, message } = generateClassReminder(data);
    openWhatsApp(phone, message);
  },
  sendPaymentConfirmation: (data: PaymentConfirmationData) => {
    const { phone, message } = generatePaymentConfirmation(data);
    openWhatsApp(phone, message);
  },
  sendPaymentReminder: (data: PaymentReminderData) => {
    const { phone, message } = generatePaymentReminder(data);
    openWhatsApp(phone, message);
  },
  sendLeadFollowUp: (data: LeadFollowUpData) => {
    const { phone, message } = generateLeadFollowUp(data);
    openWhatsApp(phone, message);
  },
  sendLeadRegistrationLink: (data: LeadRegistrationLinkData) => {
    const { phone, message } = generateLeadRegistrationLink(data);
    openWhatsApp(phone, message);
  },
  sendGeneralNotification: (data: GeneralNotificationData) => {
    const { phone, message } = generateGeneralNotification(data);
    openWhatsApp(phone, message);
  },
};

export default whatsappService;
