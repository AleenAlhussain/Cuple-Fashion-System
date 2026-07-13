# Cuple Shop - Setup Guide

## For Laragon Users

### Step 1: Prerequisites
- Laragon installed with PHP 8.2+ and MySQL
- Node.js 18+ installed
- Git installed
- Redis enabled in Laragon (Menu > Redis > Start)

### Step 2: Pull Latest Code

```bash
git pull origin main
cd backend
```

### Step 3: Create Database
1. Open HeidiSQL (Laragon > Database)
2. Create new database: `cuple_shop`

### Step 4: Configure Environment

```bash
copy .env.example .env
```

Edit `.env` file and add credentials:
```env
# Use Redis for caching (Laragon has Redis)
CACHE_STORE=redis

# Add Stripe keys (get from team)
STRIPE_SECRET=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Add Aramex credentials (get from team)
ARAMEX_USERNAME=xxx
ARAMEX_PASSWORD=xxx
```

### Step 5: Install Dependencies & Setup

```bash
composer install
php artisan key:generate
php artisan migrate
php artisan db:seed --class=PopupSeeder
php artisan storage:link
php artisan cache:clear
```

### Step 6: Start Backend Server

```bash
php artisan serve
```
Backend runs on: http://localhost:8000

### Step 7: Setup Frontend

```bash
cd ..\frontend
npm install
npm run dev
```
Frontend runs on: http://localhost:3000

### Step 8: Setup Admin Panel

```bash
cd ..\admin
npm install
npm run dev
```
Admin runs on: http://localhost:3001

---

## New Popup System

The popup system is now integrated into **Theme Options > Popup > SmartPopups** tab.

### To add sample popups:
```bash
php artisan db:seed --class=PopupSeeder
```

### Popup Types:
- **Collection** - Promote new collections
- **Offer** - Display special offers/sales
- **Coupon** - Show coupon codes (copy to clipboard)
- **Newsletter** - Email subscription form

### Managing Popups:
1. Go to Admin Panel: http://localhost:3001
2. Navigate to: **Store Front > Theme Options**
3. Click **Popup** tab
4. Select **SmartPopups** sub-tab

---

## Troubleshooting

### "php is not recognized" error
Use full path: `C:\xampp\php\php.exe` instead of `php`

### Database connection error
1. Make sure MySQL is running in XAMPP Control Panel
2. Check database name matches in `.env`

### Popups not showing on frontend
```bash
C:\xampp\php\php.exe artisan cache:clear
C:\xampp\php\php.exe artisan db:seed --class=PopupSeeder
```

### API errors
Check that backend is running on port 8000:
```bash
C:\xampp\php\php.exe artisan serve
```
