# Yoga Studio Management - Deployment Guide

## Hostinger Business Hosting Deployment

This guide covers deploying the Yoga Studio Management application to Hostinger Business Hosting with MySQL database.

---

## Prerequisites

- Hostinger Business Hosting account
- Access to hPanel (Hostinger control panel)
- FTP client (FileZilla recommended) or use Hostinger File Manager
- Domain configured (or use Hostinger subdomain)

---

## Part 1: Database Setup

### Step 1.1: Create MySQL Database

1. Log in to [hPanel](https://hpanel.hostinger.com)
2. Navigate to **Databases** → **MySQL Databases**
3. Create a new database:
   - **Database name**: `u123456789_yoga` (prefix is auto-added by Hostinger)
   - **Username**: `u123456789_admin`
   - **Password**: Generate a strong password and save it securely
4. Click **Create**
5. Note down:
   - Database name
   - Username
   - Password
   - Host (usually `localhost` on Hostinger)

### Step 1.2: Import Database Schema

1. In hPanel, go to **Databases** → **phpMyAdmin**
2. Select your newly created database
3. Click **Import** tab
4. Choose file: `database/schema.sql` from this project
5. Click **Go** to import
6. Verify tables were created (you should see ~12 tables)

---

## Part 2: Configure API

### Step 2.1: Create Environment File

1. Copy `api/.env.example` to `api/.env`
2. Update with your Hostinger database credentials:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=u123456789_yoga
DB_USER=u123456789_admin
DB_PASSWORD=your_secure_password_here

# API Configuration
API_KEY=generate_a_random_64_character_string_here

# CORS - Set to your domain
CORS_ORIGIN=https://yourdomain.com

# Production mode
DEBUG_MODE=false
```

### Step 2.2: Generate API Key

Generate a secure API key (run in terminal or use online generator):

```bash
# Linux/Mac
openssl rand -hex 32

# Or use: https://www.uuidgenerator.net/version4
```

---

## Part 3: Configure Frontend

### Step 3.1: Create Frontend Environment

Create `.env.production` in project root:

```env
# API Configuration
VITE_API_URL=/api
VITE_API_KEY=same_api_key_as_in_php_env
VITE_STORAGE_MODE=api

# Optional: Analytics
# VITE_GA_ID=G-XXXXXXXXXX
```

### Step 3.2: Build for Production

```bash
npm run build
```

This creates the `dist` folder with optimized production files.

---

## Part 4: Upload Files

### Option A: Using Hostinger File Manager

1. In hPanel, go to **Files** → **File Manager**
2. Navigate to `public_html` (or your domain folder)
3. Upload contents of `dist/` folder to root
4. Create `api/` folder and upload contents of `api/` folder
5. Upload `api/.env` file (configured in Step 2.1)

### Option B: Using FTP (FileZilla)

1. Get FTP credentials from hPanel → **Files** → **FTP Accounts**
2. Connect with FileZilla:
   - Host: Your FTP hostname
   - Username: Your FTP username
   - Password: Your FTP password
   - Port: 21
3. Upload `dist/*` to `public_html/`
4. Upload `api/*` to `public_html/api/`

### Final Structure

```
public_html/
├── index.html
├── assets/
│   ├── *.js
│   └── *.css
├── api/
│   ├── index.php
│   ├── config.php
│   ├── .env           (created from .env.example)
│   ├── .htaccess
│   └── endpoints/
│       ├── BaseHandler.php
│       ├── members.php
│       ├── leads.php
│       └── ... (other handlers)
└── ... (other static files)
```

---

## Part 5: Configure Domain & SSL

### Step 5.1: SSL Certificate

1. In hPanel, go to **Security** → **SSL**
2. Install free Let's Encrypt SSL for your domain
3. Enable **Force HTTPS** redirect

### Step 5.2: Configure .htaccess (Root)

Create/update `public_html/.htaccess`:

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

---

## Part 6: Verify Deployment

### Step 6.1: Test API Health

Visit: `https://yourdomain.com/api/?endpoint=health&action=check`

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-20 12:00:00",
  "version": "1.0.0"
}
```

### Step 6.2: Test Database Connection

Visit: `https://yourdomain.com/api/?endpoint=health&action=detailed`

Check that database status is "ok".

### Step 6.3: Test Application

1. Open `https://yourdomain.com`
2. Login with default password: `admin123`
3. **IMPORTANT**: Change the default password immediately in Settings

---

## Part 7: Post-Deployment

### Step 7.1: Change Default Password

1. Login to admin panel
2. Go to Settings → Security
3. Change admin password to a strong password

### Step 7.2: Update Studio Settings

1. Go to Settings
2. Update:
   - Studio name
   - Address
   - Phone
   - Email
   - Logo
   - Invoice template

### Step 7.3: Disable Seed Data (Already Configured)

The application is configured to not seed demo data in production. If you need test data, use the backup/restore feature.

---

## Troubleshooting

### Issue: 500 Internal Server Error

1. Check PHP error logs in hPanel → Advanced → Error Logs
2. Verify `.env` file exists and has correct credentials
3. Check file permissions (folders: 755, files: 644)

### Issue: Database Connection Failed

1. Verify database credentials in `api/.env`
2. Check database exists in hPanel
3. Ensure database user has full privileges

### Issue: CORS Errors

1. Check `CORS_ORIGIN` in `api/.env` matches your domain
2. Include protocol: `https://yourdomain.com` (not just `yourdomain.com`)

### Issue: API Returns 401 Unauthorized

1. Verify `VITE_API_KEY` in frontend matches `API_KEY` in backend
2. Clear browser cache and reload

### Issue: React Router Not Working

1. Verify root `.htaccess` has SPA rewrite rules
2. Check that `RewriteEngine On` is enabled

---

## Backup & Recovery

### Manual Backup

1. **Database**: hPanel → Databases → phpMyAdmin → Export
2. **Files**: hPanel → Files → Backups → Download

### Automatic Backups

Hostinger Business includes automatic backups. Access via:
hPanel → Files → Backups

### Restore

1. **Database**: Import SQL backup via phpMyAdmin
2. **Files**: Upload via File Manager or FTP

---

## Performance Optimization

### Hostinger Cache

1. hPanel → Advanced → Cache Manager
2. Enable caching for static assets

### PHP Settings

1. hPanel → Advanced → PHP Configuration
2. Recommended settings:
   - PHP Version: 8.1 or higher
   - memory_limit: 256M
   - max_execution_time: 60

---

## Security Checklist

- [ ] Changed default admin password
- [ ] SSL certificate installed
- [ ] Force HTTPS enabled
- [ ] API key is unique and secure
- [ ] Debug mode disabled in production
- [ ] `.env` file not accessible from web (protected by .htaccess)
- [ ] Regular backups enabled

---

## Support

For issues specific to this application, check:
1. Browser console for JavaScript errors
2. Network tab for API errors
3. PHP error logs in hPanel

For Hostinger-specific issues, contact Hostinger support via hPanel.
