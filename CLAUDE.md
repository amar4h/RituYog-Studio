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

### Member Flow
1. Lead created (from website, referral, etc.)
2. Lead books trial session
3. Admin converts lead to member
4. Subscription created with slot assignment
5. Invoice auto-generated
6. Attendance tracked daily

## Key Features Implemented

### Attendance Tracking (Recently Added)
- **Page**: `/admin/attendance` ([AttendancePage.tsx](src/pages/admin/AttendancePage.tsx))
- **Tile-based UI**: Red = not marked, Green = marked present
- **Period selection**: Defaults to current month, customizable date range
- **Auto-increment**: `classesAttended` counter updates when marking present
- **Working days calculation**: Only counts Mon-Fri within subscription period

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
- `leadService` - Lead management, conversion to member
- `subscriptionService` - Subscription creation, capacity checks
- `attendanceService` - Attendance marking, summaries
- `slotService` - Session slot management
- `invoiceService` / `paymentService` - Billing

### Types (`src/types/index.ts`)
All TypeScript interfaces defined here including:
- `Member`, `Lead`, `MembershipPlan`, `MembershipSubscription`
- `SessionSlot`, `Invoice`, `Payment`
- `AttendanceRecord`, `AttendanceStatus`, `MemberAttendanceSummary`

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
- `src/components/attendance/MemberAttendanceTile.tsx` - Attendance tile component
- `src/components/layout/` - AdminLayout, Sidebar, Header

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
