/**
 * Yoga Studio Management - Constants
 * Phase 1: Core Operations
 */

import type { SessionSlot, MembershipPlan, StudioSettings, WeeklyAvailability, InvoiceTemplate, WhatsAppTemplates, BodyArea, DifficultyLevel, AsanaType, IntensityLevel, BreathingCue } from '../types';

// ============================================
// SESSION SLOTS (Fixed 4 slots)
// ============================================

export const DEFAULT_SESSION_SLOTS: Omit<SessionSlot, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    startTime: '07:30',
    endTime: '08:30',
    displayName: 'Morning 7:30 AM',
    capacity: 10,
    exceptionCapacity: 1,
    sessionType: 'offline',
    isActive: true,
  },
  {
    startTime: '08:45',
    endTime: '09:45',
    displayName: 'Morning 8:45 AM',
    capacity: 10,
    exceptionCapacity: 1,
    sessionType: 'offline',
    isActive: true,
  },
  {
    startTime: '10:00',
    endTime: '11:00',
    displayName: 'Late Morning 10:00 AM',
    capacity: 10,
    exceptionCapacity: 1,
    sessionType: 'offline',
    isActive: true,
  },
  {
    startTime: '19:30',
    endTime: '20:30',
    displayName: 'Evening 7:30 PM',
    capacity: 10,
    exceptionCapacity: 1,
    sessionType: 'offline',
    isActive: true,
  },
];

// Slot IDs for reference
export const SLOT_IDS = {
  MORNING_EARLY: 'slot-0730',
  MORNING_LATE: 'slot-0845',
  LATE_MORNING: 'slot-1000',
  EVENING: 'slot-1930',
} as const;

// ============================================
// MEMBERSHIP PLANS (Default plans)
// ============================================

export const DEFAULT_MEMBERSHIP_PLANS: Omit<MembershipPlan, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Monthly',
    type: 'monthly',
    price: 2100,
    durationMonths: 1,
    description: 'Unlimited yoga sessions for 1 month. Access to your assigned slot Monday to Friday.',
    isActive: true,
    allowedSessionTypes: ['offline'],
    features: [
      'Unlimited sessions (Mon-Fri)',
      'One assigned slot',
      'Access to all class types',
    ],
  },
  {
    name: 'Quarterly',
    type: 'quarterly',
    price: 5500,
    durationMonths: 3,
    description: 'Unlimited yoga sessions for 3 months. Access to your assigned slot Monday to Friday. Save ₹800!',
    isActive: true,
    allowedSessionTypes: ['offline'],
    features: [
      'Unlimited sessions (Mon-Fri)',
      'One assigned slot',
      'Access to all class types',
      'Save ₹800 vs monthly',
    ],
  },
  {
    name: 'Semi-Annual',
    type: 'semi-annual',
    price: 10000,
    durationMonths: 6,
    description: 'Unlimited yoga sessions for 6 months. Access to your assigned slot Monday to Friday. Save ₹2,600!',
    isActive: true,
    allowedSessionTypes: ['offline'],
    features: [
      'Unlimited sessions (Mon-Fri)',
      'One assigned slot',
      'Access to all class types',
      'Save ₹2,600 vs monthly',
    ],
  },
];

// ============================================
// DEFAULT WORKING HOURS
// ============================================

export const DEFAULT_WORKING_HOURS: WeeklyAvailability = {
  monday: [{ start: '06:00', end: '21:00' }],
  tuesday: [{ start: '06:00', end: '21:00' }],
  wednesday: [{ start: '06:00', end: '21:00' }],
  thursday: [{ start: '06:00', end: '21:00' }],
  friday: [{ start: '06:00', end: '21:00' }],
  saturday: [], // Closed
  sunday: [], // Closed
};

// ============================================
// DEFAULT INDIAN HOLIDAYS (2025-2026)
// ============================================

