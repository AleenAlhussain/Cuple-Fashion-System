# Cuple E-commerce Platform

E-commerce platform for UAE/Saudi Arabia markets (cuple.shop) with products imported from cuple.ae.

## Project Structure

```
cuple/
├── backend/      # Laravel 12 REST API
├── frontend/     # Next.js 15 Customer Storefront
└── admin/        # Next.js 15 Admin Dashboard
```

## Prerequisites

- **PHP** >= 8.2
- **Composer** >= 2.x
- **Node.js** >= 18.x
- **npm** >= 9.x
- **PostgreSQL** >= 14.x

---

## PostgreSQL Database Setup

### 1. Install PostgreSQL

**Windows:**
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer and follow the setup wizard
3. Remember the password you set for the `postgres` user
4. Add PostgreSQL bin folder to PATH (e.g., `C:\Program Files\PostgreSQL\14\bin`)

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Create Database and User

Open PostgreSQL command line:

```bash
# Windows - Open Command Prompt or PowerShell
psql -U postgres

# macOS/Linux
sudo -u postgres psql
```

Run these SQL commands:

```sql
-- Create database
CREATE DATABASE cuple_db;

-- Create user with password
CREATE USER cuple_user WITH PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE cuple_db TO cuple_user;

-- Connect to the database and grant schema privileges
\c cuple_db
GRANT ALL ON SCHEMA public TO cuple_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cuple_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cuple_user;

-- Exit
\q
```

### 3. Enable PHP PostgreSQL Extension

Edit your `php.ini` file:

**Windows:** `C:\php\php.ini` or `C:\xampp\php\php.ini`
**macOS/Linux:** `/etc/php/8.2/cli/php.ini`

Uncomment these lines (remove the `;`):
```ini
extension=pdo_pgsql
extension=pgsql
```

Restart your web server after changes.

---

## Backend Setup (Laravel)

### 1. Navigate to Backend

```bash
cd backend
```

### 2. Install Dependencies

```bash
composer install
```

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` file with PostgreSQL settings:

```env
APP_NAME=Cuple
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000

# PostgreSQL Database Configuration
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=cuple_db
DB_USERNAME=cuple_user
DB_PASSWORD=your_secure_password

# Optional: Increase memory limit for migrations
# Add to php.ini: memory_limit=512M
```

### 4. Generate Application Key

```bash
php artisan key:generate
```

### 5. Run Migrations

```bash
php artisan migrate
```

### 6. Create Storage Link

```bash
php artisan storage:link
```

### 7. Start Development Server

```bash
php artisan serve
```

The API will be available at `http://localhost:8000`

---

## Frontend Setup (Next.js Customer Site)

### 1. Navigate to Frontend

```bash
cd frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Create `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_IMAGE_URL=http://localhost:8000
```

### 4. Start Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

---

## Admin Panel Setup (Next.js Admin Dashboard)

### 1. Navigate to Admin

```bash
cd admin
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Create `.env.local` file:

```env
NEXT_PUBLIC_API_PROD_URL=http://localhost:8000/api/admin/
NEXT_PUBLIC_storageURL=http://localhost:8000/storage
```

### 4. Start Development Server

```bash
npm run dev
```

The admin panel will be available at `http://localhost:3001`

---

## Migrating from SQLite to PostgreSQL

If you have existing data in SQLite and need to migrate to PostgreSQL:

### Method 1: Using Python Script (Recommended)

We've included a migration script `migrate_mysql_to_postgres.py` that can be adapted for SQLite:

```bash
# Install required Python packages
pip install psycopg2-binary

# Run the migration script
python migrate_sqlite_to_postgres.py
```

### Method 2: Manual Migration Using Laravel

#### Step 1: Export Data from SQLite

Create a new Laravel command or use tinker to export data:

```bash
php artisan tinker
```

```php
// Export all tables to JSON
$tables = ['users', 'products', 'product_variants', 'categories', 'orders', 'order_items', 'coupons', 'addresses'];

foreach ($tables as $table) {
    $data = DB::table($table)->get();
    file_put_contents(storage_path("exports/{$table}.json"), $data->toJson());
}
```

#### Step 2: Switch to PostgreSQL

Update your `.env` file:

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=cuple_db
DB_USERNAME=cuple_user
DB_PASSWORD=your_secure_password
```

#### Step 3: Run Fresh Migrations

```bash
php artisan migrate:fresh
```

#### Step 4: Import Data

```php
// In tinker or a custom command
$tables = ['users', 'products', 'product_variants', 'categories', 'orders', 'order_items', 'coupons', 'addresses'];

