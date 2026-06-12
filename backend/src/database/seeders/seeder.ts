import { sequelize } from "../../config/database";

import { Employee } from '../models/Employee';
import { Company } from '../models/Company';
import { Department } from '../models/Department';
import { Designation } from '../models/Designation';
import { PERMISSIONS } from "../models/Permissions";
import { Permission } from "../models/RoleModels";
import { Role, RoleModulePermission } from '../models/RoleModels';
import { EmployeeRole, RoleTemplate, RoleTemplatePermission } from '../models/AuthModels';
import { logger } from '../../config/logger';


const COMPANY_ID = 1;

const TEMPLATE_DEFS = [
  { slug: 'super_admin', name: 'Super Admin', sort_order: 1 },
  { slug: 'hr_manager', name: 'HR Manager', sort_order: 2 },
  { slug: 'manager', name: 'Department Manager', sort_order: 3 },
  { slug: 'employee', name: 'Employee', sort_order: 4 },
] as const;

type TemplatePerm = { module: string; can_view: boolean; can_edit: boolean; can_delete: boolean; can_download: boolean; };

const TEMPLATE_PERMS: Record<string, TemplatePerm[]> = {
  super_admin: [
    { module: 'recruitment', can_view: true, can_edit: true, can_delete: true, can_download: true,},
    { module: 'apptitude', can_view: true, can_edit: true, can_delete: true, can_download: true,},
    { module: 'employees', can_view: true, can_edit: true, can_delete: true, can_download: true,},
    { module: 'department', can_view: true, can_edit: true, can_delete: true, can_download: true,},
    { module: 'designation', can_view: true, can_edit: true, can_delete: true, can_download: true,},
    { module: 'settings', can_view: true, can_edit: true, can_delete: true, can_download: true,},
    { module: 'companies', can_view: true, can_edit: true, can_delete: true, can_download: true,},
  ],
  hr_manager: [
    { module: 'recruitment', can_view: true, can_edit: true, can_delete: true, can_download: true,},
    { module: 'apptitude', can_view: true, can_edit: true, can_delete: true, can_download: true,},
    { module: 'employees', can_view: true, can_edit: true, can_delete: true, can_download: true,},
    { module: 'department', can_view: true, can_edit: true, can_delete: true, can_download: true,},
    { module: 'designation', can_view: true, can_edit: true, can_delete: true, can_download: true,},
  ],
  manager: [
    { module: 'recruitment', can_view: true, can_edit: true, can_delete: true, can_download: true,},
    { module: 'apptitude', can_view: true, can_edit: true, can_delete: true, can_download: true,},
    { module: 'employees', can_view: true, can_edit: true, can_delete: true, can_download: true,},
    { module: 'department', can_view: true, can_edit: true, can_delete: true, can_download: true,},
    { module: 'designation', can_view: true, can_edit: true, can_delete: true, can_download: true,},
    { module: 'settings', can_view: true, can_edit: true, can_delete: true, can_download: true,},
    { module: 'companies', can_view: true, can_edit: true, can_delete: true, can_download: true,},
  ],
  employee: [
    { module: 'employees', can_view: true, can_delete: false, can_edit: false, can_download: false },
  ],
};