export const DEFAULT_INDIAN_HOLIDAYS = [
  // 2025 Holidays
  { date: '2025-01-26', name: 'Republic Day', isRecurringYearly: true },
  { date: '2025-03-14', name: 'Holi', isRecurringYearly: false },
  { date: '2025-04-14', name: 'Ambedkar Jayanti', isRecurringYearly: true },
  { date: '2025-04-18', name: 'Good Friday', isRecurringYearly: false },
  { date: '2025-05-01', name: 'May Day', isRecurringYearly: true },
  { date: '2025-08-15', name: 'Independence Day', isRecurringYearly: true },
  { date: '2025-08-27', name: 'Janmashtami', isRecurringYearly: false },
  { date: '2025-10-02', name: 'Gandhi Jayanti', isRecurringYearly: true },
  { date: '2025-10-02', name: 'Dussehra', isRecurringYearly: false },
  { date: '2025-10-20', name: 'Diwali', isRecurringYearly: false },
  { date: '2025-10-21', name: 'Diwali (Day 2)', isRecurringYearly: false },
  { date: '2025-11-05', name: 'Guru Nanak Jayanti', isRecurringYearly: false },
  { date: '2025-12-25', name: 'Christmas', isRecurringYearly: true },

  // 2026 Holidays (India Public Holidays)
  { date: '2026-01-26', name: 'Republic Day', isRecurringYearly: true },
  { date: '2026-02-27', name: 'Maha Shivaratri', isRecurringYearly: false },
  { date: '2026-03-04', name: 'Holi', isRecurringYearly: false },
  { date: '2026-03-21', name: 'Eid ul-Fitr', isRecurringYearly: false },
  { date: '2026-04-03', name: 'Good Friday', isRecurringYearly: false },
  { date: '2026-05-01', name: 'May Day', isRecurringYearly: true },
  { date: '2026-08-15', name: 'Independence Day', isRecurringYearly: true },
  { date: '2026-08-16', name: 'Janmashtami', isRecurringYearly: false },
  { date: '2026-10-02', name: 'Gandhi Jayanti', isRecurringYearly: true },
  { date: '2026-10-17', name: 'Karwa Chauth', isRecurringYearly: false },
  { date: '2026-10-19', name: 'Dussehra', isRecurringYearly: false },
  { date: '2026-10-29', name: 'Dhanteras', isRecurringYearly: false },
  { date: '2026-11-01', name: 'Diwali', isRecurringYearly: false },
  { date: '2026-11-04', name: 'Bhai Dooj', isRecurringYearly: false },
  { date: '2026-11-24', name: 'Guru Nanak Jayanti', isRecurringYearly: false },
  { date: '2026-12-25', name: 'Christmas', isRecurringYearly: true },
];

// ============================================
// DEFAULT INVOICE TEMPLATE
// ============================================

export const DEFAULT_INVOICE_TEMPLATE: InvoiceTemplate = {
  showLogo: true,
  showStudioAddress: true,
  showStudioPhone: true,
  showStudioEmail: true,
  headerText: 'INVOICE',
  footerText: 'Thank you for your business!',
  termsText: 'Payment is due within 7 days of invoice date.',
  accentColor: '#4F46E5',
  currencySymbol: '₹',
  showPaymentQR: false,
  paymentQRLabel: 'Scan to Pay',
};

// ============================================
// DEFAULT WHATSAPP MESSAGE TEMPLATES
// ============================================

