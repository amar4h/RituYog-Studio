# Yoga Studio Management - Production Deployment Runbook

**Target Environment:** Hostinger Business Hosting (hPanel)
**Repository:** YogaStudioMgmt
**Last Updated:** January 2026

---

## 1. Pre-Deployment Checklist

### 1.1 Files to Review

| File | Location | Action Required |
|------|----------|-----------------|
| `api/.env.example` | Repository | Copy to create `api/.env` |
| `database/schema.sql` | Repository | Will be imported to MySQL |
| `.env.production` | Project root | Create before build |
| `api/.htaccess` | Repository | Verify exists |

### 1.2 Environment Variables to Prepare

**You will need these values ready before starting:**

| Variable | Example Value | Where to Get It |
|----------|---------------|-----------------|
| `DB_HOST` | `localhost` | Hostinger default |
| `DB_PORT` | `3306` | Hostinger default |
| `DB_NAME` | `u123456789_yoga` | You will create in Step 2 |
| `DB_USER` | `u123456789_admin` | You will create in Step 2 |
| `DB_PASSWORD` | (generate secure password) | You will create in Step 2 |
| `API_KEY` | (64-character random string) | Generate in Step 1.3 |
| `CORS_ORIGIN` | `https://yourdomain.com` | Your Hostinger domain |

### 1.3 Generate Secure API Key

Open this URL in your browser: https://www.uuidgenerator.net/version4

1. Click "Generate" twice
2. Combine both UUIDs (remove dashes)
3. Result should be ~64 characters
4. Save this value securely - you will need it twice

**Example:** `a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4`

### 1.4 Backup Current State (if applicable)

If you have existing data:
1. Export localStorage data from browser (Settings → Backup)
2. Save the JSON file locally
3. Keep the file until deployment is verified

---

## 2. Database Setup (hPanel)

### 2.1 Log in to Hostinger

1. Go to https://hpanel.hostinger.com
2. Enter your email and password
3. Select your hosting account (if multiple)

### 2.2 Create MySQL Database

1. In the left sidebar, click **Databases**
2. Click **MySQL Databases**
3. Under "Create New MySQL Database and Database User":
   - **MySQL Database Name:** Enter `yoga` (Hostinger adds prefix automatically)
   - **MySQL Username:** Enter `admin` (Hostinger adds prefix automatically)
   - **Password:** Click "Generate" or enter a strong password (min 12 characters)
4. **IMPORTANT:** Write down these exact values:
   ```
   Database Name: u[numbers]_yoga
   Username: u[numbers]_admin
   Password: [your password]
   ```
5. Click **Create**

### 2.3 Import Database Schema

1. In hPanel, go to **Databases** → **phpMyAdmin**
2. Click **Enter phpMyAdmin** (new tab opens)
3. In the left panel, click your database name (`u[numbers]_yoga`)
4. Click the **Import** tab at the top
5. Click **Choose File**
6. Navigate to your local repository: `database/schema.sql`
7. Leave all settings at default
8. Scroll down and click **Import**
9. Wait for "Import has been successfully finished"

### 2.4 Verify Tables Were Created

1. In phpMyAdmin, click your database name in the left panel
2. You should see these 12 tables:
   - `api_sessions`
   - `attendance_records`
   - `invoices`
   - `leads`
   - `members`
   - `membership_plans`
   - `membership_subscriptions`
   - `payments`
   - `session_slots`
   - `slot_subscriptions`
   - `studio_settings`
   - `trial_bookings`

3. Click on `session_slots` table
4. Click **Browse** tab
5. Verify you see 4 default slots (7:30 AM, 8:45 AM, 10:00 AM, 7:30 PM)

**If tables are missing:** Re-import schema.sql

---

## 3. Backend Deployment

### 3.1 Configure PHP Version

1. In hPanel, go to **Advanced** → **PHP Configuration**
2. Set PHP version to **8.1** or higher (8.2 recommended)
3. Verify these settings are enabled:
   - `pdo_mysql` - ON
   - `json` - ON
4. Click **Save**

### 3.2 Create API Environment File

On your local computer, create a new file named `.env` with this exact content:

