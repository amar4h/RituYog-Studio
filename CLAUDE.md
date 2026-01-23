# YogaStudioMgmt - Project Context

## Project Overview
A Yoga Studio Management application built with React + TypeScript + Vite. Uses localStorage for data persistence (Supabase integration available but not active).

## Tech Stack
- **Frontend**: React 18, TypeScript, Vite 7.x
- **Styling**: Tailwind CSS
- **Routing**: React Router v6 (lazy-loaded routes)
- **State**: React Query (@tanstack/react-query)
- **Storage**: localStorage (with service layer pattern)
- **PDF Generation**: jsPDF with html2canvas

## Key Architecture

### Data Storage
- All data stored in localStorage with keys prefixed `yoga_studio_*`
- Services in `src/services/storage.ts` provide CRUD operations
- Seed data auto-initializes on first load (controlled by `yoga_studio_seed_initialized` flag)

### Session Slots
4 default time slots (defined in `src/constants/index.ts`):
- Morning 7:30 AM (slot-0730)
- Morning 8:45 AM (slot-0845)
- Late Morning 10:00 AM (slot-1000)
- Evening 7:30 PM (slot-1930)

Each slot has:
- `capacity`: Normal capacity (default 10)
- `exceptionCapacity`: Extra capacity for special cases (default 1)

### Membership Plans
- Monthly (1 month, Rs 2100)
- Quarterly (3 months, Rs 5500)
- Semi-Annual (6 months, Rs 10000)

### Member Sources
- walk-in, referral, online, lead-conversion, free-yoga-camp

### Member Flow
1. Lead created (from website, referral, free yoga camp, etc.)
2. Lead books trial session
3. Admin converts lead to member
4. Subscription created with slot assignment
5. Invoice auto-generated
6. Attendance tracked daily

## Key Features Implemented

### Attendance Tracking
- **Page**: `/admin/attendance` ([AttendancePage.tsx](src/pages/admin/AttendancePage.tsx))
- **Tile-based UI**: Red = not marked, Green = marked present
- **Period selection**: Defaults to current month, customizable date range
- **Auto-increment**: `classesAttended` counter updates when marking present
- **Working days calculation**: Only counts Mon-Fri within subscription period
- **Date restrictions**:
  - Future dates blocked (date picker has max=today, next button disabled)
  - Only current day and up to 3 previous days are editable
- **Lock/Unlock system** (per-slot, not per-day):
  - Each session slot has independent lock state
  - Toggle: 🔒/🔓 button next to date (locks current selected slot only)
  - Default: today = unlocked, past 1-3 days = locked
  - **Database**: `attendance_locks` table with composite key `(date, slot_id)`
  - **API endpoint**: `api/endpoints/attendance-locks.php`
  - **Frontend service**: `attendanceLockService` in `src/services/storage.ts`
  - **localStorage key format**: `"date:slotId"` (e.g., `"2026-01-23:slot-0730"`)
  - Locked tiles show small 🔒 icon in corner (no dimming)
  - Functions require both `date` and `slotId` parameters:
    - `isLocked(date, slotId)`
    - `setLocked(date, slotId, locked)`
    - `toggleLock(date, slotId)`
    - `getEffectiveLockState(date, slotId)`
    - `canMarkAttendance(date, slotId)`

### Logo & Navigation
- **Sidebar logo**: Clickable → opens studio website in same tab (configurable in Settings → Website URL)
- **Header link**: "Studio App Home" → navigates to public home page
- **Public pages**: "Studio App Home" buttons on Register/Book Trial success pages

### Lead Management
- Converted leads (status='converted') are filtered out of Leads list page
- Uses `leadService.getUnconverted()` at service layer

### Capacity Management
- Slots have normal + exception capacity
- UI warns when using exception capacity
- Prevents overbooking with validation in `subscriptionService.checkSlotCapacity()`

### Invoice/PDF Generation
- Invoices generated with subscriptions
- PDF export with Rs symbol support (uses Noto Sans font)
- Located in `src/pages/admin/InvoiceDetailPage.tsx`

## Important Files

### Services (`src/services/`)
- `storage.ts` - All localStorage CRUD operations and business logic
- `index.ts` - Re-exports all services

### Key Services
- `memberService` - Member CRUD
- `leadService` - Lead management, conversion to member, `getUnconverted()` for filtered list
- `subscriptionService` - Subscription creation, capacity checks
- `attendanceService` - Attendance marking, summaries
- `attendanceLockService` - Per-slot lock/unlock for attendance editing (requires date + slotId)
- `slotService` - Session slot management
- `invoiceService` / `paymentService` - Billing
- `settingsService` - Studio settings including website URL

