# Member Portal - Implementation Plan

## Context

Members currently receive their session reports (attendance, asanas, body areas, benefits) only when the admin generates and shares them via WhatsApp. This plan adds a **Member Portal** where members can log in with phone + password and view their own reports on-demand. Phase 2 (product browsing & ordering) is out of scope but the design accommodates it.

---

## Architecture Decisions

1. **Separate `MemberAuthContext`** — Parallel to existing admin `AuthContext` (`src/contexts/AuthContext.tsx`). Independent auth domains using separate localStorage keys and DB session tables. No changes to admin auth.

2. **Login via phone + password** — Phone is the identifier. Admin sets initial password from MemberDetailPage. Member can change it from portal settings.

3. **Password hashing** — localStorage mode: SHA-256 via Web Crypto API (dev-only). API mode: PHP `password_hash()`/`password_verify()` with bcrypt.

4. **Reports as interactive HTML** — Renders `MemberReportData` / `BatchReportData` (from `src/utils/memberReportImage.ts`) as responsive React components. Reuses existing `sessionAnalyticsService.getMemberSessionReport()` and `getBatchSessionReport()` for data. "Download as Image" button calls existing `downloadMemberReportAsJPG()` / `downloadBatchReportAsJPG()`.

5. **Mobile-first layout** — Bottom nav bar (Home, My Report, Batch, Settings), `max-w-lg` container, no sidebar.

---

## Phase A: Foundation — Types, Constants, Auth Service

### A1. Add `passwordHash` to Member type
**File:** `src/types/index.ts`
- Add `passwordHash?: string` to `Member` interface

### A2. Add storage key
**File:** `src/constants/index.ts`
- Add `MEMBER_AUTH: 'yoga_studio_member_auth'` to `STORAGE_KEYS`

### A3. Add `memberAuthService` to storage.ts
**File:** `src/services/storage.ts`
- `hashPassword(password)` — SHA-256 via Web Crypto API
- `setPassword(memberId, password)` — hash and save to member's `passwordHash`
- `login(phone, password)` — find member by phone, verify hash, store auth state in `MEMBER_AUTH` localStorage key
- `logout()` — clear `MEMBER_AUTH`
- `isAuthenticated()` / `getAuthenticatedMemberId()`
- `changePassword(memberId, currentPassword, newPassword)`
- `adminResetPassword(memberId, newPassword)` — no current password needed
- Async variants for API mode delegating to `memberAuthApi`

### A4. Add `memberAuthApi`
**File:** `src/services/api.ts`
- `login(phone, password)` — POST `member-auth?action=login` (skipAuth: true)
- `setPassword(memberId, passwordHash)` — POST `member-auth?action=setPassword`
- `changePassword(memberId, currentPassword, newPassword)` — POST (skipAuth: true)

### A5. PHP backend endpoint
**New file:** `api/endpoints/member-auth.php`
- Class `MemberAuthHandler`
- `login()` — find member by phone, `password_verify()`, create session in `member_sessions` table
- `setPassword()` — admin-only, stores bcrypt hash
- `changePassword()` — verifies old password first
- `check()` / `logout()`

### A6. Database migration
**New file:** `database/migration/member-portal.sql`
```sql
ALTER TABLE members ADD COLUMN password_hash VARCHAR(255) NULL;

CREATE TABLE member_sessions (
    id VARCHAR(36) PRIMARY KEY,
    member_id VARCHAR(36) NOT NULL,
    session_token VARCHAR(128) NOT NULL UNIQUE,
    login_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    INDEX idx_token (session_token),
    INDEX idx_expires (expires_at)
);
```

### A7. Register endpoint
**File:** `api/index.php`
- Add `'member-auth'` to `$validEndpoints`
- Add public actions: `['login', 'changePassword', 'check', 'logout']`

### A8. Export
**File:** `src/services/index.ts` — export `memberAuthService`

---

## Phase B: Auth Context & Protected Route

### B1. MemberAuthContext
**New file:** `src/contexts/MemberAuthContext.tsx`
- Mirrors pattern in `src/contexts/AuthContext.tsx`
- Interface: `{ isAuthenticated, memberId, member, isLoading, login, logout }`
- On mount: checks `MEMBER_AUTH` in localStorage, loads member by ID

### B2. useMemberAuth hook
**New file:** `src/hooks/useMemberAuth.ts`
- Same pattern as `src/hooks/useAuth.ts`

### B3. MemberProtectedRoute
**New file:** `src/router/MemberProtectedRoute.tsx`
- Mirrors `src/router/ProtectedRoute.tsx`
- Uses `useMemberAuth()`, redirects to `/member/login`

### B4. Wire up in App.tsx
**File:** `src/App.tsx`
- Add `<MemberAuthProvider>` inside `<AuthProvider>`

---

## Phase C: Member Layout & Login

### C1. MemberLayout
**New file:** `src/components/layout/MemberLayout.tsx`
- `min-h-screen bg-gray-50`, content in `max-w-lg mx-auto px-4 py-4`
- `<MemberHeader />` sticky top, `<MemberBottomNav />` fixed bottom
- `<Outlet />` with `pb-20` bottom padding