export const DEFAULT_WHATSAPP_TEMPLATES: WhatsAppTemplates = {
  renewalReminders: [
    {
      name: 'With Discount Info',
      template: `Hi {memberName} Namaste 🌸

This is a gentle reminder that your yoga membership is nearing expiry 🙏

Please find your current membership details below 👇

🧘‍♀️ Plan Amount: ₹{payableAmount}
📅 Expiry Date: {expiryDate}
💰 Current Discount: {discountAmount}

✨ Important: If you renew your membership without any gap, you will be able to continue at the same plan amount and enjoy your existing discount 😊

Please feel free to reply here if you'd like help with renewal or have any questions 🌿
We'd love to continue practicing with you 🧘‍♀️💚

Warm regards,
RituYog ✨

_This is an automated message. Reply STOP to opt-out._`,
    },
    {
      name: 'Simple Reminder',
      template: `Hi {memberName} Namaste 🌸

This is a gentle reminder that your yoga membership is nearing expiry 🙏

Please find your current membership details below 👇

🧘‍♀️ Membership Amount: ₹{payableAmount}
📅 Expiry Date: {expiryDate}

Please feel free to reply here if you'd like help with renewal or have any questions 🌿
We'd love to continue practicing with you 🧘‍♀️💚

Warm regards,
RituYog ✨

_This is an automated message. Reply STOP to opt-out._`,
    },
    {
      name: 'Urgent Reminder',
      template: 'Hi {memberName}, your membership expires in just {daysRemaining} days ({expiryDate}). Don\'t miss your yoga practice! Renew now to continue enjoying your classes. - {studioName}\n\n_This is an automated message. Reply STOP to opt-out._',
    },
  ],
  classReminder: {
    name: 'Class Reminder',
    template: 'Hi {memberName}, reminder: Your yoga class is {classDate} at {classTime}. See you! - {studioName}\n\n_This is an automated message. Reply STOP to opt-out._',
  },
  paymentConfirmation: {
    name: 'Payment Confirmation',
    template: 'Hi {memberName}, we received your payment of {amount} for {planName}. Thank you! - {studioName}\n\n_This is an automated message. Reply STOP to opt-out._',
  },
  paymentReminders: [
    {
      name: 'Gentle Reminder',
      template: `Hi {memberName} Namaste 🌸

This is a gentle reminder about your pending payment for your yoga membership 🙏

📋 Invoice: {invoiceNumber}
💰 Amount Due: ₹{balanceAmount}
📅 Due Date: {dueDate}

You can pay via UPI, bank transfer, or cash at the studio. Please feel free to reply here if you have any questions 🌿

Warm regards,
{studioName} ✨

_This is an automated message. Reply STOP to opt-out._`,
    },
    {
      name: 'Follow-up Reminder',
      template: `Hi {memberName}, this is a follow-up regarding your pending payment of ₹{balanceAmount} (Invoice: {invoiceNumber}). Please clear the dues at your earliest convenience to continue enjoying uninterrupted yoga sessions. - {studioName}

_This is an automated message. Reply STOP to opt-out._`,
    },
  ],
  leadFollowUps: [
    {
      name: 'Trial Invitation',
      template: 'Hi {leadName}, thank you for your interest in {studioName}! We\'d love to have you try a class. Would you like to book a free trial session? Call us at {studioPhone}.\n\n_This is an automated message. Reply STOP to opt-out._',
    },
    {
      name: 'Check-in Message',
      template: 'Hi {leadName}, this is {studioName} checking in! We noticed you were interested in joining us. Do you have any questions about our yoga classes? We\'re happy to help! Reply or call {studioPhone}.\n\n_This is an automated message. Reply STOP to opt-out._',
    },
  ],
  leadRegistrationLink: {
    name: 'Registration Link',
    template: `Hi {leadName} Namaste 🌸

Thank you for your interest in {studioName}! 🙏

Please complete your registration by clicking the link below 👇

📝 {registrationLink}

This link will expire in 7 days. If you have any questions, feel free to reply to this message.

Warm regards,
{studioName} ✨

_This is an automated message. Reply STOP to opt-out._`,
  },
  generalNotifications: [
    {
      name: 'Holiday Notification',
      template: `Hi {memberName} Namaste 🌸

We'd like to inform you that {studioName} will be closed for *{nextHolidayName}* on *{nextHolidayDate}*.

Regular classes will resume the next working day. We wish you a wonderful celebration! 🎉

Warm regards,
{studioName} 🙏

_This is an automated message. Reply STOP to opt-out._`,
    },
    {
      name: 'Google Review Request',
      template: `Hi {memberName} Namaste 🌸

We hope you're enjoying your yoga journey with us! 🧘‍♀️

Your feedback means the world to us. Would you kindly take a moment to share your experience on Google? It helps others discover our studio too!

📝 {googleReviewUrl}

Thank you for being part of our community! 🙏

Warm regards,
{studioName} ✨

_This is an automated message. Reply STOP to opt-out._`,
    },
    {
      name: 'Welcome Message',
      template: `Hi {memberName} Namaste 🌸

Welcome to {studioName}! 🙏

We're thrilled to have you as part of our yoga family. Your wellness journey begins here! 🧘‍♀️✨

Your session: *{slotName}*

Feel free to reply to this message if you have any questions. See you on the mat!

Warm regards,
{studioName} ✨

_This is an automated message. Reply STOP to opt-out._`,
    },
    {
      name: 'We Miss You',
      template: `Hi {memberFirstName} Namaste 🌸

We've noticed you've been away from your yoga sessions recently, and we truly miss your presence on the mat! 🧘‍♀️

Remember, every session counts towards your well-being. Even a short practice can make a big difference.

We'd love to see you back soon! Your body and mind will thank you. 💪✨

Warm regards,
{studioName} 🙏

_This is an automated message. Reply STOP to opt-out._`,
    },
    {
      name: 'Extra Membership Days',
      template: `Hi {memberFirstName} Namaste 🌸

Great news! 🎉 We understand that sometimes life gets busy or you may need a break, and we want to make sure you get the most out of your membership.

We're happy to let you know that *{extraDays} extra days* have been added to your membership to make up for the sessions you may have missed.

Your current plan: *{membershipStartDate}* to *{membershipEndDate}*

We hope this gives you more time to enjoy your yoga journey with us. See you on the mat! 🧘‍♀️✨

Warm regards,
{studioName} 🙏

_This is an automated message. Reply STOP to opt-out._`,
    },
  ],
};