```env
# Database Configuration (use values from Step 2.2)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=u[numbers]_yoga
DB_USER=u[numbers]_admin
DB_PASSWORD=[your database password]

# API Configuration (use value from Step 1.3)
API_KEY=[your 64-character API key]

# CORS - Your exact domain with https
CORS_ORIGIN=https://yourdomain.com

# Production mode
DEBUG_MODE=false
```

**Replace:**
- `u[numbers]_yoga` with your actual database name
- `u[numbers]_admin` with your actual username
- `[your database password]` with your actual password
- `[your 64-character API key]` with the key from Step 1.3
- `yourdomain.com` with your actual domain

### 3.3 Upload API Files via File Manager

1. In hPanel, go to **Files** → **File Manager**
2. Navigate to `public_html`
3. Click **New Folder** and create: `api`
4. Double-click to enter the `api` folder
5. Upload these files from your local `api/` folder:
   - `index.php`
   - `config.php`
   - `.htaccess`
   - `.env` (the one you created in Step 3.2)
6. Create a new folder inside `api/` named: `endpoints`
7. Enter the `endpoints` folder
8. Upload all PHP files from your local `api/endpoints/` folder:
   - `BaseHandler.php`
   - `attendance.php`
   - `auth.php`
   - `health.php`
   - `invoices.php`
   - `leads.php`
   - `members.php`
   - `payments.php`
   - `plans.php`
   - `settings.php`
   - `slots.php`
   - `subscriptions.php`
   - `trials.php`

### 3.4 Verify API Folder Structure

Your `public_html` should now look like:
```
public_html/
└── api/
    ├── .env
    ├── .htaccess
    ├── config.php
    ├── index.php
    └── endpoints/
        ├── BaseHandler.php
        ├── attendance.php
        ├── auth.php
        ├── health.php
        ├── invoices.php
        ├── leads.php
        ├── members.php
        ├── payments.php
        ├── plans.php
        ├── settings.php
        ├── slots.php
        ├── subscriptions.php
        └── trials.php
```

### 3.5 Set File Permissions

1. In File Manager, navigate to `public_html/api`
2. Right-click on `.env` file
3. Select **Permissions** (or **Change Permissions**)
4. Set permissions to `600` (owner read/write only)
5. Click **Change Permissions**

### 3.6 Verify API Health Endpoint

1. Open a new browser tab
2. Go to: `https://yourdomain.com/api/?endpoint=health&action=check`
3. You should see:
   ```json
   {
     "status": "ok",
     "timestamp": "2026-01-20 12:00:00",
     "version": "1.0.0"
   }
   ```

**If you see an error:**
- 500 Error: Check `api/.env` credentials match database
- 404 Error: Check `.htaccess` was uploaded
- 403 Error: Check PHP version is 8.1+

### 3.7 Verify Database Connection

1. Go to: `https://yourdomain.com/api/?endpoint=health&action=detailed`
2. Look for `"database": "ok"` in the response
3. If database shows "error", double-check your `.env` credentials

---

## 4. Frontend Build & Deployment

### 4.1 Create Production Environment File

On your local computer, in the project root, create `.env.production`:

```env
# API Configuration
VITE_API_URL=/api
VITE_API_KEY=[your 64-character API key from Step 1.3]
VITE_STORAGE_MODE=api
```

**Important:** The `VITE_API_KEY` must match exactly what you put in `api/.env`

### 4.2 Build for Production

Open terminal/command prompt in your project folder:

```bash
# Install dependencies (if not already done)
npm install

# Build production bundle
npm run build
```

Wait for build to complete. You should see:
```
✓ built in X.XXs
```

### 4.3 Verify Build Output

Check that the `dist/` folder was created with:
```
dist/
├── index.html
├── assets/
│   ├── index-XXXXX.js
│   ├── index-XXXXX.css
│   └── (other chunk files)
```

### 4.4 Deploy to Staging (Recommended First)

1. In hPanel File Manager, go to `public_html`
2. Create folder: `staging`
3. Enter the `staging` folder
4. Upload ALL contents from your local `dist/` folder:
   - `index.html`
   - `assets/` folder (with all files inside)
5. Test at: `https://yourdomain.com/staging/`

### 4.5 Create Root .htaccess

In File Manager, navigate to `public_html`

If `.htaccess` exists, download it first as backup.

Create or update `public_html/.htaccess` with this content:

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /

    # Force HTTPS
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

    # Handle React Router (SPA)
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} !^/api/
    RewriteRule ^(.*)$ /index.html [L]
