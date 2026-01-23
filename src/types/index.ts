/**
 * Yoga Studio Management - Data Types
 * Phase 1: Core Operations
 */

// ============================================
// BASE TYPES
// ============================================

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// COMMON TYPES
// ============================================

export type SessionType = 'online' | 'offline' | 'hybrid';

export interface TimeSlot {
  start: string; // HH:mm format
  end: string;
}

export interface WeeklyAvailability {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

// ============================================
// MEDICAL & CONSENT
// ============================================

export interface MedicalCondition {
  condition: string;
  details?: string;
  reportedDate: string;
}

export interface ConsentRecord {
  type: 'terms-conditions' | 'health-disclaimer' | 'communication' | 'photo-consent';
  consentGiven: boolean;
  consentDate: string;
  version?: string;
}

// ============================================
// MEMBER
// ============================================

export type MemberStatus = 'active' | 'inactive' | 'trial' | 'expired' | 'pending';
export type MemberSource = 'walk-in' | 'referral' | 'online' | 'lead-conversion';

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship?: string;
}

export interface Member extends BaseEntity {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  whatsappNumber?: string;
  dateOfBirth?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  emergencyContact?: EmergencyContact;
  profilePhoto?: string;

  // Medical & Consent
  medicalConditions: MedicalCondition[];
  healthNotes?: string;
  consentRecords: ConsentRecord[];

  // Status & Source
  status: MemberStatus;
  source?: MemberSource;
  referredBy?: string;
  convertedFromLeadId?: string;

  // Slot Assignment (single slot per member)
  assignedSlotId?: string;

  // Attendance tracking
  classesAttended: number;

  // Notes
  notes?: string;

  // Legacy fields (kept for backward compatibility)
  membershipType?: 'trial' | 'monthly' | 'quarterly' | 'yearly' | 'drop-in';
  membershipStartDate?: string;
  membershipEndDate?: string;
  totalClassesAllowed?: number;
  classesRemaining?: number;
}

// ============================================
// SESSION SLOTS
// ============================================

export interface SessionSlot extends BaseEntity {
  startTime: string; // HH:mm format (e.g., '07:30')
  endTime: string; // HH:mm format (e.g., '08:30')
  displayName: string; // e.g., 'Morning 7:30 AM'
  capacity: number; // Regular capacity (default 10)
  exceptionCapacity: number; // Extra slots for admin override (default 1)
  sessionType: SessionType;
  isActive: boolean;
}

export interface SlotSubscription extends BaseEntity {
  memberId: string;
  slotId: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  isException: boolean; // Using exception capacity
  notes?: string;
}

export interface SlotAvailability {
  slotId: string;
  date: string; // YYYY-MM-DD
  regularBookings: number;
  exceptionBookings: number;
  trialBookings: number;
  totalCapacity: number;
  availableRegular: number;
  availableException: number;
  isFull: boolean;
}

// ============================================
// MEMBERSHIP PLANS
// ============================================

export type MembershipPlanType = 'trial' | 'monthly' | 'quarterly' | 'semi-annual' | 'yearly' | 'drop-in' | 'class-pack';

export interface MembershipPlan extends BaseEntity {
  name: string;
  type: MembershipPlanType;
  price: number;
  durationMonths: number; // duration in months (1 = monthly, 3 = quarterly, 6 = semi-annual)
  classesIncluded?: number; // for class-pack type
  description?: string;
  isActive: boolean;
  allowedSessionTypes: SessionType[];
  features?: string[];
}

// ============================================
// MEMBERSHIP SUBSCRIPTIONS
// ============================================

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'pending' | 'suspended' | 'scheduled';
export type PaymentStatus = 'pending' | 'partial' | 'paid';

export interface MembershipSubscription extends BaseEntity {
  memberId: string;
  planId: string;
  slotId: string; // Session slot linked to this subscription
  startDate: string;
  endDate: string;

  // Pricing
  originalAmount: number;
  discountAmount: number;
  discountReason?: string;
  payableAmount: number;

  // Status
  status: SubscriptionStatus;

  // Extension tracking
  isExtension: boolean;
  previousSubscriptionId?: string;
  extensionDays?: number;

  // Payment link
  invoiceId?: string;
  paymentStatus: PaymentStatus;

  // Extra days (for compensations, holidays, etc.)
  extraDays?: number;
  extraDaysReason?: string;

  notes?: string;
}

// ============================================
// LEAD / PROSPECT
// ============================================

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'trial-scheduled'
  | 'trial-completed'
  | 'follow-up'
  | 'interested'
  | 'negotiating'
  | 'converted'
  | 'not-interested'
  | 'lost';

export type LeadSource =
  | 'website'
  | 'referral'
  | 'walk-in'
  | 'social-media'
  | 'advertisement'
  | 'whatsapp'
  | 'phone-inquiry'
  | 'online'
  | 'other';

export interface Lead extends BaseEntity {
  // Personal info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  whatsappNumber?: string;
  dateOfBirth?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  address?: string;

  // Emergency contact
  emergencyContact?: string;
  emergencyPhone?: string;