// Available placeholders for WhatsApp templates
export const WHATSAPP_PLACEHOLDERS = {
  member: [
    { key: '{memberName}', description: 'Member full name' },
    { key: '{memberFirstName}', description: 'Member first name' },
    { key: '{memberPhone}', description: 'Member phone number' },
    { key: '{memberEmail}', description: 'Member email' },
  ],
  subscription: [
    { key: '{planName}', description: 'Current plan name' },
    { key: '{startDate}', description: 'Subscription start date' },
    { key: '{expiryDate}', description: 'Subscription expiry date' },
    { key: '{daysRemaining}', description: 'Days until expiry' },
    { key: '{discountAmount}', description: 'Discount amount' },
    { key: '{payableAmount}', description: 'Total payable amount' },
    { key: '{currentDiscount}', description: 'Current subscription discount' },
    { key: '{discountPercent}', description: 'Discount percentage (e.g., 10%)' },
    { key: '{monthlyPlanPrice}', description: 'Active monthly plan price' },
    { key: '{quarterlyPlanPrice}', description: 'Active quarterly plan price' },
  ],
  class: [
    { key: '{classTime}', description: 'Session time' },
    { key: '{slotName}', description: 'Slot display name' },
    { key: '{classDate}', description: 'Class date' },
  ],
  payment: [
    { key: '{amount}', description: 'Payment amount' },
    { key: '{paymentDate}', description: 'Payment date' },
    { key: '{invoiceNumber}', description: 'Invoice number' },
    { key: '{planName}', description: 'Membership plan name' },
    { key: '{membershipStartDate}', description: 'Membership start date' },
    { key: '{membershipEndDate}', description: 'Membership end date' },
    { key: '{balanceAmount}', description: 'Outstanding balance' },
    { key: '{dueDate}', description: 'Payment due date' },
  ],
  lead: [
    { key: '{leadName}', description: 'Lead full name' },
    { key: '{leadPhone}', description: 'Lead phone number' },
    { key: '{registrationLink}', description: 'Registration completion link' },
  ],
  studio: [
    { key: '{studioName}', description: 'Studio name' },
    { key: '{studioPhone}', description: 'Studio phone' },
    { key: '{studioWebsite}', description: 'Studio website' },
    { key: '{googleReviewUrl}', description: 'Google review link' },
  ],
  holiday: [
    { key: '{nextHolidayName}', description: 'Name of next upcoming holiday' },
    { key: '{nextHolidayDate}', description: 'Date of next upcoming holiday' },
  ],
  general: [
    { key: '{extraDays}', description: 'Number of extra membership days added' },
    { key: '{membershipStartDate}', description: 'Current membership start date' },
    { key: '{membershipEndDate}', description: 'Current membership end date' },
  ],
};

