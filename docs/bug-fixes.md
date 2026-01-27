# Bug Fixes Backlog

Planned bug fixes to be implemented later. Each bug includes problem analysis and solution approach.

---

## BUG-001: Renewal Discount Type Not Preserved

**Status:** Fixed
**Priority:** Medium
**Reported:** 2026-01-27
**Fixed:** 2026-01-27

### Problem
When renewing a membership, percentage-based discounts are converted to fixed amounts, causing validation errors if the new plan price differs.

### Root Cause
`MembershipSubscription` only stores `discountAmount` (flat Rupees), not whether it was originally percentage-based or fixed.

### Solution
Added `discountType` and `discountPercentage` fields to subscription model.

### Files Modified
- `src/types/index.ts` - Added `discountType` and `discountPercentage` to MembershipSubscription
- `src/pages/admin/SubscriptionFormPage.tsx` - Updated `getInitialDiscount()` and `handleSubmit()`
- `src/services/storage.ts` - Updated `createWithInvoice()` signature and implementation

### Database Migration Required
Run this SQL on both RFS and Production databases:
```sql
ALTER TABLE membership_subscriptions
ADD COLUMN discount_type ENUM('fixed', 'percentage') NULL AFTER discount_amount,
ADD COLUMN discount_percentage DECIMAL(5,2) NULL AFTER discount_type;
```

---

## BUG-002: This Month Tile Overflow on Mobile

**Status:** Fixed
**Priority:** Low
**Reported:** 2026-01-27
**Fixed:** 2026-01-27

### Problem
On mobile devices, the "This Month" tile on the Dashboard overflows its container. The text "Invoices:" and "Received:" labels make the content too wide.

### Solution
Removed the "Invoices:" and "Received:" text labels. Now uses only colored dots as indicators:
- Blue dot = Invoices total
- Green dot = Payments received

### Files Modified
- `src/pages/admin/DashboardPage.tsx` (lines 241-251)

---

## BUG-003: Page Not Scrolled to Top After Trial Booking / Registration

**Status:** Fixed
**Priority:** Low
**Reported:** 2026-01-27
**Fixed:** 2026-01-27

### Problem
When clicking "Studio App Home" button after completing trial booking or registration, the home page loads but scroll position is not at the top.

### Solution
Added `useEffect` with `window.scrollTo(0, 0)` on HomePage mount.

### Files Modified
- `src/pages/public/HomePage.tsx` - Added scroll to top on mount

---

## BUG-004: Add RFS Environment Indicator in Header

**Status:** Fixed
**Priority:** Medium
**Reported:** 2026-01-27
**Fixed:** 2026-01-27

### Problem
No visual indication to distinguish RFS (test) environment from production.

### Solution
Added `VITE_ENV_LABEL` environment variable and orange badge in header.

### Files Modified
- `.env.rfs` - Added `VITE_ENV_LABEL=RFS`
- `src/components/layout/Header.tsx` - Added environment badge display

---

## BUG-005: Bell Icon Should Link to Notifications and Show Badge

**Status:** Fixed
**Priority:** Medium
**Reported:** 2026-01-27
**Fixed:** 2026-01-27

### Problem
The bell icon in the header did not navigate to Notifications page and did not show notification count.

### Solution
1. Changed bell icon button to Link navigating to `/admin/notifications`
2. Added notification count calculation (expiring memberships + pending leads older than 2 days)
3. Added red badge showing count (displays "9+" if count exceeds 9)

### Files Modified
- `src/components/layout/Header.tsx` - Added Link, useMemo for count, and badge

---

## BUG-006: WhatsApp Icon Not Visible on Invoice Page (Mobile)

**Status:** Fixed
**Priority:** Medium
**Reported:** 2026-01-27
**Fixed:** 2026-01-27

### Problem
On mobile devices, WhatsApp icon was not visible on Invoice detail page until after visiting Payment page.

### Root Cause
InvoiceDetailPage was not using `useFreshData` hook, so member data wasn't loaded from API when navigating directly to the page.

### Solution
Added `useFreshData(['invoices', 'members', 'subscriptions', 'payments'])` to InvoiceDetailPage with loading state.

### Files Modified
- `src/pages/admin/InvoiceDetailPage.tsx` - Added useFreshData hook and PageLoading

---

## BUG-007: Payment List Not Refreshing After Delete

**Status:** Fixed
**Priority:** Medium
**Reported:** 2026-01-27
**Fixed:** 2026-01-27

### Problem
After deleting a payment on the Payment List page, the deleted payment continued to display in the list until manual page refresh.

### Root Cause
PaymentListPage had state for `allPayments` but didn't refresh the state after delete/edit operations. The useEffect only ran on mount, not after data changes.

### Solution
1. Added `refreshKey` state variable
2. Updated useEffect to depend on `refreshKey`
3. Increment `refreshKey` after successful edit or delete operations
4. For API mode, re-fetch data from server after changes

### Files Modified
- `src/pages/admin/PaymentListPage.tsx` - Added refreshKey pattern for data refresh

---

## BUG-008: Full Payment Shows as Partial Payment on Invoice

**Status:** Fixed
**Priority:** High
**Reported:** 2026-01-27
**Fixed:** 2026-01-27

### Problem
When recording a full payment for an invoice, the invoice status remained "partially-paid" instead of changing to "paid".

### Root Cause
API returns numeric fields as strings. The comparison `totalPaid >= invoice.totalAmount` failed because JavaScript string comparison doesn't work as expected (e.g., `"2100" >= 2100` may evaluate incorrectly).

### Solution
Wrap all invoice amount values with `Number()` to ensure numeric comparison:
```typescript
// Before (broken)
const totalPaid = (invoice.amountPaid || 0) + amount;
const newStatus = totalPaid >= invoice.totalAmount ? 'paid' : 'partially-paid';

// After (fixed)
const totalPaid = Number(invoice.amountPaid || 0) + amount;
const invoiceTotal = Number(invoice.totalAmount || 0);
const newStatus = totalPaid >= invoiceTotal ? 'paid' : 'partially-paid';
```

### Files Modified
- `src/services/storage.ts` - Fixed `recordPayment()` (both sync and async versions)
- `src/pages/admin/PaymentListPage.tsx` - Fixed edit and delete handlers

### Related Pattern
This is the same issue as the revenue/stats concatenation bug. Always use `Number()` when dealing with values that may come from API as strings.

---

## Template for New Bugs

```markdown
## BUG-XXX: [Title]

**Status:** Planned | In Progress | Fixed
**Priority:** High | Medium | Low
**Reported:** YYYY-MM-DD

### Problem
[Describe the bug - what happens vs what should happen]

### Root Cause
[Why does this bug occur?]

### Solution
[Brief description of the fix]

### Files to Modify
- [List affected files]

### Notes
[Any additional context]
```
