/**
 * Validation Utility Functions
 */

import { VALIDATION } from '../constants';

// ============================================
// VALIDATION RESULT TYPE
// ============================================

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface FormErrors {
  [key: string]: string | undefined;
}

// ============================================
// BASIC VALIDATIONS
// ============================================

export function validateRequired(value: unknown, fieldName: string = 'This field'): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }
  if (typeof value === 'string' && value.trim() === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }
  return { isValid: true };
}

export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }
  if (!VALIDATION.email.pattern.test(email)) {
    return { isValid: false, error: VALIDATION.email.message };
  }
  return { isValid: true };
}

export function validatePhone(phone: string): ValidationResult {
  if (!phone) {
    return { isValid: false, error: 'Phone number is required' };
  }
  const cleaned = phone.replace(/\D/g, '');
  if (!VALIDATION.phone.pattern.test(cleaned)) {
    return { isValid: false, error: VALIDATION.phone.message };
  }
  return { isValid: true };
}

export function validateName(name: string, fieldName: string = 'Name'): ValidationResult {
  if (!name || name.trim().length < VALIDATION.name.minLength) {
    return { isValid: false, error: `${fieldName} must be at least ${VALIDATION.name.minLength} characters` };
  }
  if (name.length > VALIDATION.name.maxLength) {
    return { isValid: false, error: `${fieldName} must be less than ${VALIDATION.name.maxLength} characters` };
  }
  return { isValid: true };
}

// ============================================
// NUMBER VALIDATIONS
// ============================================

export function validatePositiveNumber(value: number, fieldName: string = 'Value'): ValidationResult {
  if (isNaN(value)) {
    return { isValid: false, error: `${fieldName} must be a number` };
  }
  if (value < 0) {
    return { isValid: false, error: `${fieldName} must be a positive number` };
  }
  return { isValid: true };
}

export function validateNumberRange(
  value: number,
  min: number,
  max: number,
  fieldName: string = 'Value'
): ValidationResult {
  if (isNaN(value)) {
    return { isValid: false, error: `${fieldName} must be a number` };
  }
  if (value < min || value > max) {
    return { isValid: false, error: `${fieldName} must be between ${min} and ${max}` };
  }
  return { isValid: true };
}

export function validateAge(age: number): ValidationResult {
  return validateNumberRange(age, 5, 100, 'Age');
}

// ============================================
// DATE VALIDATIONS
// ============================================

export function validateDate(dateString: string, fieldName: string = 'Date'): ValidationResult {
  if (!dateString) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return { isValid: false, error: `${fieldName} is not a valid date` };
  }
  return { isValid: true };
}

export function validateFutureDate(dateString: string, fieldName: string = 'Date'): ValidationResult {
  const dateResult = validateDate(dateString, fieldName);
  if (!dateResult.isValid) return dateResult;

  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (date < today) {
    return { isValid: false, error: `${fieldName} must be today or a future date` };
  }
  return { isValid: true };
}

export function validatePastDate(dateString: string, fieldName: string = 'Date'): ValidationResult {
  const dateResult = validateDate(dateString, fieldName);
  if (!dateResult.isValid) return dateResult;

  const date = new Date(dateString);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  if (date > today) {
    return { isValid: false, error: `${fieldName} must be today or a past date` };
  }
  return { isValid: true };
}

export function validateWorkingDay(dateString: string): ValidationResult {
  const dateResult = validateDate(dateString);
  if (!dateResult.isValid) return dateResult;

  const date = new Date(dateString);
  const dayOfWeek = date.getDay();

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { isValid: false, error: 'Sessions are only available Monday to Friday' };
  }
  return { isValid: true };
}

// ============================================
// CAPACITY VALIDATIONS
// ============================================

export function validateCapacity(capacity: number): ValidationResult {
  if (!Number.isInteger(capacity)) {
    return { isValid: false, error: 'Capacity must be a whole number' };
  }
  if (capacity < 1) {
    return { isValid: false, error: 'Capacity must be at least 1' };
  }
  if (capacity > 100) {
    return { isValid: false, error: 'Capacity cannot exceed 100' };
  }
  return { isValid: true };
}

// ============================================
// PRICE VALIDATIONS
// ============================================

export function validatePrice(price: number, fieldName: string = 'Price'): ValidationResult {
  if (isNaN(price)) {
    return { isValid: false, error: `${fieldName} must be a number` };
  }
  if (price < 0) {
    return { isValid: false, error: `${fieldName} cannot be negative` };
  }
  return { isValid: true };
}

export function validateDiscount(discount: number, maxAmount: number): ValidationResult {
  if (isNaN(discount)) {
    return { isValid: false, error: 'Discount must be a number' };
  }
  if (discount < 0) {
    return { isValid: false, error: 'Discount cannot be negative' };
  }
  if (discount > maxAmount) {
    return { isValid: false, error: `Discount cannot exceed ${maxAmount}` };
  }
  return { isValid: true };
}

// ============================================
// FORM VALIDATION HELPERS
// ============================================

