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

## UX/Design Preferences

### Mobile-First Responsive Design
**All UI must be mobile-friendly.** When creating or modifying layouts:

1. **Grid layouts**: Use responsive breakpoints, never fixed columns on mobile
   - ❌ `grid-cols-3` (cramped on mobile)
   - ✅ `grid-cols-1 sm:grid-cols-2 md:grid-cols-3`

2. **Flex layouts**: Stack vertically on mobile, horizontal on larger screens
   - ❌ `flex justify-between` (items may overlap on mobile)
   - ✅ `flex flex-col sm:flex-row sm:justify-between gap-2`

3. **Touch targets**: Ensure adequate padding for touch (min 44px)
   - Use `p-3 sm:p-2` for interactive elements on mobile

4. **Date displays**: Prevent awkward line breaks
   - Wrap dates in `<span className="whitespace-nowrap">`

5. **Form inputs**: Stack on mobile, inline on desktop
   - `grid-cols-1 md:grid-cols-2` or `grid-cols-1 md:grid-cols-3`

6. **Buttons**: Full width on mobile when appropriate
   - Use `w-full sm:w-auto` for action buttons

7. **Text truncation**: Use `break-words` for long content areas

### Tailwind Breakpoints Reference
- `sm:` → 640px+ (large phones, small tablets)
- `md:` → 768px+ (tablets)
- `lg:` → 1024px+ (laptops, desktops)

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
- **Invoice/Receipt Number Generation**:
  - Continues from MAX existing number in database
  - Respects starting number from Settings (invoiceStartNumber, receiptStartNumber)
  - Format: `PREFIX-00001` (5-digit padded)
  - Backend: `api/endpoints/invoices.php` → `generateNumber()`
  - Backend: `api/endpoints/payments.php` → `generateReceiptNumber()`

### Dashboard
- **Page**: `/admin/dashboard` ([DashboardPage.tsx](src/pages/admin/DashboardPage.tsx))
- **Compact stat tiles**: Active Members, Pending Leads, Expiring Soon (with icons)
- **"This Month" tile**: Toggle visibility, shows both Invoices total and Payments received
- **Monthly Chart**: Dual-bar chart showing Invoices (blue) vs Payments (green) per month
  - Period options: 3M, 6M, 12M (configurable)
  - Toggle visibility with eye icon
- **Display preferences**: Configurable in Settings → Studio → Dashboard Preferences
  - `dashboardShowRevenue`: Default state for "This Month" tile (default: hidden)
  - `dashboardShowChart`: Default state for chart (default: shown)
- **Notification counts**: Synced with Notifications page, filters out renewed members

### Notifications
- **Page**: `/admin/notifications` ([NotificationsPage.tsx](src/pages/admin/NotificationsPage.tsx))
- **Renewal filtering**: Members who have renewed are automatically removed from expiring list
- Uses `subscriptionService.hasPendingRenewal()` to check for future subscriptions

### Tiered Data Loading (Performance Optimization)
Implemented to improve initial page load time in API mode.

**Problem**: Original `syncFromApi()` loaded ALL 12 endpoints on app start, blocking UI for 2-5 seconds.

**Solution**: Tiered loading strategy:
1. **Essential data on startup** (settings, slots, plans) - ~500ms
2. **Admin pages fetch their own data** fresh on each visit

**Key Functions** in `src/services/storage.ts`:
- `syncEssentialData()` - Loads only settings, slots, plans on app start
- `syncFeatureData(features: string[])` - Loads specific data types on demand

**Custom Hook** `src/hooks/useFreshData.ts`:
```typescript
const { isLoading } = useFreshData(['members', 'subscriptions']);
if (isLoading) return <PageLoading />;
```

**Data Requirements by Admin Page**:
| Page | Required Data |
|------|---------------|
| Dashboard | members, leads, subscriptions, invoices, payments |
| Members | members, subscriptions |
| Leads | leads |
| Attendance | members, subscriptions, attendance, attendance-locks |
| Invoices | invoices, members, subscriptions |
| Payments | payments, invoices, members |
| Notifications | members, leads, subscriptions, notification-logs |