</IfModule>

# Security headers
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
</IfModule>
```

### 4.6 Production Cutover

1. In File Manager, go to `public_html`
2. If any old files exist (not `api/` or `staging/`), move them to a backup folder
3. Upload ALL contents from your local `dist/` folder directly to `public_html`:
   - `index.html`
   - `assets/` folder

### 4.7 Final Folder Structure

```
public_html/
├── .htaccess
├── index.html
├── assets/
│   ├── index-XXXXX.js
│   ├── index-XXXXX.css
│   └── (other files)
├── api/
│   ├── .env
│   ├── .htaccess
│   ├── config.php
│   ├── index.php
│   └── endpoints/
│       └── (all .php files)
└── staging/  (optional, can delete after verification)
```

---

## 5. Validation Checklist

### 5.1 URLs to Test

Test each URL in order. All should work without errors.

| # | URL | Expected Result |
|---|-----|-----------------|
| 1 | `https://yourdomain.com` | Login page loads |
| 2 | `https://yourdomain.com/api/?endpoint=health&action=check` | JSON with `"status": "ok"` |
| 3 | `https://yourdomain.com/api/?endpoint=health&action=detailed` | JSON with `"database": "ok"` |

### 5.2 Business Flows to Verify

**Login & Authentication:**
1. Go to `https://yourdomain.com`
2. Enter password: `admin123`
3. Click Login
4. ✓ Should see Dashboard

**Change Default Password (CRITICAL):**
1. Go to Settings (gear icon)
2. Find Security section
3. Change password from `admin123` to a strong password
4. Save changes
5. Log out and log back in with new password
6. ✓ Verify new password works

**Create a Test Member:**
1. Go to Members → Add Member
2. Fill in:
   - First Name: `Test`
   - Last Name: `User`
   - Email: `test@example.com`
   - Phone: `9999999999`
3. Click Save
4. ✓ Member appears in list

**Create a Subscription:**
1. Click on the test member
2. Click "Add Subscription"
3. Select Monthly plan
4. Select any slot
5. Click Save
6. ✓ Subscription created with invoice

**Verify Database Storage:**
1. Open phpMyAdmin (from hPanel)
2. Click `members` table
3. Click Browse
4. ✓ Test member appears in database

**Test Attendance:**
1. Go to Attendance page
2. Select today's date
3. Select a slot
4. ✓ Test member appears (if subscription covers today)
5. Click to mark present
6. ✓ Status changes to green

### 5.3 Error Scenarios to Test

| Test | How to Test | Expected |
|------|-------------|----------|
| Wrong password | Try logging in with wrong password | "Invalid password" error |
| Direct URL access | Go to `/admin/members` without login | Redirect to login |
| API without key | Remove `?endpoint=` from API URL | Error response |

---

## 6. Rollback Plan

### 6.1 Frontend Rollback (Instant)

If the new frontend has issues:

1. In File Manager, go to `public_html`
2. Rename `index.html` to `index.html.broken`
3. Rename `assets/` to `assets.broken/`
4. If you have a backup:
   - Upload previous `index.html`
   - Upload previous `assets/` folder
5. Site is now rolled back

### 6.2 Database Rollback

**Option A: Restore from Hostinger Backup**
1. In hPanel, go to **Files** → **Backups**
2. Find a backup from before deployment
3. Click **Restore** → Select **Databases**
4. Select your database
5. Click **Restore**

**Option B: Reset to Fresh Schema**
1. Open phpMyAdmin
2. Click your database
3. Click **Operations** tab
4. Under "Remove database", click **Drop the database**
5. Confirm deletion
6. Go back to hPanel → Databases → Create new database (same name)
7. Import `schema.sql` again

### 6.3 API Rollback

If API has issues:

1. In File Manager, go to `public_html/api`
2. Rename folder to `api.broken`
3. Users will see "localStorage mode" errors but won't lose local data
4. Fix issues in the broken folder
5. Rename back to `api` when fixed

---

## 7. Post-Deployment Hardening

### 7.1 Security Checklist

