import { sequelize } from "../../config/database";

import { Company } from "../models/Company";
import { User } from "../models/User";
import { Role } from "../models/RoleModels";
import { Department } from "../models/Department";
import { Designation } from "../models/Designation";
import { LeaveType } from "../models/LeaveModels";

import { hashPassword } from "../../utils/hash";
import { logger } from "../../config/logger";

const COMPANY_ID = 1;

export async function seedDatabase(): Promise<void> {
  const transaction = await sequelize.transaction();

  try {
    logger.info("🚀 Running database seed...");

    // =========================================================
    // COMPANY
    // =========================================================

    const [company] = await Company.findOrCreate({
      where: {
        id: COMPANY_ID,
      },
      defaults: {
        id: COMPANY_ID,
        name: "UNG HRMS",
        code: "UNG",
        country: "India",
        fiscal_year: "Apr-Mar",
        is_active: true,
      },
      transaction,
    });

    logger.info(`🏢 Company Ready: ${company.name}`);

    // =========================================================
    // ROLES
    // =========================================================

    const [hrRole] = await Role.findOrCreate({
      where: {
        company_id: company.id,
        slug: "hr",
      },
      defaults: {
        company_id: company.id,
        name: "HR Manager",
        slug: "hr",
        description: "Full HR access",
        is_system: true,
      },
      transaction,
    });

    const [adminRole] = await Role.findOrCreate({
      where: {
        company_id: company.id,
        slug: "admin",
      },
      defaults: {
        company_id: company.id,
        name: "Admin",
        slug: "admin",
        description: "System administrator",
        is_system: true,
      },
      transaction,
    });

    const [superAdminRole] = await Role.findOrCreate({
      where: {
        company_id: company.id,
        slug: "super_admin",
      },
      defaults: {
        company_id: company.id,
        name: "Super Admin",
        slug: "super_admin",
        description: "Platform owner with unrestricted access",
        is_system: true,
      },
      transaction,
    });

    await Role.findOrCreate({
      where: {
        company_id: company.id,
        slug: "mgr",
      },
      defaults: {
        company_id: company.id,
        name: "Department Manager",
        slug: "mgr",
        description: "Team management",
        is_system: true,
      },
      transaction,
    });

    await Role.findOrCreate({
      where: {
        company_id: company.id,
        slug: "emp",
      },
      defaults: {
        company_id: company.id,
        name: "Employee",
        slug: "emp",
        description: "Self-service portal",
        is_system: true,
      },
      transaction,
    });

    logger.info("✅ Roles Seeded");

    // =========================================================
    // DEPARTMENTS
    // =========================================================

    const [engDept] = await Department.findOrCreate({
      where: {
        company_id: company.id,
        code: "ENG",
      },
      defaults: {
        company_id: company.id,
        name: "Engineering",
        code: "ENG",
        is_active: true,
      },
      transaction,
    });

    const [hrDept] = await Department.findOrCreate({
      where: {
        company_id: company.id,
        code: "HR",
      },
      defaults: {
        company_id: company.id,
        name: "Human Resources",
        code: "HR",
        is_active: true,
      },
      transaction,
    });

    const departments = [
      { name: "Sales", code: "SLS" },
      { name: "Finance", code: "FIN" },
      { name: "Operations", code: "OPS" },
      { name: "Design", code: "DSN" },
      { name: "Marketing", code: "MKT" },
    ];

    for (const dept of departments) {
      await Department.findOrCreate({
        where: {
          company_id: company.id,
          code: dept.code,
        },
        defaults: {
          company_id: company.id,
          name: dept.name,
          code: dept.code,
          is_active: true,
        },
        transaction,
      });
    }

    logger.info("✅ Departments Seeded");

    // =========================================================
    // DESIGNATIONS
    // =========================================================

    const designations = [
      {
        department_id: engDept.id,
        name: "Software Engineer",
        grade: "L2",
      },
      {
        department_id: engDept.id,
        name: "Senior Software Engineer",
        grade: "L4",
      },
      {
        department_id: engDept.id,
        name: "Engineering Manager",
        grade: "M3",
      },
      {
        department_id: hrDept.id,
        name: "HR Manager",
        grade: "M3",
      },
      {
        department_id: hrDept.id,
        name: "HR Executive",
        grade: "L2",
      },
    ];

    for (const designation of designations) {
      await Designation.findOrCreate({
        where: {
          company_id: company.id,
          name: designation.name,
        },
        defaults: {
          company_id: company.id,
          department_id: designation.department_id,
          name: designation.name,
          grade: designation.grade,
          is_active: true,
        },
        transaction,
      });
    }

    logger.info("✅ Designations Seeded");

    // ─── Super Admin User ─────────────────────────────────────────
    const superAdminPassword = await hashPassword('123456');
    await User.upsert({
      company_id: COMPANY_ID,
      email: 'superadmin@ung.com',
      password_hash: superAdminPassword,
      role_id: superAdminRole.id,
      is_super_admin: true,
      is_active: true,
    },
      {
        transaction,
      }
    );
    logger.info('✅ Super admin created: superadmin@ung.com / 123456');


    // =========================================================
    // ADMIN USER
    // =========================================================

    const adminPassword = await hashPassword("123456");

    await User.upsert(
      {
        company_id: company.id,
        email: "admin@ung.com",
        password_hash: adminPassword,
        role_id: adminRole.id,
        is_active: true,
      },
      {
        transaction,
      }
    );

    logger.info("✅ Admin User Seeded");

    // =========================================================
    // LEAVE TYPES
    // =========================================================

    const leaveTypes = [
      {
        name: "Earned Leave",
        code: "EL",
        days_per_year: 15,
        is_paid: true,
        carry_forward: true,
        max_carry_days: 30,
      },
      {
        name: "Casual Leave",
        code: "CL",
        days_per_year: 12,
        is_paid: true,
        carry_forward: false,
        max_carry_days: 0,
      },
      {
        name: "Sick Leave",
        code: "SL",
        days_per_year: 8,
        is_paid: true,
        carry_forward: false,
        max_carry_days: 0,
      },
      {
        name: "Maternity Leave",
        code: "ML",
        days_per_year: 182,
        is_paid: true,
        carry_forward: false,
        max_carry_days: 0,
      },
      {
        name: "Paternity Leave",
        code: "PL",
        days_per_year: 15,
        is_paid: true,
        carry_forward: false,
        max_carry_days: 0,
      },
      {
        name: "Leave Without Pay",
        code: "LWP",
        days_per_year: 365,
        is_paid: false,
        carry_forward: false,
        max_carry_days: 0,
      },
    ];

    for (const leave of leaveTypes) {
      await LeaveType.findOrCreate({
        where: {
          company_id: company.id,
          code: leave.code,
        },
        defaults: {
          company_id: company.id,
          ...leave,
          is_active: true,
        },
        transaction,
      });
    }

    logger.info("✅ Leave Types Seeded");

    // =========================================================
    // COMMIT
    // =========================================================

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
      await sequelize.sync({ alter: true });

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