  // Lead tracking
  status: LeadStatus;
  source: LeadSource;
  sourceDetails?: string;

  // Preferences
  preferredSlotId?: string;
  preferredSessionType?: SessionType;
  interestedPlanIds?: string[];
  hasYogaExperience?: boolean;

  // Medical/Consent
  medicalConditions: MedicalCondition[];
  healthNotes?: string;
  consentRecords: ConsentRecord[];

  // Trial booking
  trialDate?: string;
  trialSlotId?: string;
  trialStatus?: 'pending' | 'scheduled' | 'attended' | 'no-show' | 'cancelled';
  trialFeedback?: string;

  // Conversion
  convertedToMemberId?: string;
  conversionDate?: string;

  // Follow-up
  lastContactDate?: string;
  nextFollowUpDate?: string;
  followUpNotes?: string;

  notes?: string;
}

// ============================================
// TRIAL BOOKING
// ============================================

export type TrialBookingStatus = 'pending' | 'confirmed' | 'attended' | 'no-show' | 'cancelled';

export interface TrialBooking extends BaseEntity {
  leadId: string;
  slotId: string;
  date: string; // YYYY-MM-DD
  status: TrialBookingStatus;
  isException: boolean;
  confirmationSent: boolean;
  reminderSent: boolean;
  notes?: string;
}

// ============================================
// INVOICE
// ============================================

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partially-paid' | 'overdue' | 'cancelled';
export type InvoiceType = 'membership' | 'product-sale';

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice extends BaseEntity {
  invoiceNumber: string;
  invoiceType: InvoiceType;
  memberId: string;

  // Amounts
  amount: number;
  tax?: number;
  discount?: number;
  discountReason?: string;
  totalAmount: number;
  amountPaid: number;

  // Dates
  invoiceDate: string;
  dueDate: string;
  paidDate?: string;

  // Status
  status: InvoiceStatus;

  // Items
  items: InvoiceItem[];

  // Links
  subscriptionId?: string;

  // Payment info (legacy - prefer Payment entity)
  paymentMethod?: 'cash' | 'card' | 'upi' | 'bank-transfer' | 'cheque' | 'other';
  paymentReference?: string;

  notes?: string;
}

// ============================================
// PAYMENT
// ============================================

export type PaymentMethod = 'cash' | 'upi' | 'bank-transfer' | 'card' | 'cheque' | 'other';
export type PaymentRecordStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';

export interface Payment extends BaseEntity {
  invoiceId: string;
  memberId: string;

  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;

  // Transaction details
  transactionReference?: string;
  bankDetails?: string;

  status: PaymentRecordStatus;

  // Receipt
  receiptNumber?: string;

  notes?: string;
  recordedBy?: string;
}

// ============================================
// WHATSAPP MESSAGE TEMPLATES
// ============================================

export type NotificationType = 'renewal-reminder' | 'class-reminder' | 'payment-confirmation' | 'lead-followup';

export interface WhatsAppMessageTemplate {
  name: string;
  template: string; // With placeholders like {memberName}, {expiryDate}
}

export interface WhatsAppTemplates {
  renewalReminders: WhatsAppMessageTemplate[];  // Array of templates (3 options)
  classReminder: WhatsAppMessageTemplate;
  paymentConfirmation: WhatsAppMessageTemplate;
  leadFollowUps: WhatsAppMessageTemplate[];  // Array of templates (2 options)
}

// ============================================
// INVOICE TEMPLATE
// ============================================

export interface InvoiceTemplate {
  showLogo: boolean;
  showStudioAddress: boolean;
  showStudioPhone: boolean;
  showStudioEmail: boolean;
  headerText?: string; // Custom header text (e.g., "TAX INVOICE")
  footerText?: string; // Custom footer text (e.g., "Thank you for your business!")
  termsText?: string; // Terms & conditions on invoice
  notes?: string; // Default notes
  accentColor: string; // Hex color for accents (default: #4F46E5 - indigo)
  currencySymbol: string; // Currency symbol (default: ₹)
  // Payment QR code
  showPaymentQR: boolean; // Whether to display payment QR code
  paymentQRData?: string; // Base64 encoded QR code image data
  paymentQRLabel?: string; // Label to display under QR code (e.g., "Scan to Pay")
}

// ============================================
// STUDIO SETTINGS
// ============================================

export interface Holiday {
  date: string; // YYYY-MM-DD format
  name: string;
  isRecurringYearly?: boolean; // For fixed-date holidays like Independence Day
}

export interface StudioSettings {
  studioName: string;
  logoUrl?: string;
  logoData?: string; // Base64 encoded image data for uploaded logo
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  whatsappBusinessNumber?: string;

  // Currency & Timezone
  currency: string;
  timezone: string;

  // Working hours
  workingHours: WeeklyAvailability;

  // Legal
  termsAndConditions: string;
  healthDisclaimer: string;

  // Reminders
  renewalReminderDays: number;
  classReminderHours: number;