// Common currency symbols for quick reference
export const CURRENCY_SYMBOLS = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
] as const;

// ============================================
// DEFAULT STUDIO SETTINGS
// ============================================

export const DEFAULT_STUDIO_SETTINGS: StudioSettings = {
  studioName: 'My Yoga Studio',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  workingHours: DEFAULT_WORKING_HOURS,
  termsAndConditions: `
# Terms and Conditions

1. **Membership**: All memberships are non-transferable and non-refundable.
2. **Cancellation**: Members may cancel their membership with 7 days notice.
3. **Conduct**: Members are expected to maintain respectful behavior towards instructors and other members.
4. **Property**: The studio is not responsible for any personal belongings left on premises.
5. **Sessions**: Sessions run Monday to Friday. Weekend and public holiday sessions are not included.
6. **Attendance**: Please arrive 10 minutes before your scheduled session.
7. **Health**: Members must inform instructors of any injuries or health conditions before class.
  `.trim(),
  healthDisclaimer: `
# Health & Medical Disclaimer

By participating in yoga classes at this studio, you acknowledge and agree to the following:

1. **Physical Activity**: Yoga involves physical activity that may be strenuous. You participate at your own risk.
2. **Medical Clearance**: You confirm that you are physically fit and have no medical conditions that would prevent your participation.
3. **Injuries**: You must inform the instructor of any injuries, surgeries, or medical conditions before each class.
4. **Pregnancy**: If pregnant, you must inform the instructor and have medical clearance to participate.
5. **Liability**: The studio and its instructors are not liable for any injuries sustained during classes.
6. **Emergency Contact**: You have provided accurate emergency contact information.

If you have any concerns about your ability to safely participate, please consult your physician before attending classes.
  `.trim(),
  renewalReminderDays: 7,
  classReminderHours: 24,
  taxRate: 0,
  invoicePrefix: 'INV',
  receiptPrefix: 'RCP',
  trialClassEnabled: true,
  maxTrialsPerPerson: 1,
  holidays: DEFAULT_INDIAN_HOLIDAYS,
  adminPassword: 'admin123',
  invoiceTemplate: DEFAULT_INVOICE_TEMPLATE,
  whatsappTemplates: DEFAULT_WHATSAPP_TEMPLATES,
};

// ============================================
// PAYMENT METHODS
// ============================================

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank-transfer', label: 'Bank Transfer' },
  { value: 'card', label: 'Card' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
] as const;

// ============================================
// STATUS OPTIONS
// ============================================

export const MEMBER_STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: 'green' },
  { value: 'inactive', label: 'Inactive', color: 'gray' },
  { value: 'trial', label: 'Trial', color: 'blue' },
  { value: 'expired', label: 'Expired', color: 'red' },
  { value: 'pending', label: 'Pending', color: 'yellow' },
] as const;