export function validateForm<T extends Record<string, unknown>>(
  data: T,
  validations: { [K in keyof T]?: (value: T[K]) => ValidationResult }
): { isValid: boolean; errors: FormErrors } {
  const errors: FormErrors = {};
  let isValid = true;

  for (const [field, validate] of Object.entries(validations)) {
    if (validate) {
      const result = (validate as (value: unknown) => ValidationResult)(data[field as keyof T]);
      if (!result.isValid) {
        errors[field] = result.error;
        isValid = false;
      }
    }
  }

  return { isValid, errors };
}

// ============================================
// MEMBER FORM VALIDATION
// ============================================

export interface MemberFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  age?: number;
}

export function validateMemberForm(data: MemberFormData): { isValid: boolean; errors: FormErrors } {
  const errors: FormErrors = {};
  let isValid = true;

  // First Name
  const firstNameResult = validateName(data.firstName, 'First name');
  if (!firstNameResult.isValid) {
    errors.firstName = firstNameResult.error;
    isValid = false;
  }

  // Last Name
  const lastNameResult = validateName(data.lastName, 'Last name');
  if (!lastNameResult.isValid) {
    errors.lastName = lastNameResult.error;
    isValid = false;
  }

  // Email
  const emailResult = validateEmail(data.email);
  if (!emailResult.isValid) {
    errors.email = emailResult.error;
    isValid = false;
  }

  // Phone
  const phoneResult = validatePhone(data.phone);
  if (!phoneResult.isValid) {
    errors.phone = phoneResult.error;
    isValid = false;
  }

  // Age (optional but validate if provided)
  if (data.age !== undefined && data.age !== null) {
    const ageResult = validateAge(data.age);
    if (!ageResult.isValid) {
      errors.age = ageResult.error;
      isValid = false;
    }
  }

  return { isValid, errors };
}

// ============================================
// LEAD FORM VALIDATION
// ============================================

export interface LeadFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  termsAccepted: boolean;
  healthDisclaimerAccepted: boolean;
}

export function validateLeadForm(data: LeadFormData): { isValid: boolean; errors: FormErrors } {
  const memberResult = validateMemberForm(data);
  const errors = { ...memberResult.errors };
  let isValid = memberResult.isValid;

  // Terms acceptance
  if (!data.termsAccepted) {
    errors.termsAccepted = 'You must accept the terms and conditions';
    isValid = false;
  }

  // Health disclaimer acceptance
  if (!data.healthDisclaimerAccepted) {
    errors.healthDisclaimerAccepted = 'You must accept the health disclaimer';
    isValid = false;
  }

  return { isValid, errors };
}

// ============================================
// SUBSCRIPTION FORM VALIDATION
// ============================================

export interface SubscriptionFormData {
  memberId: string;
  planId: string;
  startDate: string;
  discountAmount?: number;
}

export function validateSubscriptionForm(
  data: SubscriptionFormData,
  planPrice: number
): { isValid: boolean; errors: FormErrors } {
  const errors: FormErrors = {};
  let isValid = true;

  // Member ID
  const memberResult = validateRequired(data.memberId, 'Member');
  if (!memberResult.isValid) {
    errors.memberId = memberResult.error;
    isValid = false;
  }

  // Plan ID
  const planResult = validateRequired(data.planId, 'Plan');
  if (!planResult.isValid) {
    errors.planId = planResult.error;
    isValid = false;
  }

  // Start Date
  const dateResult = validateFutureDate(data.startDate, 'Start date');
  if (!dateResult.isValid) {
    errors.startDate = dateResult.error;
    isValid = false;
  }

  // Discount (optional)
  if (data.discountAmount !== undefined && data.discountAmount > 0) {
    const discountResult = validateDiscount(data.discountAmount, planPrice);
    if (!discountResult.isValid) {
      errors.discountAmount = discountResult.error;
      isValid = false;
    }
  }

  return { isValid, errors };
}

// ============================================
// PAYMENT FORM VALIDATION
// ============================================

export interface PaymentFormData {
  invoiceId: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
}

export function validatePaymentForm(
  data: PaymentFormData,
  maxAmount: number
): { isValid: boolean; errors: FormErrors } {
  const errors: FormErrors = {};
  let isValid = true;

  // Invoice ID
  const invoiceResult = validateRequired(data.invoiceId, 'Invoice');
  if (!invoiceResult.isValid) {
    errors.invoiceId = invoiceResult.error;
    isValid = false;
  }

  // Amount
  const amountResult = validatePrice(data.amount, 'Amount');
  if (!amountResult.isValid) {
    errors.amount = amountResult.error;
    isValid = false;
  } else if (data.amount <= 0) {
    errors.amount = 'Amount must be greater than 0';
    isValid = false;
  } else if (data.amount > maxAmount) {
    errors.amount = `Amount cannot exceed pending amount (${maxAmount})`;
    isValid = false;
  }

  // Payment Method
  const methodResult = validateRequired(data.paymentMethod, 'Payment method');
  if (!methodResult.isValid) {
    errors.paymentMethod = methodResult.error;
    isValid = false;
  }

  // Payment Date
  const dateResult = validatePastDate(data.paymentDate, 'Payment date');
  if (!dateResult.isValid) {
    errors.paymentDate = dateResult.error;
    isValid = false;
  }

  return { isValid, errors };
}