| Task | How to Verify |
|------|---------------|
| ✓ Default password changed | Cannot login with `admin123` |
| ✓ HTTPS forced | `http://` redirects to `https://` |
| ✓ `.env` protected | Visiting `/api/.env` returns 403 Forbidden |
| ✓ API key is unique | Not using example key from documentation |
| ✓ DEBUG_MODE disabled | `.env` has `DEBUG_MODE=false` |

### 7.2 Verify .env is Protected

1. Open browser
2. Go to: `https://yourdomain.com/api/.env`
3. Should see: **403 Forbidden** or blank page
4. If you see the file contents, `.htaccess` is not working - contact Hostinger support

### 7.3 Enable SSL/TLS

1. In hPanel, go to **Security** → **SSL**
2. If not already installed, click **Install** for Let's Encrypt
3. Wait for installation (can take 10-15 minutes)
4. Enable **Force HTTPS** toggle

### 7.4 Configure Automatic Backups

1. In hPanel, go to **Files** → **Backups**
2. Verify "Auto-backups" is enabled (included with Business hosting)
3. Note: Hostinger keeps backups for 7-30 days depending on plan

### 7.5 Set Up Manual Backup Schedule

Create a reminder to:
- **Weekly:** Export database via phpMyAdmin (Export → Quick → Go)
- **Before any changes:** Download full site backup from hPanel

### 7.6 Monitor Error Logs

1. In hPanel, go to **Advanced** → **Error Logs**
2. Bookmark this page
3. Check weekly for PHP errors
4. Common issues:
   - "Permission denied" → Fix file permissions
   - "Database connection failed" → Check `.env` credentials
   - "Undefined index" → PHP code bug

### 7.7 Performance Optimization

1. In hPanel, go to **Advanced** → **Cache Manager**
2. Enable caching for static assets
3. In hPanel, go to **Speed** → **LiteSpeed Cache** (if available)
4. Enable with default settings

---

## Quick Reference Card

### Important URLs

| Purpose | URL |
|---------|-----|
| Application | `https://yourdomain.com` |
| API Health | `https://yourdomain.com/api/?endpoint=health&action=check` |
| Database Health | `https://yourdomain.com/api/?endpoint=health&action=detailed` |
| hPanel | `https://hpanel.hostinger.com` |

### Key File Locations

| File | Path |
|------|------|
| Frontend | `public_html/index.html` |
| API Entry | `public_html/api/index.php` |
| API Config | `public_html/api/.env` |
| Database Schema | `database/schema.sql` (local) |

### Emergency Contacts

| Issue | Action |
|-------|--------|
| Site completely down | Check hPanel → Error Logs |
| Database connection failed | Verify `api/.env` credentials |
| 500 errors | Check PHP version (8.1+) |
| SSL issues | hPanel → Security → SSL |
| Need hosting help | Hostinger 24/7 live chat in hPanel |

---

## Architecture Overview

### Dual-Mode Storage System

The application supports two storage modes controlled by `VITE_STORAGE_MODE`:

| Mode | Value | Use Case |
|------|-------|----------|
| localStorage | `localStorage` (default) | Development, offline |
| API | `api` | Production with MySQL |

### Service Layer Pattern

All services provide both synchronous and async methods:

```typescript
// Synchronous (localStorage only)
memberService.getAll()

// Async (dual-mode - works with both localStorage and API)
await memberService.async.getAll()
```

### API Endpoints

| Endpoint | Methods |
|----------|---------|
| `/api/?endpoint=members` | CRUD + getByEmail, getByPhone, search |
| `/api/?endpoint=leads` | CRUD + getPending, getForFollowUp |
| `/api/?endpoint=subscriptions` | CRUD + checkSlotCapacity |
| `/api/?endpoint=attendance` | CRUD + markAttendance |
| `/api/?endpoint=invoices` | CRUD + getPending, getOverdue |
| `/api/?endpoint=payments` | CRUD + recordPayment |
| `/api/?endpoint=slots` | CRUD + getAvailability |
| `/api/?endpoint=settings` | get, save, updatePartial |
| `/api/?endpoint=auth` | login, logout, check |
| `/api/?endpoint=health` | check, detailed |

---

**Deployment Complete ✓**

After completing all steps, your Yoga Studio Management application is live at `https://yourdomain.com` with:
- React frontend served from Hostinger
- PHP API connected to MySQL database
- Secure HTTPS connection
- Automatic backups enabled