export const LEAD_STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'blue' },
  { value: 'contacted', label: 'Contacted', color: 'purple' },
  { value: 'trial-scheduled', label: 'Trial Scheduled', color: 'cyan' },
  { value: 'trial-completed', label: 'Trial Completed', color: 'teal' },
  { value: 'follow-up', label: 'Follow Up', color: 'yellow' },
  { value: 'interested', label: 'Interested', color: 'green' },
  { value: 'converted', label: 'Converted', color: 'emerald' },
  { value: 'not-interested', label: 'Not Interested', color: 'gray' },
  { value: 'lost', label: 'Lost', color: 'red' },
] as const;

export const LEAD_SOURCE_OPTIONS = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'walk-in', label: 'Walk-in' },
  { value: 'social-media', label: 'Social Media' },
  { value: 'advertisement', label: 'Advertisement' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'phone-inquiry', label: 'Phone Inquiry' },
  { value: 'other', label: 'Other' },
] as const;

export const SUBSCRIPTION_STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: 'green' },
  { value: 'expired', label: 'Expired', color: 'red' },
  { value: 'cancelled', label: 'Cancelled', color: 'gray' },
  { value: 'pending', label: 'Pending', color: 'yellow' },
  { value: 'suspended', label: 'Suspended', color: 'orange' },
] as const;

export const INVOICE_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'gray' },
  { value: 'sent', label: 'Sent', color: 'blue' },
  { value: 'paid', label: 'Paid', color: 'green' },
  { value: 'partially-paid', label: 'Partially Paid', color: 'yellow' },
  { value: 'overdue', label: 'Overdue', color: 'red' },
  { value: 'cancelled', label: 'Cancelled', color: 'gray' },
] as const;

// ============================================
// PRODUCT CATEGORIES
// ============================================

export const PRODUCT_CATEGORY_OPTIONS = [
  { value: 'yoga-equipment', label: 'Yoga Equipment' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'supplements', label: 'Supplements' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'books', label: 'Books' },
  { value: 'other', label: 'Other' },
] as const;

// ============================================
// EXPENSE CATEGORIES
// ============================================

export const EXPENSE_CATEGORY_OPTIONS = [
  { value: 'procurement', label: 'Procurement', color: 'blue' },
  { value: 'rent', label: 'Rent', color: 'purple' },
  { value: 'utilities', label: 'Utilities', color: 'cyan' },
  { value: 'salaries', label: 'Salaries', color: 'green' },
  { value: 'maintenance', label: 'Maintenance', color: 'orange' },
  { value: 'marketing', label: 'Marketing', color: 'pink' },
  { value: 'insurance', label: 'Insurance', color: 'indigo' },
  { value: 'professional-fees', label: 'Professional Fees', color: 'teal' },
  { value: 'equipment', label: 'Equipment', color: 'yellow' },
  { value: 'supplies', label: 'Supplies', color: 'lime' },
  { value: 'travel', label: 'Travel', color: 'amber' },
  { value: 'other', label: 'Other', color: 'gray' },
] as const;

export const EXPENSE_PAYMENT_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'yellow' },
  { value: 'paid', label: 'Paid', color: 'green' },
  { value: 'partial', label: 'Partial', color: 'blue' },
] as const;

export const INVENTORY_TRANSACTION_TYPE_OPTIONS = [
  { value: 'purchase', label: 'Purchase', color: 'green' },
  { value: 'sale', label: 'Sale', color: 'blue' },
  { value: 'consumed', label: 'Consumed', color: 'orange' },
  { value: 'adjustment', label: 'Adjustment', color: 'purple' },
  { value: 'returned', label: 'Returned', color: 'cyan' },
  { value: 'damaged', label: 'Damaged', color: 'red' },
  { value: 'initial', label: 'Initial Stock', color: 'gray' },
] as const;

// ============================================
// GENDER OPTIONS
// ============================================

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
] as const;

// ============================================
// SESSION TYPES
// ============================================

export const SESSION_TYPE_OPTIONS = [
  { value: 'offline', label: 'Offline (In-Studio)' },
  { value: 'online', label: 'Online' },
  { value: 'hybrid', label: 'Hybrid' },
] as const;