**React Hooks Order Rule (Critical)**:
When using `useFreshData` with early return for loading state, ALL hooks (useState, useMemo, useCallback) MUST be called BEFORE the `if (isLoading) return <PageLoading />` check. This ensures hooks are called in the same order on every render.

```typescript
// CORRECT: All hooks before loading check
function MyPage() {
  const { isLoading } = useFreshData(['members']);
  const [state, setState] = useState(false);
  const memoValue = useMemo(() => computeValue(), [dep]);

  if (isLoading) return <PageLoading />;  // AFTER all hooks
  // ... render
}

// WRONG: Hooks after loading check causes React Error #310
function MyPage() {
  const { isLoading } = useFreshData(['members']);
  if (isLoading) return <PageLoading />;  // TOO EARLY!
  const [state, setState] = useState(false);  // ERROR: fewer hooks on re-render
}
```

**Files Modified**:
- `src/services/storage.ts` - Added `syncEssentialData()` and `syncFeatureData()`
- `src/App.tsx` - Uses `syncEssentialData()` instead of `syncFromApi()`
- `src/hooks/useFreshData.ts` - New hook for page-specific data loading
- Admin pages: DashboardPage, MemberListPage, LeadListPage, AttendancePage, InvoiceListPage, PaymentListPage, NotificationsPage

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
- `StudioSettings` - Includes:
  - `invoicePrefix`, `receiptPrefix`, `invoiceStartNumber`, `receiptStartNumber`
  - `dashboardShowRevenue`, `dashboardShowChart` (display preferences)
  - `whatsappTemplates` (WhatsAppTemplates type)

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
- `SettingsPage.tsx` - Studio settings (tabbed interface):
  - **Studio**: Name, address, logo, Dashboard Preferences
  - **Memberships**: Plan management (create/edit/deactivate)
  - **Invoices**: Numbering settings, PDF template config
  - **WhatsApp**: Message templates for notifications
  - **Holidays**: Studio closure dates
  - **Legal**: Terms & conditions, health disclaimer
  - **Security**: Password change, data export/import

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

### RFS (Ready for Staging) Environment
Separate test environment for validating changes before production.

**RFS Site**: `https://darkslategrey-oryx-397719.hostingersite.com`
**Database**: `u429905972_test_yoga`

**Local Files**:
- `.env.rfs` - RFS build configuration (API URL, API key)
- `rfs-setup/.env` - Server-side DB credentials (upload to `public_html/api/.env`)

**Build & Deploy to RFS**:
```bash
npm run build:rfs
# Upload dist/* to RFS public_html/
```

**RFS Setup Checklist** (one-time):
1. Create Hostinger website for RFS
2. Create MySQL database
3. Upload `api/` folder to `public_html/api/`
4. Upload `rfs-setup/.env` as `public_html/api/.env`
5. Run `database/schema.sql` in phpMyAdmin
6. Build with `npm run build:rfs`
7. Upload `dist/*` to `public_html/`

**API .env format** (for `api/.env`):
```
DB_HOST=localhost
DB_NAME=database_name
DB_USER=database_user
DB_PASSWORD=database_password
API_KEY=64_char_hex_key
```

**Important**: Key is `DB_PASSWORD` not `DB_PASS` (config.php line 45).

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

### Invoice Creation "Database error occurred"
**Problem**: Creating a subscription shows invoice PDF but fails to save with "Database error occurred".
**Root Cause**: Race condition - invoice API call arrives before subscription is created in DB, causing FK constraint violation on `subscription_id`.
**Solution** in `api/endpoints/invoices.php`:
```php
// Check if subscription exists before setting FK
if (!empty($data['subscriptionId'])) {
    $stmt = $this->db->prepare("SELECT id FROM membership_subscriptions WHERE id = :id");
    $stmt->execute(['id' => $data['subscriptionId']]);
    if (!$stmt->fetch()) {
        // Subscription doesn't exist yet, set to null to avoid FK constraint error
        $data['subscriptionId'] = null;
    }
}
```
**Remember**: When creating related entities concurrently, check FK existence and gracefully handle missing references.

