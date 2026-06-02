-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 003: Unified ERP — Remove company switching, unify super admin
-- Safe to re-run (uses IF EXISTS, MODIFY with check)
-- Run BEFORE deploying backend
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1: Assign any NULL company_id super admins to company 1
UPDATE users
  SET company_id = 1
  WHERE company_id IS NULL AND is_super_admin = 1;

-- Step 2: Restore company_id as NOT NULL (everyone belongs to a company now)
ALTER TABLE users
  MODIFY COLUMN company_id INT UNSIGNED NOT NULL
  COMMENT 'All users belong to a company. Super admins use company_id=1.';

-- Step 3: Drop super_admin_meta if it was created in Option A/B
DROP TABLE IF EXISTS super_admin_meta;

-- Step 4: Add company management permission slugs
INSERT IGNORE INTO permissions (module, action, slug, description) VALUES
  ('companies',    'view',    'companies:view',          'View all companies'),
  ('companies',    'create',  'companies:create',        'Create new company'),
  ('companies',    'edit',    'companies:edit',          'Edit company details'),
  ('companies',    'delete',  'companies:delete',        'Delete or suspend company'),
  ('companies',    'export',  'companies:export',        'Export company data'),
  ('super_admin',  'access',  'super_admin:access',      'Access super admin features'),
  ('super_admin',  'manage',  'super_admin:manage',      'Manage other super admin users');

-- Step 5: Assign company + super_admin permissions to super_admin permission group
INSERT IGNORE INTO group_permissions (group_id, permission_id)
SELECT pg.id, p.id
FROM permission_groups pg
CROSS JOIN permissions p
WHERE pg.slug = 'super_admin'
  AND p.module IN ('companies', 'super_admin');

-- Step 6: Verify
SELECT
  u.email,
  u.company_id,
  u.is_super_admin,
  u.is_active
FROM users u
WHERE u.is_super_admin = 1;
-- Expected: company_id = 1 (NOT NULL) for all super admins
