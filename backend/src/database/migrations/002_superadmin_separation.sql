-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 002: Separate Super Admin from Company Tenant
-- Safe to run multiple times
-- Run BEFORE starting backend after pulling this update
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Allow NULL company_id for super admin (platform-level user has no company)
ALTER TABLE users
  MODIFY COLUMN company_id INT UNSIGNED NULL
  COMMENT 'NULL = platform super admin, no company affiliation';

-- 2. Create a dedicated super_admin_meta table (extensible for future Option B)
CREATE TABLE IF NOT EXISTS super_admin_meta (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NOT NULL UNIQUE,
  full_name       VARCHAR(200),
  phone           VARCHAR(20),
  avatar_url      VARCHAR(500),
  last_seen_at    DATETIME,
  notes           TEXT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Update existing super admin to have company_id = NULL
--    (if previously seeded with company_id = 1)
UPDATE users
  SET company_id = NULL
  WHERE email = 'superadmin@nexhr.com'
    AND is_super_admin = 1;

-- Verify:
-- SELECT id, email, company_id, is_super_admin FROM users WHERE is_super_admin = 1;
-- Should show: company_id = NULL
