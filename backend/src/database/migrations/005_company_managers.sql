-- =============================================================================
-- Migration 005: company_managers
-- Maps employees to the companies they manage.
-- Not limited to super admins — any employee with companies:manage permission
-- can be assigned. One employee can manage multiple companies.
-- Safe to re-run (IF NOT EXISTS / IF NOT EXISTS checks)
-- =============================================================================

CREATE TABLE IF NOT EXISTS company_managers (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id    INT UNSIGNED NOT NULL,
  employee_id   INT UNSIGNED NOT NULL
                COMMENT 'Employee who manages this company',
  role          ENUM('owner','admin','manager') NOT NULL DEFAULT 'manager'
                COMMENT 'owner=full control, admin=create employees, manager=view only',
  is_primary    TINYINT(1) NOT NULL DEFAULT 0
                COMMENT 'Primary contact shown in company card',
  assigned_by   INT UNSIGNED DEFAULT NULL
                COMMENT 'employee_id who made this assignment',
  assigned_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes         VARCHAR(500) DEFAULT NULL,

  UNIQUE KEY uq_company_employee (company_id, employee_id),
  INDEX idx_employee            (employee_id),
  INDEX idx_company_primary     (company_id, is_primary),

  CONSTRAINT fk_cm_company
    FOREIGN KEY (company_id)  REFERENCES companies(id)  ON DELETE CASCADE,
  CONSTRAINT fk_cm_employee
    FOREIGN KEY (employee_id) REFERENCES employees(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COMMENT='Maps employees to companies they manage';

-- ─── Add created_by_employee_id to companies ─────────────────────────────────
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS created_by_employee_id INT UNSIGNED DEFAULT NULL
    COMMENT 'employee_id who created this company';

-- ─── Seed: assign first super admin as owner of all existing companies ────────
-- This runs once on first migration. Safe to re-run (INSERT IGNORE).
INSERT IGNORE INTO company_managers (company_id, employee_id, role, is_primary, assigned_by)
SELECT
  c.id,
  e.id,
  'owner',
  1,
  e.id
FROM companies c
CROSS JOIN employees e
WHERE e.is_super_admin = 1
  AND e.email = 'superadmin@nexhr.com'
  AND c.is_active = 1;

-- ─── Verify ──────────────────────────────────────────────────────────────────
SELECT
  c.name        AS company,
  e.email       AS manager_email,
  cm.role,
  cm.is_primary
FROM company_managers cm
JOIN companies c  ON c.id  = cm.company_id
JOIN employees e  ON e.id  = cm.employee_id
ORDER BY c.name;