// ============================================
// DAYS OF WEEK
// ============================================

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
] as const;

// Working days (Monday to Friday)
export const WORKING_DAYS = [1, 2, 3, 4, 5];

// ============================================
// CURRENCY
// ============================================

export const CURRENCY_SYMBOL = '₹';
export const CURRENCY_CODE = 'INR';

export function formatCurrency(amount: number): string {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString('en-IN')}`;
}

// ============================================
// VALIDATION
// ============================================

export const VALIDATION = {
  phone: {
    pattern: /^[6-9]\d{9}$/,
    message: 'Please enter a valid 10-digit Indian mobile number',
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
  },
  name: {
    minLength: 2,
    maxLength: 50,
    message: 'Name must be between 2 and 50 characters',
  },
} as const;

// ============================================
// STORAGE KEYS
// ============================================

export const STORAGE_KEYS = {
  // Core entities
  MEMBERS: 'yoga_studio_members',
  LEADS: 'yoga_studio_leads',
  MEMBERSHIP_PLANS: 'yoga_studio_membership_plans',
  SUBSCRIPTIONS: 'yoga_studio_subscriptions',
  SESSION_SLOTS: 'yoga_studio_session_slots',
  SLOT_SUBSCRIPTIONS: 'yoga_studio_slot_subscriptions',
  INVOICES: 'yoga_studio_invoices',
  PAYMENTS: 'yoga_studio_payments',
  TRIAL_BOOKINGS: 'yoga_studio_trial_bookings',
  ATTENDANCE: 'yoga_studio_attendance',
  ATTENDANCE_LOCKS: 'yoga_studio_attendance_locks',
  NOTIFICATION_LOGS: 'yoga_studio_notification_logs',

  // Inventory & Expenses
  PRODUCTS: 'yoga_studio_products',
  INVENTORY_TRANSACTIONS: 'yoga_studio_inventory_transactions',
  EXPENSES: 'yoga_studio_expenses',

  // Session Planning
  ASANAS: 'yoga_studio_asanas',
  SESSION_PLANS: 'yoga_studio_session_plans',
  SESSION_PLAN_ALLOCATIONS: 'yoga_studio_session_plan_allocations',
  SESSION_EXECUTIONS: 'yoga_studio_session_executions',

  // Settings & Auth
  SETTINGS: 'yoga_studio_settings',
  AUTH: 'yoga_studio_auth',
  MEMBER_AUTH: 'yoga_studio_member_auth',

  // Legacy (kept for backward compatibility)
  INSTRUCTORS: 'yoga_studio_instructors',
  CLASSES: 'yoga_studio_classes',
  SCHEDULES: 'yoga_studio_schedules',
  BOOKINGS: 'yoga_studio_bookings',
  TRIAL_REQUESTS: 'yoga_studio_trial_requests',
  NOTIFICATIONS: 'yoga_studio_notifications',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

// ============================================
// ATTENDANCE TRACKING START DATE
// ============================================
// Attendance records only exist from this date onwards.
// Used to clamp all attendance calculations so dates before this
// are not counted as "absent" (they simply weren't tracked).
export const ATTENDANCE_TRACKING_START_DATE = '2026-01-22';

// ============================================
// SESSION PLANNING - BODY AREA LABELS
// ============================================

export const BODY_AREA_LABELS: Record<BodyArea, string> = {
  spine: 'Spine',
  upper_back: 'Upper Back',
  lower_back: 'Lower Back',
  shoulders: 'Shoulders',
  chest: 'Chest',
  arms: 'Arms',
  wrists: 'Wrists',
  core: 'Core',
  hips: 'Hips',
  glutes: 'Glutes',
  groin: 'Groin',
  quadriceps: 'Quadriceps',
  hamstrings: 'Hamstrings',
  knees: 'Knees',
  calves: 'Calves',
  ankles: 'Ankles',
  feet: 'Feet',
  neck: 'Neck',
  respiratory: 'Respiratory System',
  nervous_system: 'Nervous System'
};

export const BODY_AREA_OPTIONS = [
  { value: 'spine' as BodyArea, label: 'Spine' },
  { value: 'upper_back' as BodyArea, label: 'Upper Back' },
  { value: 'lower_back' as BodyArea, label: 'Lower Back' },
  { value: 'shoulders' as BodyArea, label: 'Shoulders' },
  { value: 'chest' as BodyArea, label: 'Chest' },
  { value: 'arms' as BodyArea, label: 'Arms' },
  { value: 'wrists' as BodyArea, label: 'Wrists' },
  { value: 'core' as BodyArea, label: 'Core' },
  { value: 'hips' as BodyArea, label: 'Hips' },
  { value: 'glutes' as BodyArea, label: 'Glutes' },
  { value: 'groin' as BodyArea, label: 'Groin' },
  { value: 'quadriceps' as BodyArea, label: 'Quadriceps' },
  { value: 'hamstrings' as BodyArea, label: 'Hamstrings' },
  { value: 'knees' as BodyArea, label: 'Knees' },
  { value: 'calves' as BodyArea, label: 'Calves' },
  { value: 'ankles' as BodyArea, label: 'Ankles' },
  { value: 'feet' as BodyArea, label: 'Feet' },
  { value: 'neck' as BodyArea, label: 'Neck' },
  { value: 'respiratory' as BodyArea, label: 'Respiratory System' },
  { value: 'nervous_system' as BodyArea, label: 'Nervous System' },
] as const;

// ============================================
// SESSION PLANNING - DIFFICULTY LEVELS
// ============================================

export const DIFFICULTY_LEVEL_OPTIONS = [
  { value: 'beginner' as DifficultyLevel, label: 'Beginner', color: 'green' },
  { value: 'intermediate' as DifficultyLevel, label: 'Intermediate', color: 'yellow' },
  { value: 'advanced' as DifficultyLevel, label: 'Advanced', color: 'red' },
] as const;

// ============================================
// SESSION PLANNING - ASANA TYPES
// ============================================

export const ASANA_TYPE_OPTIONS = [
  { value: 'asana' as AsanaType, label: 'Asana', color: 'blue' },
  { value: 'pranayama' as AsanaType, label: 'Pranayama', color: 'purple' },
  { value: 'kriya' as AsanaType, label: 'Kriya', color: 'cyan' },
  { value: 'exercise' as AsanaType, label: 'Exercise', color: 'orange' },
  { value: 'relaxation' as AsanaType, label: 'Relaxation', color: 'green' },
  { value: 'vinyasa' as AsanaType, label: 'Vinyasa', color: 'pink' },
  { value: 'surya_namaskar' as AsanaType, label: 'Surya Namaskar', color: 'amber' },
] as const;

// ============================================
// SESSION PLANNING - INTENSITY LEVELS
// ============================================

export const INTENSITY_LEVEL_OPTIONS = [
  { value: 'low' as IntensityLevel, label: 'Low', color: 'green' },
  { value: 'medium' as IntensityLevel, label: 'Medium', color: 'yellow' },
  { value: 'high' as IntensityLevel, label: 'High', color: 'red' },
] as const;

// ============================================
// SESSION PLANNING - BREATHING CUES
// ============================================

export const BREATHING_CUE_OPTIONS = [
  { value: 'inhale' as BreathingCue, label: 'Inhale', color: 'blue' },
  { value: 'exhale' as BreathingCue, label: 'Exhale', color: 'purple' },
  { value: 'hold' as BreathingCue, label: 'Hold', color: 'orange' },
] as const;

// ============================================
// SESSION PLANNING - ALLOCATION STATUS
// ============================================

export const ALLOCATION_STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled', color: 'blue' },
  { value: 'executed', label: 'Executed', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'gray' },
] as const;