### Types (`src/types/index.ts`)
All TypeScript interfaces defined here including:
- `Member`, `Lead`, `MembershipPlan`, `MembershipSubscription`
- `SessionSlot`, `Invoice`, `Payment`
- `AttendanceRecord`, `AttendanceStatus`, `MemberAttendanceSummary`
- `AttendanceLockRecord` - Per-day lock state for attendance

### Constants (`src/constants/index.ts`)
- `STORAGE_KEYS` - localStorage key names
- `DEFAULT_SESSION_SLOTS` - Slot configurations
- `DEFAULT_MEMBERSHIP_PLANS` - Plan configurations
- `SLOT_IDS` - Reference IDs for slots

### Pages (`src/pages/admin/`)
- `DashboardPage.tsx` - Overview stats
- `MemberListPage.tsx` / `MemberDetailPage.tsx` / `MemberFormPage.tsx`
- `LeadListPage.tsx` / `LeadDetailPage.tsx`
- `AttendancePage.tsx` - Attendance marking with tile grid
- `SessionsPage.tsx` - Slot management
- `SubscriptionListPage.tsx` / `SubscriptionFormPage.tsx`
- `InvoiceListPage.tsx` / `InvoiceDetailPage.tsx`
- `PaymentListPage.tsx` / `RecordPaymentPage.tsx`
- `SettingsPage.tsx` - Studio settings

### Components
- `src/components/common/` - Reusable UI (Card, Button, Modal, Alert, etc.)
- `src/components/common/SlotSelector.tsx` - Slot picker with variants: `tiles`, `cards`, `pills`
- `src/components/attendance/MemberAttendanceTile.tsx` - Attendance tile component
- `src/components/layout/` - AdminLayout, Sidebar, Header

### Form Page Layouts
- **MemberFormPage**: 2-column layout on desktop
  - Left: Basic Info, Emergency Contact
  - Right: Health Info, Member Source, Consent, Submit buttons
- **SubscriptionFormPage**: 3-column grid (2 left + 1 right sticky)
  - Left: Member & Dates, Plan tiles (2x2), Session slots (4-across), Discount
  - Right: Summary card (sticky), Submit buttons

## Seed Data
On first load, `seedDemoData()` creates:
- 12 sample members (3 per slot)
- Subscriptions starting 15 days ago
- Random attendance history (~70-90% rate)
- 2 sample leads

To reset: Run in browser console:
```javascript
localStorage.clear()
location.reload()
```

## Running the App
```bash
npm run dev    # Development server (usually http://localhost:5173)
npm run build  # Production build
```

## Common Tasks

### Add a new page
1. Create page in `src/pages/admin/`
2. Add lazy import in `src/router/routes.tsx`
3. Add route definition
4. Add sidebar link in `src/components/layout/Sidebar.tsx`

### Add a new service method
1. Add to appropriate service in `src/services/storage.ts`
2. Export from `src/services/index.ts` if new service

### Modify types
1. Update `src/types/index.ts`
2. Update any affected services/components

## Currency
All prices in Indian Rupees (Rs/INR). Format using `formatCurrency()` from `src/utils/formatUtils.ts`.

## Date Handling
- Uses `date-fns` library
- Dates stored as ISO strings (YYYY-MM-DD)
- Utilities in `src/utils/dateUtils.ts`
- Working days = Monday-Friday only

## Member Fields
- `age` - Numeric age (not date of birth)
- `gender` - male, female, other
- `emergencyContact` - name, phone, relationship
- `medicalConditions` - array of conditions with details
- `consentRecords` - terms-conditions, health-disclaimer (photo-consent removed from new member form)

## Deployment (Hostinger)

### Production Environment
- **Frontend**: `dist/` → `public_html/`
- **Backend API**: `api/` → `public_html/api/`
- **Config**: `.env.production` (local build-time), `api/.env` (server-side)

### Key Files for Deployment
- `.env.production` - Contains `VITE_STORAGE_MODE=api` (used during build)
- `api/.env` - Database credentials (must exist on server)
- `api/index.php` - Main router
- `api/endpoints/*.php` - API handlers

### Deployment Checklist
1. Run `npm run build` locally
2. Upload `dist/*` to `public_html/`
3. Upload `api/*` to `public_html/api/`
4. Ensure `api/.env` exists with correct DB credentials
5. Run any new SQL migrations in phpMyAdmin

## Common Issues & Fixes

