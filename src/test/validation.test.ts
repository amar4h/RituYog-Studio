import { describe, it, expect } from 'vitest';
import {
  memberSchema,
  leadSchema,
  subscriptionSchema,
  paymentSchema,
  passwordChangeSchema,
  getFieldErrors,
} from '../utils/validation';

describe('memberSchema', () => {
  const validMember = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '9876543210',
    gender: 'male' as const,
  };

  it('accepts valid data', () => {
    const result = memberSchema.safeParse(validMember);
    expect(result.success).toBe(true);
  });

  it('rejects empty firstName', () => {
    const result = memberSchema.safeParse({ ...validMember, firstName: '' });
    expect(result.success).toBe(false);
    const errors = getFieldErrors(result);
    expect(errors['firstName']).toBeDefined();
  });

  it('rejects invalid phone', () => {
    const result = memberSchema.safeParse({ ...validMember, phone: '123' });
    expect(result.success).toBe(false);
    const errors = getFieldErrors(result);
    expect(errors['phone']).toBeDefined();
  });

  it('rejects invalid email', () => {
    const result = memberSchema.safeParse({ ...validMember, email: 'notanemail' });
    expect(result.success).toBe(false);
  });

  it('accepts valid age range', () => {
    const result = memberSchema.safeParse({ ...validMember, age: 30 });
    expect(result.success).toBe(true);
  });

  it('rejects age below 5', () => {
    const result = memberSchema.safeParse({ ...validMember, age: 3 });
    expect(result.success).toBe(false);
  });
});

describe('leadSchema', () => {
  it('accepts valid lead', () => {
    const result = leadSchema.safeParse({
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '9876543210',
      source: 'walk-in',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid source', () => {
    const result = leadSchema.safeParse({
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '9876543210',
      source: 'invalid',
    });
    expect(result.success).toBe(false);
  });
});

describe('subscriptionSchema', () => {
  it('requires discount reason when discount > 0', () => {
    const result = subscriptionSchema.safeParse({
      memberId: 'id-1',
      planId: 'plan-1',
      slotId: 'slot-1',
      startDate: '2026-01-01',
      discount: 500,
      discountReason: '',
    });
    expect(result.success).toBe(false);
  });

  it('passes without discount reason when discount is 0', () => {
    const result = subscriptionSchema.safeParse({
      memberId: 'id-1',
      planId: 'plan-1',
      slotId: 'slot-1',
      startDate: '2026-01-01',
      discount: 0,
    });
    expect(result.success).toBe(true);
  });
});

describe('paymentSchema', () => {
  it('rejects non-positive amount', () => {
    const result = paymentSchema.safeParse({
      invoiceId: 'inv-1',
      amount: 0,
      paymentDate: '2026-01-01',
      paymentMethod: 'cash',
    });
    expect(result.success).toBe(false);
  });
});

describe('passwordChangeSchema', () => {
  it('rejects mismatched passwords', () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: 'old123',
      newPassword: 'newpass1',
      confirmPassword: 'newpass2',
    });
    expect(result.success).toBe(false);
    const errors = getFieldErrors(result);
    expect(errors['confirmPassword']).toBe('Passwords do not match');
  });

  it('rejects short new password', () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: 'old123',
      newPassword: '12345',
      confirmPassword: '12345',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid password change', () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: 'old123',
      newPassword: 'newpass1',
      confirmPassword: 'newpass1',
    });
    expect(result.success).toBe(true);
  });
});