export async function seedDatabase(): Promise<void> {
  const transaction = await sequelize.transaction();

  try {
    logger.info("🚀 Running database seed...");

    // ── 1. Company ───────────────────────────────────────────────────────────
    await Company.upsert({
      id: COMPANY_ID, name: 'Nexgen Solutions Pvt Ltd', slug: 'nexgen',
      country: 'India', currency: 'INR', timezone: 'Asia/Kolkata',
      is_active: true, onboarding_step: 5,
    });
    logger.info('✅ Company ready');

    // ── 2. Global role templates ─────────────────────────────────────────────
    for (const def of TEMPLATE_DEFS) {
      await RoleTemplate.findOrCreate({
        where: { slug: def.slug },
        defaults: { slug: def.slug, name: def.name, sort_order: def.sort_order, is_system: true },
      });
    }
    const allTemplates = await RoleTemplate.findAll();
    for (const tmpl of allTemplates) {
      for (const p of (TEMPLATE_PERMS[tmpl.slug] ?? [])) {
        await RoleTemplatePermission.findOrCreate({
          where: { template_id: tmpl.id, module: p.module },
          defaults: { template_id: tmpl.id, ...p },
        });
      }
    }
    logger.info('✅ Role templates + permissions seeded');

    // ── 3. Per-company roles + module permissions ────────────────────────────
    const templateMap = new Map(allTemplates.map(t => [t.slug, t]));
    for (const def of TEMPLATE_DEFS) {
      const tmpl = templateMap.get(def.slug)!;
      const [role] = await Role.findOrCreate({
        where: { company_id: COMPANY_ID, slug: def.slug },
        defaults: {
          company_id: COMPANY_ID,
          name: def.name,
          slug: def.slug,
          is_system: true,
          template_id: tmpl.id,  // ✓ now valid on updated Role model
        },
      });
      const tPerms = await RoleTemplatePermission.findAll({ where: { template_id: tmpl.id } });
      for (const tp of tPerms) {
        await RoleModulePermission.findOrCreate({
          where: { role_id: role.id, module: tp.module },
          defaults: {
            role_id: role.id, module: tp.module,
          },
        });
      }
    }
    logger.info('✅ Company roles + module permissions ready');

    // ── 4. Departments ───────────────────────────────────────────────────────
    const deptMap = new Map<string, number>();
    for (const name of ['Human Resources', 'Engineering', 'Finance', 'Operations', 'Marketing', 'Sales']) {
      const code = name.split(' ').map((w: string) => w[0]).join('').toUpperCase();
      const [d] = await Department.findOrCreate({
        where: { company_id: COMPANY_ID, name },
        defaults: { company_id: COMPANY_ID, name, code },
      });
      deptMap.set(name, d.id);
    }

    // ── 5. Designations ──────────────────────────────────────────────────────
    const desigMap = new Map<string, number>();
    for (const name of ['HR Manager', 'HR Executive', 'Software Engineer', 'Senior Engineer', 'Finance Manager', 'CEO', 'CTO']) {
      const [d] = await Designation.findOrCreate({
        where: { company_id: COMPANY_ID, name },
        defaults: { company_id: COMPANY_ID, name },
      });
      desigMap.set(name, d.id);
    }
    logger.info('✅ Departments + designations ready');

    // ── 6. Super admin employee ───────────────────────────────────────────────
    const [superAdminEmp, saCreated] = await Employee.findOrCreate({
      where: { email: 'superadmin@ung.com' },
      defaults: {
        company_id: COMPANY_ID, employee_code: 'EMP000',
        first_name: 'Super', last_name: 'Admin',
        email: 'superadmin@ung.com', phone: '+918130988753',
        department_id: deptMap.get('Human Resources') ?? null,
        designation_id: desigMap.get('HR Manager') ?? null,
        employment_type: 'Permanent',
        status: 'Active',
        portal_access: true, is_super_admin: true,
      },
    });
    if (!saCreated) {
      await superAdminEmp.update({ is_super_admin: true, portal_access: true });
    }
    const saRole = await Role.findOne({ where: { company_id: COMPANY_ID, slug: 'super_admin' } });
    if (saRole) {
      await EmployeeRole.findOrCreate({
        where: { employee_id: superAdminEmp.id, role_id: saRole.id },
        defaults: { employee_id: superAdminEmp.id, role_id: saRole.id, company_id: COMPANY_ID },
      });
    }

    // ── 7. HR admin employee ─────────────────────────────────────────────────
    const [hrEmp] = await Employee.findOrCreate({
      where: { email: 'admin@ung.com' },
      defaults: {
        company_id: COMPANY_ID, employee_code: 'EMP001',
        first_name: 'Admin', last_name: 'User',
        email: 'admin@ung.com', phone: '+918826693968',
        department_id: deptMap.get('Human Resources') ?? null,
        designation_id: desigMap.get('HR Manager') ?? null,
        employment_type: 'Permanent',
        status: 'Active',
        portal_access: true, is_super_admin: false,
      },
    });
    const hrRole = await Role.findOne({ where: { company_id: COMPANY_ID, slug: 'hr_manager' } });
    if (hrRole) {
      await EmployeeRole.findOrCreate({
        where: { employee_id: hrEmp.id, role_id: hrRole.id },
        defaults: { employee_id: hrEmp.id, role_id: hrRole.id, company_id: COMPANY_ID },
      });
    }

    await Permission.bulkCreate(PERMISSIONS, {
      ignoreDuplicates: true,
      transaction,
    });

    await transaction.commit();

    logger.info("🎉 Database seed completed successfully");
    logger.info("📧 Login: admin@ung.com");
    logger.info("🔑 Password: 123456");

  } catch (error) {
    await transaction.rollback();

    console.error(error);

    logger.error("❌ Seed failed:", error);

    throw error;
  }
}

// =========================================================
// RUN DIRECTLY
// =========================================================

if (require.main === module) {
  sequelize
    .authenticate()
    .then(async () => {
      logger.info("✅ Database Connected");

      // IMPORTANT
      // sync tables before seed
      await sequelize.sync(
        { alter: true }
      );

      await seedDatabase();
    })
    .then(() => {
      logger.info("🌱 Seeder finished");
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);

      logger.error("Seeder execution failed:", error);

      process.exit(1);
    });
}