### Invoice Numbers Not Sequential (Skipping Numbers)
**Problem**: Invoice numbers jump (e.g., INV-00028 after INV-01028) or don't use starting number from settings.
**Root Cause**: Original code used `invoices.length + 1` instead of finding actual MAX number.
**Solution**: Query for MAX existing number and compare with starting number:
```php
// Find highest existing number
$maxNum = (int) ($result['max_num'] ?? 0);
// Next = max(highest, startNumber-1) + 1
$nextNumber = max($maxNum, $startNumber - 1) + 1;
```
**Files fixed**:
- `src/services/storage.ts` → `invoiceService.generateInvoiceNumber()`
- `api/endpoints/invoices.php` → `generateNumber()`
- `api/endpoints/payments.php` → `generateReceiptNumber()`
**Remember**: Number generation must find actual MAX, not count records.

## Deployment Environments

### Three-Tier Setup

| Environment | Storage | Database | Git Branch | Build Command |
|-------------|---------|----------|------------|---------------|
| **Development** | localStorage | None | `rfs` | `npm run dev` |
| **RFS/Test** | MySQL API | `yoga_test` on Hostinger | `rfs` | `npm run build:rfs` |
| **Production** | MySQL API | `yoga` on Hostinger | `main` | `npm run build` |

### Environment Files

| File | Purpose | Used By |
|------|---------|---------|
| `.env` | Default (no API mode) | `npm run dev` |
| `.env.rfs` | RFS site URL + API key | `npm run build:rfs` |
| `.env.production` | Production site URL + API key | `npm run build` |
| `api/.env` | DB credentials (on each Hostinger site) | PHP API |

### Workflow

1. **Develop**: Work on `rfs` branch, run `npm run dev` (localStorage)
2. **Test on RFS**: Run `npm run build:rfs`, deploy to RFS Hostinger site
3. **Production**: Merge `rfs` → `main`, run `npm run build`, deploy to production site

### Key Rules

- **Never deploy directly to production** - always test on RFS first
- **RFS and Production are separate Hostinger websites** with separate databases
- **Local development uses localStorage** - no database connection needed
- **Each environment has its own API key** - don't mix them

## Related Repositories
- **Monorepo**: `c:\Working\YogaStudio\` - Contains this app at `apps/admin/` plus static website at `apps/website/`

---

## Planned Feature: Yoga Session Planning, Execution & Analytics

**Full Implementation Plan**: [docs/session-planning-plan.md](docs/session-planning-plan.md)

### Overview
A structured system for defining reusable yoga session plans, allocating them to classes, tracking execution history, and generating analytics on asanas, body areas, and benefits.

### Core Concept (Data Flow)
```
Asana (Master Data)
       ↓
Session Plan Sections (5 fixed sections)
       ↓
Session Plan (Reusable template)
       ↓
Session Execution (Immutable historical record with attendance)
       ↓