foreach ($tables as $table) {
    $json = file_get_contents(storage_path("exports/{$table}.json"));
    $data = json_decode($json, true);

    foreach (array_chunk($data, 100) as $chunk) {
        DB::table($table)->insert($chunk);
    }

    // Reset auto-increment sequence for PostgreSQL
    $max = DB::table($table)->max('id') ?? 0;
    DB::statement("SELECT setval('{$table}_id_seq', {$max})");
}
```

### Method 3: Using pgLoader (Advanced)

If you have pgLoader installed:

```bash
# Install pgLoader
# macOS: brew install pgloader
# Ubuntu: sudo apt install pgloader

# Create a load file (sqlite_to_postgres.load)
LOAD DATABASE
    FROM sqlite:///path/to/backend/database/database.sqlite
    INTO postgresql://cuple_user:your_password@localhost/cuple_db
WITH include drop, create tables, create indexes, reset sequences
SET work_mem to '16MB', maintenance_work_mem to '512 MB';
```

Run pgLoader:

```bash
pgloader sqlite_to_postgres.load
```

---

## PostgreSQL vs SQLite Differences

When working with PostgreSQL, note these differences:

### 1. Boolean Values
- SQLite: `0` and `1`
- PostgreSQL: `true` and `false`

### 2. Auto-increment
- SQLite: `AUTOINCREMENT`
- PostgreSQL: `SERIAL` or `BIGSERIAL`

### 3. Date/Time Functions
```php
// SQLite
DB::raw("strftime('%Y-%m-%d', created_at)")

// PostgreSQL
DB::raw("TO_CHAR(created_at, 'YYYY-MM-DD')")
```

### 4. String Concatenation
```php
// SQLite
DB::raw("first_name || ' ' || last_name")

// PostgreSQL (same syntax works, or use CONCAT)
DB::raw("CONCAT(first_name, ' ', last_name)")
```

### 5. Case Sensitivity
PostgreSQL is case-sensitive by default. Use `ILIKE` for case-insensitive searches:

```php
// Case-insensitive search in PostgreSQL
->where('name', 'ILIKE', "%{$search}%")
```

---

## Common Commands

### Backend

```bash
# Run migrations
php artisan migrate

# Rollback migrations
php artisan migrate:rollback

# Fresh migration (drops all tables)
php artisan migrate:fresh

# Seed database
php artisan db:seed

# Run tests
php artisan test

# Clear caches
php artisan config:clear
php artisan cache:clear
php artisan route:clear

# Code formatting
php artisan pint
```

### Frontend / Admin

```bash
# Development
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

---

## Troubleshooting

### PostgreSQL Connection Refused

1. Check if PostgreSQL is running:
   ```bash
   # Windows
   pg_isready

   # macOS/Linux
   sudo systemctl status postgresql
   ```

2. Verify credentials in `.env` file

3. Check `pg_hba.conf` allows local connections:
   ```
   # IPv4 local connections:
   host    all    all    127.0.0.1/32    md5
   ```

### PHP PostgreSQL Extension Not Found

```bash
# Check if extension is loaded
php -m | grep pgsql

# If not found, install it
# Ubuntu/Debian
sudo apt install php8.2-pgsql

# macOS with Homebrew
brew install php@8.2
```

### Migration Errors

If you get sequence errors after importing data:

```sql
-- Reset all sequences
SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE(MAX(id), 1)) FROM users;
SELECT setval(pg_get_serial_sequence('products', 'id'), COALESCE(MAX(id), 1)) FROM products;
-- Repeat for other tables...
```

### Memory Limit Errors

Edit `php.ini`:
```ini
memory_limit = 512M
```

---

## Team Development Workflow

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cuple
   ```

2. **Set up PostgreSQL** (follow steps above)

3. **Set up Backend**
   ```bash
   cd backend
   composer install
   cp .env.example .env
   # Edit .env with your PostgreSQL credentials
   php artisan key:generate
   php artisan migrate
   php artisan storage:link
   php artisan serve
   ```

4. **Set up Frontend** (in new terminal)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. **Set up Admin** (in new terminal)
   ```bash
   cd admin
   npm install
   npm run dev
   ```

6. **Access the applications**
   - API: http://localhost:8000
   - Frontend: http://localhost:3000
   - Admin: http://localhost:3001

---

## API Documentation

### Website API (Public)
Base URL: `http://localhost:8000/api/website`

- `GET /products` - List products
- `GET /products/{slug}` - Get product details
- `GET /categories` - List categories
- `POST /cart/calculate-discounts` - Calculate cart discounts
- `POST /orders` - Create order

### Admin API
Base URL: `http://localhost:8000/api/admin`

- `GET /product` - List products
- `POST /product` - Create product
- `PUT /product/{id}` - Update product
- `DELETE /product/{id}` - Delete product
- `GET /order` - List orders
- `PUT /order/{id}/status` - Update order status
- `GET /discount-rule` - List discount rules

---

## Support

For issues or questions, contact the development team or create an issue in the repository.
