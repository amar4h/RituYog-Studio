/**
 * Zod Validation Schemas
 *
 * Centralized validation schemas for form inputs.
 * Usage: import schema, call schema.safeParse(data) or schema.parse(data).
 */

import { z } from 'zod';

// ============================================
// SHARED FIELD SCHEMAS
// ============================================

const phone = z.string().regex(/^[0-9]{10}$/, 'Phone must be 10 digits');
const email = z.string().email('Invalid email address');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

// ============================================
// MEMBER SCHEMA
// ============================================

export const memberSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: email,
  phone: phone,
  age: z.number().int().min(5, 'Age must be at least 5').max(120, 'Age must be at most 120').optional(),
  gender: z.enum(['male', 'female', 'other']),
  address: z.string().max(500).optional(),
  emergencyContact: z.object({
    name: z.string().min(1, 'Emergency contact name is required'),
    phone: phone,
    relationship: z.string().min(1, 'Relationship is required'),
  }).optional(),
});

export type MemberFormData = z.infer<typeof memberSchema>;

// ============================================
// LEAD SCHEMA
// ============================================

export const leadSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  phone: phone,
  source: z.enum(['walk-in', 'referral', 'online', 'lead-conversion', 'free-yoga-camp']),
  notes: z.string().max(1000).optional(),
});

export type LeadFormData = z.infer<typeof leadSchema>;

// ============================================
// SUBSCRIPTION SCHEMA
// ============================================

export const subscriptionSchema = z.object({
  memberId: z.string().min(1, 'Member is required'),
  planId: z.string().min(1, 'Plan is required'),
  slotId: z.string().min(1, 'Session slot is required'),
  startDate: isoDate,
  discount: z.number().min(0, 'Discount cannot be negative').default(0),
  discountReason: z.string().max(200).optional(),
}).refine(
  data => data.discount === 0 || (data.discountReason && data.discountReason.length > 0),
  { message: 'Discount reason is required when discount is applied', path: ['discountReason'] }
);

export type SubscriptionFormData = z.infer<typeof subscriptionSchema>;

// ============================================
// PAYMENT SCHEMA
// ============================================

export const paymentSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice is required'),
  amount: z.number().positive('Amount must be positive'),
  paymentDate: isoDate,
  paymentMethod: z.enum(['cash', 'upi', 'bank_transfer', 'card', 'cheque', 'other']),
  notes: z.string().max(500).optional(),
});

export type PaymentFormData = z.infer<typeof paymentSchema>;

// ============================================
// SETTINGS SCHEMAS
// ============================================

export const studioSettingsSchema = z.object({
  studioName: z.string().min(1, 'Studio name is required').max(200),
  address: z.string().max(500).optional(),
  phone: z.string().optional(),
  email: z.string().email().or(z.literal('')).optional(),
  website: z.string().url().or(z.literal('')).optional(),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(
  data => data.newPassword === data.confirmPassword,
  { message: 'Passwords do not match', path: ['confirmPassword'] }
);

// ============================================
// PRODUCT SCHEMA
// ============================================

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  sku: z.string().max(50).optional(),
  category: z.enum(['yoga_mat', 'yoga_block', 'yoga_strap', 'yoga_bolster', 'clothing', 'accessories', 'supplements', 'other']),
  sellingPrice: z.number().min(0, 'Price cannot be negative'),
  costPrice: z.number().min(0, 'Cost cannot be negative').optional(),
  description: z.string().max(1000).optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;

// ============================================
// EXPENSE SCHEMA
// ============================================

export const expenseSchema = z.object({
  vendor: z.string().min(1, 'Vendor is required').max(200),
  category: z.enum(['rent', 'utilities', 'equipment', 'marketing', 'salary', 'maintenance', 'supplies', 'insurance', 'taxes', 'other']),
  totalAmount: z.number().positive('Amount must be positive'),
  expenseDate: isoDate,
  description: z.string().max(1000).optional(),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;

// ============================================
// HELPER: Extract Zod errors into field map
// ============================================

export function getFieldErrors(result: { success: boolean; error?: { issues: readonly { path: PropertyKey[]; message: string }[] } }): Record<string, string> {
  if (result.success || !result.error) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.map(String).join('.');
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  return errors;
}
