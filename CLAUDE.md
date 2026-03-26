# YogaStudioMgmt

Yoga Studio Management SaaS — React + TypeScript + Vite frontend, PHP API backend, MySQL database.
Deployed on Hostinger. Uses localStorage for dev, MySQL API for production.

## Tech Stack
- **Frontend**: React 19, TypeScript 5.9, Vite 7, Tailwind CSS v4
- **Routing**: React Router v7 (lazy-loaded routes)
- **State**: React Query (@tanstack/react-query)
- **Storage**: Dual-mode — localStorage (dev) or MySQL API (prod)
- **API**: PHP endpoints in `api/endpoints/`
- **PDF**: jsPDF + html2canvas
- **PWA**: vite-plugin-pwa (installable on mobile)
- **Testing**: Vitest (unit) + Playwright (E2E)

## Build Commands
```bash
npm run dev          # Dev server (localhost:5173, localStorage mode)
npm run build        # Production build → dist/
npm run build:rfs    # RFS/staging build → dist/
npm run test         # Unit tests
npm run e2e          # E2E tests (local)
npm run e2e:rfs      # E2E tests (remote RFS)
```

## Architecture

### Dual-Mode Storage (Core Pattern)
Every service works in both modes without code changes:
- `memberService.getAll()` → sync, reads localStorage
- `memberService.async.getAll()` → API call when `isApiMode()`, else sync
- Controlled by `VITE_STORAGE_MODE` env var

### Data Loading (useFreshData Hook)
Admin pages sync from API on mount. **Critical**: ALL hooks must be called BEFORE the loading check.
```typescript
function MyPage() {
  const { isLoading } = useFreshData(['members', 'subscriptions']);
  const [state, setState] = useState(false);  // BEFORE loading check
  if (isLoading) return <PageLoading />;       // AFTER all hooks
}
```

### Key Services (`src/services/storage/`)
| Service | Purpose |
|---------|---------|
| memberService | Member CRUD, search, status reconciliation |
| leadService | Lead management, conversion to member |
| subscriptionService | Subscriptions, capacity checks, renewals |
| attendanceService | Attendance marking, summaries, CSV export |
| attendanceLockService | Per-slot lock/unlock (composite key: date+slotId) |
| invoiceService / paymentService | Billing and payments |
| sessionPlanService | Session plan templates, clone, overuse warnings |
| sessionExecutionService | Immutable execution records with snapshots |
| asanaService | Yoga pose master data |
| productService / inventoryService | Inventory and stock management |
| expenseService | Expense tracking |
| settingsService | Studio configuration |

### Session Slots (5 default)
Morning 7:30 AM, Morning 8:45 AM, Late Morning 10:00 AM, Evening 7:30 PM, Online (Flexible)

### Membership Plans
Monthly (Rs 2100), Quarterly (Rs 5500), Semi-Annual (Rs 10000)

## Project Structure
```
src/
├── components/     # 49 reusable components (common/, layout/, attendance/, etc.)
├── pages/          # 52 pages across 3 portals
│   ├── admin/      # Admin dashboard, members, leads, billing, sessions, reports
│   ├── member/     # Member portal (attendance, membership, reports)
│   └── public/     # Home, login, register, book trial
├── services/       # 23 service files (dual-mode storage layer)
├── hooks/          # useFreshData, useAuth, useMemberAuth, useDebounce
├── types/          # All TypeScript interfaces (1061 lines)
├── constants/      # Storage keys, defaults, holidays, slot configs
├── contexts/       # AuthContext, MemberAuthContext
├── utils/          # Date, format, validation, PDF, image generation
└── router/         # Route definitions (lazy-loaded)
api/
├── endpoints/      # 27 PHP CRUD handlers
├── config.php      # DB connection, session duration, CORS
└── index.php       # Router (converts kebab-case to PascalCase handlers)
database/
├── schema.sql      # Full MySQL schema (14+ tables)
└── migrations/     # Sequential migration files
```