  // Billing
  taxRate?: number;
  invoicePrefix: string;
  receiptPrefix: string;
  invoiceStartNumber?: number;
  receiptStartNumber?: number;

  // Trial settings
  trialClassEnabled: boolean;
  maxTrialsPerPerson: number;

  // Holidays (studio closed)
  holidays: Holiday[];

  // Auth
  adminPassword?: string;

  // Invoice Template
  invoiceTemplate?: InvoiceTemplate;

  // WhatsApp Message Templates
  whatsappTemplates?: WhatsAppTemplates;
}

// ============================================
// DASHBOARD STATS
// ============================================

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  trialMembers: number;
  expiringThisWeek: number;
  newMembersThisMonth: number;

  totalLeads: number;
  pendingLeads: number;

  classesToday: number;
  bookingsToday: number;

  revenueThisMonth: number;
  pendingPayments: number;

  slotUtilization: {
    slotId: string;
    slotName: string;
    subscribedCount: number;
    capacity: number;
    utilizationPercent: number;
  }[];
}

// ============================================
// FILTERS
// ============================================

export interface MemberFilters {
  search?: string;
  status?: MemberStatus;
  slotId?: string;
}

export interface LeadFilters {
  search?: string;
  status?: LeadStatus;
  source?: LeadSource;
  dateFrom?: string;
  dateTo?: string;
}

export interface SubscriptionFilters {
  memberId?: string;
  planId?: string;
  status?: SubscriptionStatus;
  expiringInDays?: number;
}

export interface InvoiceFilters {
  memberId?: string;
  status?: InvoiceStatus;
  invoiceType?: InvoiceType;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaymentFilters {
  memberId?: string;
  invoiceId?: string;
  status?: PaymentRecordStatus;
  method?: PaymentMethod;
  dateFrom?: string;
  dateTo?: string;
}

// ============================================
// LEGACY TYPES (kept for backward compatibility)
// ============================================

export interface Instructor extends BaseEntity {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  whatsappNumber?: string;
  specializations: string[];
  bio?: string;
  profilePhoto?: string;
  status: 'active' | 'inactive';
  hourlyRate?: number;
  availability: WeeklyAvailability;
}

export interface YogaClass extends BaseEntity {
  name: string;
  description?: string;
  instructorId: string;
  type: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'all-levels';
  duration: number;
  maxCapacity: number;
  room?: string;
  isRecurring: boolean;
  recurringPattern?: RecurringPattern;
  status: 'active' | 'cancelled' | 'completed';
}

export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'monthly';
  daysOfWeek?: number[];
  dayOfMonth?: number;
  startDate: string;
  endDate?: string;
}

export interface ClassSchedule extends BaseEntity {
  classId: string;
  instructorId: string;
  date: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  currentBookings: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  notes?: string;
  substituteInstructorId?: string;
}

export interface Booking extends BaseEntity {
  memberId: string;
  scheduleId: string;
  bookingDate: string;
  status: 'confirmed' | 'cancelled' | 'attended' | 'no-show';
  isTrial: boolean;
  paymentStatus: 'paid' | 'pending' | 'waived';
  notes?: string;
  checkedInAt?: string;
}

export interface TrialRequest extends BaseEntity {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferredDate?: string;
  preferredClassType?: string;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'converted';
  notes?: string;
  assignedScheduleId?: string;
  convertedToMemberId?: string;
}

export interface NotificationLog extends BaseEntity {
  type: NotificationType;
  recipientType: 'member' | 'lead';
  recipientId: string;
  recipientName: string;
  recipientPhone: string;
  message: string;
  status: 'pending' | 'sent' | 'cancelled';
  sentAt?: string;
  // Legacy fields (kept for backward compatibility)
  memberId?: string;
  channel?: 'whatsapp' | 'email' | 'sms';
  error?: string;
}

export interface ClassFilters {
  search?: string;
  type?: string;
  level?: YogaClass['level'];
  instructorId?: string;
}

export interface BookingFilters {
  memberId?: string;
  scheduleId?: string;
  status?: Booking['status'];
  dateFrom?: string;
  dateTo?: string;
}

// ============================================
// ATTENDANCE
// ============================================

export type AttendanceStatus = 'present' | 'absent';

export interface AttendanceRecord extends BaseEntity {
  memberId: string;
  slotId: string;
  date: string;              // YYYY-MM-DD format
  status: AttendanceStatus;
  subscriptionId?: string;   // Link to active subscription at time of recording
  markedAt: string;          // ISO timestamp when attendance was marked
  notes?: string;
}

export interface MemberAttendanceSummary {
  memberId: string;
  memberName: string;
  presentDays: number;       // Days marked present in period
  totalWorkingDays: number;  // Working days when member had active subscription
  attendanceRate: number;    // Percentage (0-100)
}

// Attendance lock record - stores the locked state for a specific date
// Key format in storage: date string (YYYY-MM-DD) -> boolean (true = locked)
export interface AttendanceLockRecord {
  date: string;              // YYYY-MM-DD format
  isLocked: boolean;
  lockedAt?: string;         // ISO timestamp when lock state was changed
}