### C2. MemberHeader
**New file:** `src/components/layout/MemberHeader.tsx`
- Sticky `h-14` white header: studio logo + member first name + logout icon

### C3. MemberBottomNav
**New file:** `src/components/layout/MemberBottomNav.tsx`
- Fixed bottom bar, 4 tabs: Home, My Report, Batch, Settings
- Active tab highlighted, min 44px touch targets

### C4. MemberLoginPage
**New file:** `src/pages/member/MemberLoginPage.tsx`
- Studio branding (logo + name)
- Phone number + password inputs
- "Member Login" title
- Error display, on success navigate to `/member`

---

## Phase D: Routes

### D1. Add member routes
**File:** `src/router/routes.tsx`
- Lazy imports for 5 member pages
- `/member/login` — public route
- `/member/*` — protected by `MemberProtectedRoute`, wrapped in `MemberLayout`:
  - `/member` → MemberHomePage
  - `/member/my-report` → MemberReportPage
  - `/member/batch-report` → BatchReportPage
  - `/member/settings` → MemberSettingsPage

---

## Phase E: Member Portal Pages

### E1. MemberHomePage
**New file:** `src/pages/member/MemberHomePage.tsx`
- Welcome "Hi, {firstName}!"
- Subscription card: plan name, slot display name, start/end dates, days remaining
- This month stats: sessions attended / working days, attendance rate %
- Quick-nav cards → "My Report" and "Batch Report"
- `useFreshData(['members', 'subscriptions', 'attendance'])`

### E2. ReportCard component
**New file:** `src/components/member/ReportCard.tsx`
- Renders `MemberReportData` or `BatchReportData` as responsive HTML
- Stat tiles grid, Practices list with count badges, Body Areas as CSS bars, Benefits as badge row
- Member type includes "What You Missed" amber section
- "Download as Image" button

### E3. MemberReportPage
**New file:** `src/pages/member/MemberReportPage.tsx`
- Period selector (reuse presets from `src/utils/reportPeriods.ts`)
- Calls `sessionAnalyticsService.getMemberSessionReport(memberId, slotId, start, end)`
- Renders `<ReportCard type="member" />`

### E4. BatchReportPage
**New file:** `src/pages/member/BatchReportPage.tsx`
- Auto-selects member's assigned slot
- Period selector, calls `sessionAnalyticsService.getBatchSessionReport(slotId, start, end)`
- Renders `<ReportCard type="batch" />`

### E5. MemberSettingsPage
**New file:** `src/pages/member/MemberSettingsPage.tsx`
- Change Password form (current, new, confirm)
- Profile info (read-only): name, phone, email, slot
- Logout button

---

## Phase F: Admin Password Management

### F1. Add to MemberDetailPage
**File:** `src/pages/admin/MemberDetailPage.tsx`
- "Set Portal Password" / "Reset Password" button
- Modal with password + confirm fields
- Calls `memberAuthService.adminResetPassword(memberId, password)`
- Success message showing phone number

---

## Files Summary

**New files (14):**

| File | Purpose |
|------|---------|
| `src/contexts/MemberAuthContext.tsx` | Auth context & provider |
| `src/hooks/useMemberAuth.ts` | Auth hook |
| `src/router/MemberProtectedRoute.tsx` | Route guard |
| `src/components/layout/MemberLayout.tsx` | Portal layout |
| `src/components/layout/MemberHeader.tsx` | Header |
| `src/components/layout/MemberBottomNav.tsx` | Bottom navigation |
| `src/components/member/ReportCard.tsx` | Report HTML renderer |
| `src/pages/member/MemberLoginPage.tsx` | Login page |
| `src/pages/member/MemberHomePage.tsx` | Dashboard |
| `src/pages/member/MemberReportPage.tsx` | Personal report |
| `src/pages/member/BatchReportPage.tsx` | Batch report |
| `src/pages/member/MemberSettingsPage.tsx` | Settings & password |
| `api/endpoints/member-auth.php` | PHP auth endpoint |
| `database/migration/member-portal.sql` | DB migration |

**Modified files (8):**

| File | Changes |
|------|---------|
| `src/types/index.ts` | Add `passwordHash` to Member |
| `src/constants/index.ts` | Add `MEMBER_AUTH` key |
| `src/services/storage.ts` | Add `memberAuthService` |
| `src/services/api.ts` | Add `memberAuthApi` |
| `src/services/index.ts` | Export new service |
| `src/router/routes.tsx` | Add member routes |
| `src/App.tsx` | Add `MemberAuthProvider` |
| `src/pages/admin/MemberDetailPage.tsx` | Password set/reset UI |

**PHP (modify):** `api/index.php` — register endpoint

---

## Verification

1. **Dev (localStorage):** `npm run dev` → admin creates member → sets portal password from MemberDetailPage → go to `/member/login` → log in with phone + password → verify Home, My Report, Batch Report pages load with correct data
2. **Build:** `npm run build` succeeds
3. **Auth isolation:** Admin and member logins are independent — logging out of one doesn't affect the other
4. **Report accuracy:** Compare portal report data with admin SessionReportsPage for same member/period
5. **Mobile UX:** Test on mobile viewport — bottom nav, touch targets, responsive layout
6. **Password change:** Member changes password from Settings → old password rejected → new one works