Reports & Analytics
```

### Fixed 5-Section Structure (Non-Negotiable)
1. **WARM_UP** - Warm Up
2. **SURYA_NAMASKARA** - Surya Namaskara
3. **ASANA_SEQUENCE** - Main Asana Sequence
4. **PRANAYAMA** - Pranayama
5. **SHAVASANA** - Shavasana

### Key Entities

| Entity | Purpose | Storage Key |
|--------|---------|-------------|
| `Asana` | Master data (poses, pranayama, kriyas) | `yoga_studio_asanas` |
| `SessionPlan` | Reusable template with 5 sections | `yoga_studio_session_plans` |
| `SessionPlanAllocation` | Pre-schedule plan to slot+date | `yoga_studio_session_plan_allocations` |
| `SessionExecution` | Immutable record of conducted class | `yoga_studio_session_executions` |

### Body Areas (Controlled Vocabulary)
```typescript
const BODY_AREAS = [
  'spine', 'shoulders', 'hips', 'knees', 'hamstrings',
  'calves', 'ankles', 'core', 'neck', 'respiratory', 'nervous_system'
] as const;
```

### Asana Types
```typescript
const ASANA_TYPES = ['asana', 'pranayama', 'kriya', 'exercise', 'relaxation'] as const;
```

### Key Design Decisions

1. **Snapshot Approach for Versioning**: SessionExecution stores `sectionsSnapshot` - full plan data at execution time (matches Invoice.items pattern). No complex FK versioning needed.

2. **Attendance Integration**: When recording execution, `memberIds[]` auto-populated from attendance records for that slot+date.

3. **Duplicate Prevention**: Unique constraint on `slot_id + date` in executions table.

4. **Overuse Warning**: Warns if plan used in last 3 days OR 5+ times in last 30 days.

5. **Hybrid Data Seeding**: Pre-seed ~50 asanas from [alexcumplido/yoga-api](https://github.com/alexcumplido/yoga-api), enriched with body areas. Pranayama/kriyas added manually.

### Enhancements Beyond Original Spec
1. ✅ Session Allocation (pre-scheduling with bulk "Apply to all slots")
2. ✅ Duplicate Execution Prevention
3. ✅ Plan Description/Notes Field
4. ✅ Explicit Order in SectionItem (robust drag-and-drop)
5. ✅ Overuse Warning System
6. ✅ Session Plan Clone
7. ✅ Attendance Integration (auto-link members to executions)

### New Services (to add to `src/services/storage.ts`)
- `asanaService` - CRUD for asana master data
- `sessionPlanService` - CRUD + `clone()` + `getOveruseWarning()`
- `sessionPlanAllocationService` - `allocate()`, `allocateToAllSlots()`, `cancel()`, `markExecuted()`
- `sessionExecutionService` - Create with snapshot + attendance integration (immutable)
- `sessionAnalyticsService` - Computed reports from execution history

### New Pages (in `src/pages/admin/session-planning/`)
| Route | Page | Purpose |
|-------|------|---------|
| `/admin/asanas` | AsanaListPage | List/manage asanas |
| `/admin/asanas/new`, `/admin/asanas/:id` | AsanaFormPage | Create/edit asana |
| `/admin/session-plans` | SessionPlanListPage | List with Clone button |
| `/admin/session-plans/new`, `/admin/session-plans/:id/edit` | SessionPlanFormPage | Builder with 5 sections |
| `/admin/session-plans/:id` | SessionPlanDetailPage | Read-only view |
| `/admin/session-allocations` | SessionAllocationPage | Allocate plans to slots/dates |
| `/admin/session-executions` | SessionExecutionListPage | List with attendee count |
| `/admin/session-executions/record` | RecordExecutionPage | Record with attendance preview |
| `/admin/session-reports` | SessionReportsPage | Analytics dashboard |

### Sidebar Navigation (after "Attendance")
```tsx
<SidebarSection title="Session Planning">
  <SidebarLink to="/admin/asanas" icon={BookOpen}>Asanas</SidebarLink>
  <SidebarLink to="/admin/session-plans" icon={Layout}>Session Plans</SidebarLink>
  <SidebarLink to="/admin/session-allocations" icon={Calendar}>Allocations</SidebarLink>
  <SidebarLink to="/admin/session-executions" icon={CheckCircle}>Executions</SidebarLink>
  <SidebarLink to="/admin/session-reports" icon={BarChart}>Reports</SidebarLink>
</SidebarSection>
```

### Implementation Phases
1. **Phase 1**: Foundation (Types, Constants, Asana Service + Pages)
2. **Phase 2**: Session Plans (Builder + Clone + Overuse Warning)
3. **Phase 3**: Session Allocation (with bulk assign)
4. **Phase 4**: Execution Tracking (with Attendance Integration)
5. **Phase 5**: Reports & Analytics
6. **Phase 6**: Seed Data (Hybrid API + Manual)
7. **Phase 7**: Database & API (Post-MVP)

### NOT in Scope
- Instructor feedback
- Injury-aware planning
- AI-based plan suggestions
- Custom sections (fixed 5 only)
- Free-text body areas (controlled vocabulary only)
- Recurring allocation templates
