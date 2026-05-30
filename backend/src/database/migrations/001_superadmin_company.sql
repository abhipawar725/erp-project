-- ─────────────────────────────────────────────────────────────────────────────
-- NexHR Migration: SuperAdmin + Company Module
-- Safe to run multiple times (uses IF NOT EXISTS / IGNORE)
-- Run BEFORE starting the backend
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add is_super_admin flag to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_super_admin TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'Bypasses ALL company and tenant checks — one per platform' AFTER role_id;

-- 2. Upgrade companies table with missing enterprise fields
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE
    COMMENT 'URL-safe identifier, auto-generated from name' AFTER name,
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20) AFTER gstin,
  ADD COLUMN IF NOT EXISTS email VARCHAR(255) AFTER phone,
  ADD COLUMN IF NOT EXISTS website VARCHAR(300) AFTER email,
  ADD COLUMN IF NOT EXISTS industry VARCHAR(100) AFTER country,
  ADD COLUMN IF NOT EXISTS employee_count INT UNSIGNED DEFAULT 0
    COMMENT 'Actual count cached from employees table' AFTER industry,
  ADD COLUMN IF NOT EXISTS max_employees INT UNSIGNED DEFAULT 100
    COMMENT 'Subscription limit' AFTER employee_count,
  ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT 'starter'
    COMMENT 'starter | growth | enterprise' AFTER max_employees,
  ADD COLUMN IF NOT EXISTS subscription_expires_at DATE AFTER subscription_plan,
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'Asia/Kolkata' AFTER subscription_expires_at,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR' AFTER timezone,
  ADD COLUMN IF NOT EXISTS date_format VARCHAR(30) DEFAULT 'DD/MM/YYYY' AFTER currency,
  ADD COLUMN IF NOT EXISTS onboarding_step INT DEFAULT 0
    COMMENT '0=new 1=basic 2=departments 3=roles 4=admin_user 5=complete' AFTER date_format,
  ADD COLUMN IF NOT EXISTS setup_completed_at DATETIME AFTER onboarding_step,
  ADD COLUMN IF NOT EXISTS created_by INT UNSIGNED AFTER setup_completed_at,
  ADD COLUMN IF NOT EXISTS notes TEXT AFTER created_by;

-- 3. Index for slug lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);

-- 4. Seed the super admin user (company_id=1, bypasses all checks)
-- Password: NexHR@SuperAdmin2026
-- Change this in production!
INSERT IGNORE INTO users (company_id, email, password_hash, role_id, is_super_admin, is_active)
SELECT 1, 'superadmin@nexhr.com',
  '$2a$12$placeholder_run_seeder_to_create_real_hash',
  (SELECT id FROM roles WHERE slug='admin' AND company_id=1 LIMIT 1),
  1, 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='superadmin@nexhr.com');

-- 5. Update existing company record with slug if missing
UPDATE companies SET slug = LOWER(REPLACE(REPLACE(name,' ','-'),'.','')) WHERE slug IS NULL;
