# Planned Features

Features and utilities planned for future implementation.

---

## FEATURE-001: Database Sync Utility - Production to RFS

**Status:** Planned
**Priority:** Medium
**Added:** 2026-01-27

### Overview
PHP utility to refresh RFS (test) database with production data. Handles foreign key constraints, provides data anonymization, and includes security measures.

### File to Create
- `api/tools/db-sync.php` - Main sync utility

### Database Connection Strategy
- **RFS**: Uses existing `getDB()` from `config.php`
- **Production**: Credentials passed in POST request body (not stored on RFS server)
- Both databases on same Hostinger MySQL server (localhost)

### Table Sync Order (respecting FK dependencies)

| Tier | Tables | Dependencies |
|------|--------|--------------|
| 1 | session_slots, membership_plans, studio_settings | None |
| 2 | members, attendance_locks | session_slots |
| 3 | leads, membership_subscriptions, slot_subscriptions | members, plans, slots |
| 4 | trial_bookings, invoices | leads, subscriptions |
| 5 | payments, attendance_records | invoices, members |

**Default Excluded:** `api_sessions`, `notification_logs`

### Sync Process
1. Validate API key and confirmation token
2. Connect to both databases
3. Disable FK checks on RFS
4. For each table (in order):
   - TRUNCATE RFS table
   - SELECT all from production
   - Apply anonymization if enabled
   - Batch INSERT to RFS (100 rows per batch)
5. Re-enable FK checks
6. Return summary with row counts

### Security Measures
- API key required (X-API-Key header)
- Confirmation token required: `"confirm": "SYNC_TO_RFS"`
- POST method only
- Rate limiting: 1 sync per hour
- Production credentials required in request (not stored)

### Data Anonymization (enabled by default)

| Table | Fields Anonymized |
|-------|-------------------|
| members | email, phone, whatsapp_number, address, emergency_contact |
| leads | email, phone, whatsapp_number, address |
| studio_settings | admin_password (reset to 'admin123'), phone, email |

### Usage

```bash
curl -X POST \
  https://darkslategrey-oryx-397719.hostingersite.com/api/tools/db-sync.php \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_RFS_API_KEY" \
  -d '{
    "confirm": "SYNC_TO_RFS",
    "prod_host": "localhost",
    "prod_dbname": "u429905972_yoga",
    "prod_user": "u429905972_admin",
    "prod_password": "YOUR_PROD_PASSWORD",
    "anonymize": true,
    "exclude_tables": ["api_sessions", "notification_logs"]
  }'
```

### Response Format

**Success:**
```json
{
  "success": true,
  "summary": {
    "tables_synced": 12,
    "total_rows": 1847,
    "duration_seconds": 4.23
  },
  "log": [
    {"table": "session_slots", "rows": 4, "success": true},
    {"table": "members", "rows": 45, "success": true}
  ]
}
```

**Error (with rollback):**
```json
{
  "success": false,
  "error": "Connection failed",
  "message": "All changes rolled back"
}
```

### Error Handling
- Entire sync wrapped in transaction
- On any error: rollback all changes, re-enable FK checks
- Detailed error logging with failed table info

### Verification Steps
1. Deploy `db-sync.php` to RFS `api/tools/`
2. Test with missing API key (expect 401)
3. Test with missing confirmation (expect 400)
4. Test with wrong production credentials (expect connection error)
5. Run full sync with anonymization enabled
6. Verify RFS database has production data (anonymized)
7. Login to RFS app and confirm data appears correctly

### Files Referenced
- `api/config.php` - DB connection, API validation functions
- `database/schema.sql` - Table structure and FK definitions
- `rfs-setup/.env` - RFS database credentials

---

## Template for New Features

```markdown
## FEATURE-XXX: [Title]

**Status:** Planned | In Progress | Completed
**Priority:** High | Medium | Low
**Added:** YYYY-MM-DD

### Overview
[Brief description of the feature]

### Files to Create/Modify
- [List affected files]

### Implementation Details
[Technical details and approach]

### Verification Steps
[How to test the feature]
```