### API Endpoint "Handler class not found"
**Problem**: Hyphenated endpoint names like `attendance-locks` fail because PHP class names can't have hyphens.
**Root Cause**: Original code used `ucfirst($endpoint) . 'Handler'` which produced invalid class name `Attendance-locksHandler`.
**Solution**: Router converts hyphens to PascalCase (`attendance-locks` → `AttendanceLocksHandler`).
**Fixed Code** in `api/index.php` line 98:
```php
$handlerClass = str_replace('-', '', ucwords($endpoint, '-')) . 'Handler';
```
**Remember**: When adding new hyphenated endpoints, the PHP class must be PascalCase (e.g., `attendance-locks.php` contains `class AttendanceLocksHandler`).

### PHP Column Name Mismatch (camelCase vs snake_case)
**Problem**: PHP fetches database columns in snake_case (`is_locked`) but code tries to access camelCase (`isLocked`).
**Root Cause**: When using custom queries that bypass `transformFromDb()`, column names remain in snake_case.
**Solution**: Use snake_case directly when reading from database:
```php
// WRONG: $record['isLocked']
// CORRECT: $record['is_locked']
$result[$record['date']] = (bool) $record['is_locked'];
```
**Remember**: The `transformFromDb()` method in BaseHandler converts snake_case to camelCase, but custom queries bypass this.

### Lock Not Persisting Across Devices
**Problem**: Lock state only saved in localStorage, not synced to database.
**Root Cause**: Original implementation was localStorage-only.
**Solution** (implemented in order):
1. Create `attendance_locks` table in MySQL with composite key `(date, slot_id)`
2. Add `api/endpoints/attendance-locks.php` handler with `getAll()` and `setLock()` methods
3. Add `'attendance-locks'` to `$validEndpoints` array in `api/index.php`
4. Update `attendanceLockService.setLocked()` in `storage.ts` to call API when `isApiMode()` is true
5. Update `syncFromApi()` to fetch attendance locks on app startup
**Remember**: Any new feature requiring cross-device sync needs both localStorage (for immediate UI) AND API sync.

### Lock Applies to All Slots (Wrong Granularity)
**Problem**: Locking one session locks ALL sessions for that day.
**Root Cause**: Original design used only `date` as key, not `date + slotId`.
**Solution**:
1. Database: Composite primary key `PRIMARY KEY (date, slot_id)`
2. localStorage: Key format `"date:slotId"` (e.g., `"2026-01-23:slot-0730"`)
3. All service functions updated to require both parameters:
   - `isLocked(date, slotId)` - not `isLocked(date)`
   - `setLocked(date, slotId, locked)` - not `setLocked(date, locked)`
   - `toggleLock(date, slotId)` - not `toggleLock(date)`
   - `canMarkAttendance(date, slotId)` - not `canMarkAttendance(date)`
4. AttendancePage.tsx updated to pass `selectedSlotId` to all lock functions
**Remember**: When the user says "per session" or "per batch", they mean per-slot, not per-day.

### UI Not Updating After Toggle (Stale Build)
**Problem**: Lock toggle doesn't visually update the UI.
**Root Cause**: Old JavaScript in deployed build, not the latest code with API sync.
**Solution**: Always rebuild (`npm run build`) and upload fresh `dist/` folder after code changes.
**Remember**: Changes to `src/` files require rebuild. Just uploading PHP files won't update the frontend.

### Toggle Lock Not Working for Past Days (Default State Bug)
**Problem**: Clicking lock/unlock on past days (1-3 days ago) doesn't change the state - UI stays locked.
**Root Cause**: `toggleLock()` used `isLocked()` which only returns `true` if the key explicitly exists in localStorage. For past days, the lock state is `true` by default (via `getDefaultLockState()`), but no key exists yet.
- `isLocked("2026-01-22", "slot-0730")` → returns `false` (no key exists)
- `getEffectiveLockState("2026-01-22", "slot-0730")` → returns `true` (default for past days)
- Result: `toggleLock` reads `false`, sets to `true` → no visible change!
**Solution** in `storage.ts`:
```typescript
// WRONG: Uses isLocked which ignores defaults
toggleLock: (date, slotId) => {
  const currentState = attendanceLockService.isLocked(date, slotId);
  // ...
}

// CORRECT: Uses getEffectiveLockState which includes defaults
toggleLock: (date, slotId) => {
  const currentState = attendanceLockService.getEffectiveLockState(date, slotId);
  // ...
}
```
**Remember**: When checking "current state" for toggling, always use `getEffectiveLockState()` (includes defaults), not `isLocked()` (only explicit values).

## Related Repositories
- **Monorepo**: `c:\Working\YogaStudio\` - Contains this app at `apps/admin/` plus static website at `apps/website/`
