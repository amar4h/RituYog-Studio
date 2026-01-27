# Plan: Fix Renewal Discount Type Preservation

## Problem Analysis

When renewing a membership, the discount from the previous subscription should carry over intelligently. Currently:

**Current Behavior (Bug):**
```typescript
// SubscriptionFormPage.tsx lines 79-85
const getInitialDiscount = () => {
  if (existingOrExpiredSubscription && existingOrExpiredSubscription.discountAmount > 0) {
    return {
      discountType: 'fixed' as 'fixed' | 'percentage',  // Always assumes FIXED
      discountValue: existingOrExpiredSubscription.discountAmount,  // Uses flat amount
      discountReason: existingOrExpiredSubscription.discountReason || '',
    };
  }
  // ...
};
```

**The Bug:**
1. User creates subscription with **20% discount** on Rs 2100 plan → `discountAmount: 420` stored
2. On renewal, code sets `discountType: 'fixed'` and `discountValue: 420`
3. If user selects a different/cheaper plan, validation fails: "Discount cannot exceed plan price"
4. Even if same plan, the **percentage context is lost** - user sees Rs 420 instead of 20%

**Root Cause:**
The `MembershipSubscription` type only stores `discountAmount` (flat Rupees), not whether the original discount was percentage-based or fixed.

---

## Solution

### Add `discountType` field to track how discount was originally applied

Store the discount type alongside the amount so renewals can intelligently reapply it.

---

## Implementation Plan

### Step 1: Update MembershipSubscription Type

**File:** [src/types/index.ts](src/types/index.ts) (line 178)

Add new field after `discountAmount`:
```typescript
export interface MembershipSubscription extends BaseEntity {
  // ... existing fields ...

  // Pricing
  originalAmount: number;
  discountAmount: number;
  discountType?: 'fixed' | 'percentage';  // NEW: Track how discount was applied
  discountPercentage?: number;            // NEW: Store original % if percentage-based
  discountReason?: string;
  payableAmount: number;

  // ... rest of fields ...
}
```

### Step 2: Update SubscriptionFormPage to Save Discount Type

**File:** [src/pages/admin/SubscriptionFormPage.tsx](src/pages/admin/SubscriptionFormPage.tsx)

In `handleSubmit()`, pass discount type info to service:
```typescript
// Around line 175, when calling createWithInvoice
const result = subscriptionService.createWithInvoice(
  formData.memberId,
  formData.planId,
  formData.slotId,
  formData.startDate,
  discountAmount,
  formData.discountReason,
  notes,
  formData.discountType,      // NEW: Pass discount type
  formData.discountType === 'percentage' ? formData.discountValue : undefined  // NEW: Pass % if applicable
);
```

### Step 3: Update createWithInvoice Service Method

**File:** [src/services/storage.ts](src/services/storage.ts) (around line 939)

Add parameters and store discount type:
```typescript
createWithInvoice: (
  memberId: string,
  planId: string,
  slotId: string,
  startDate: string,
  discountAmount: number = 0,
  discountReason?: string,
  notes?: string,
  discountType?: 'fixed' | 'percentage',      // NEW
  discountPercentage?: number                  // NEW
): { subscription: MembershipSubscription; invoice: Invoice; warning?: string } => {
  // ... existing code ...

  const subscription = subscriptionService.create({
    // ... existing fields ...
    discountAmount,
    discountType,           // NEW
    discountPercentage,     // NEW
    discountReason,
    // ...
  });
```

### Step 4: Fix getInitialDiscount for Renewals

**File:** [src/pages/admin/SubscriptionFormPage.tsx](src/pages/admin/SubscriptionFormPage.tsx) (lines 79-92)

Update to use stored discount type:
```typescript
const getInitialDiscount = () => {
  if (existingOrExpiredSubscription && existingOrExpiredSubscription.discountAmount > 0) {
    const prevSub = existingOrExpiredSubscription;

    // Use stored discount type if available, otherwise default to 'fixed'
    if (prevSub.discountType === 'percentage' && prevSub.discountPercentage) {
      return {
        discountType: 'percentage' as const,
        discountValue: prevSub.discountPercentage,  // Use original percentage
        discountReason: prevSub.discountReason || '',
      };
    }

    return {
      discountType: 'fixed' as const,
      discountValue: prevSub.discountAmount,  // Use flat amount
      discountReason: prevSub.discountReason || '',
    };
  }
  return {
    discountType: 'percentage' as 'fixed' | 'percentage',
    discountValue: 0,
    discountReason: '',
  };
};
```

### Step 5: Update PHP API Handler (if needed)

**File:** [api/endpoints/subscriptions.php](api/endpoints/subscriptions.php)

Ensure the new fields are handled in `transformToDb()` and `transformFromDb()`:
```php
protected function transformToDb(array $data): array {
    return [
        // ... existing mappings ...
        'discount_type' => $data['discountType'] ?? null,
        'discount_percentage' => $data['discountPercentage'] ?? null,
    ];
}

protected function transformFromDb(array $row): array {
    return [
        // ... existing mappings ...
        'discountType' => $row['discount_type'] ?? null,
        'discountPercentage' => isset($row['discount_percentage']) ? (float)$row['discount_percentage'] : null,
    ];
}
```

### Step 6: Add Database Columns

**SQL Migration:**
```sql
ALTER TABLE membership_subscriptions
ADD COLUMN discount_type ENUM('fixed', 'percentage') NULL AFTER discount_amount,
ADD COLUMN discount_percentage DECIMAL(5,2) NULL AFTER discount_type;
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `discountType` and `discountPercentage` to MembershipSubscription |
| `src/pages/admin/SubscriptionFormPage.tsx` | Update `getInitialDiscount()` and `handleSubmit()` |
| `src/services/storage.ts` | Update `createWithInvoice()` signature and implementation |
| `api/endpoints/subscriptions.php` | Add field mappings in transform methods |
| Database | Add `discount_type` and `discount_percentage` columns |

---

## Backward Compatibility

- Existing subscriptions without `discountType` will default to `'fixed'` behavior (current behavior)
- New subscriptions will store the type, enabling intelligent renewal
- No changes to Invoice structure needed (it already stores flat amount)

---

## Verification

1. **Create new subscription with % discount**: Verify `discountType: 'percentage'` and `discountPercentage` are saved
2. **Renew with same plan**: Percentage should auto-fill correctly (e.g., "20%" not "Rs 420")
3. **Renew with different plan**: Percentage recalculates to new plan price
4. **Create subscription with fixed discount**: Verify `discountType: 'fixed'` is saved
5. **Renew fixed discount**: Fixed amount carries over (with validation if exceeds new plan)
6. **Existing subscriptions**: Should still work (default to fixed behavior)