## Key Routes
| Route | Page | Data Required |
|-------|------|---------------|
| /admin/dashboard | DashboardPage | members, leads, subscriptions, invoices, payments |
| /admin/members | MemberListPage | members, subscriptions |
| /admin/attendance | AttendancePage | members, subscriptions, attendance, attendance-locks |
| /admin/session-plans | SessionPlanListPage | session-plans, asanas, session-executions |
| /admin/session-executions/record | RecordExecutionPage | session-plans, allocations, executions, attendance |
| /member | MemberHomePage | members, subscriptions, attendance |

## Adding New Features

### New Page
1. Create in `src/pages/admin/`
2. Add lazy import + route in `src/router/routes.tsx`
3. Add sidebar link in `src/components/layout/Sidebar.tsx`
4. Use `useFreshData()` with required data types

### New Service Method
1. Add to service in `src/services/storage/*.ts`
2. Add async counterpart if API mode needed
3. Export from `src/services/index.ts`

### New API Endpoint
1. Create `api/endpoints/{name}.php` with handler class (PascalCase)
2. Add to `$validEndpoints` in `api/index.php`
3. Create migration in `database/migrations/`

### New Type
1. Add to `src/types/index.ts`
2. Update affected services and components

## Currency & Dates
- All prices in Indian Rupees (Rs/INR). Use `formatCurrency()` from `src/utils/formatUtils.ts`
- Dates stored as ISO strings (YYYY-MM-DD). Uses `date-fns` library
- Working days = Mon-Fri only (unless marked as extra working day in Settings)

## Deployment
| Env | Build | Deploy Path | DB |
|-----|-------|-------------|-----|
| Dev | `npm run dev` | localhost | localStorage |
| RFS | `npm run build:rfs` | `public_html/rfs/` | u429905972_test_yoga |
| Prod | `npm run build` | `public_html/admin/` | u429905972_yoga |

**Never deploy directly to production** — always test on RFS first.

## Detailed Rules (auto-loaded by file pattern)
- `.claude/rules/ux-mobile-first.md` — Mobile responsive patterns for all UI
- `.claude/rules/api-endpoints.md` — PHP API conventions
- `.claude/rules/services-pattern.md` — Dual-mode service layer patterns
- `.claude/rules/testing.md` — Test standards and E2E rules
- `.claude/rules/deployment.md` — Deploy checklist and environments
- `.claude/rules/common-issues.md` — Known bugs and fixes

## Custom Commands
- `/build-deploy` — Build and show deploy instructions
- `/db-fix` — Generate SQL fix scripts
- `/audit-mobile` — Check a page for mobile issues
- `/new-page` — Scaffold a new admin page

## Session Planning (5-Section Structure)
Fixed sections: WARM_UP → SURYA_NAMASKARA → ASANA_SEQUENCE → PRANAYAMA → SHAVASANA
- Plans are reusable templates with asanas in each section
- Allocations pre-schedule plans to slots+dates
- Executions are immutable records with snapshot + attendance
- Overuse warning: used in last 3 days OR 5+ times in 30 days

## Attendance System
- Tile-based UI: Red=absent, Green=present (admin marks)
- Per-slot locks with composite key (date:slotId)
- Editable window: today + 3 days back
- Members can view (not mark) via portal calendar
- `classesAttended` auto-increments when marking present

## Member Portal
- Login via phone + password (supports family members on same phone)
- Pages: Home, Attendance Calendar, Membership, Reports, Insights, Settings
- Session duration: 30 days (shared with admin)
- PWA installable (manifest + service worker)

## Self-Maintenance (MUST follow)
**After every code change**, check if any `.claude/` file needs updating:
- Changed dependencies? → Update Tech Stack above
- Added/removed API route? → Update `commands/check-api.md`
- Changed schema? → Update `rules/database.md`
- Changed auth? → Update Authentication section above
- Changed tests? → Update `rules/testing.md`
- New service/page/route? → Update tables in this file

See `.claude/rules/self-maintenance.md` for the full trigger matrix.
**When updating any `.claude/` file, report what changed and why.**

**Pre-commit hook** runs `.claude/scripts/config-drift-check.sh` — catches drift automatically.
Run `/update-config` for a full manual audit.
