export const PERMISSIONS = [
        // Employees
        { module: 'employees', action: 'view', slug: 'employees:view', description: 'View employee list and profiles' },
        { module: 'employees', action: 'edit', slug: 'employees:edit', description: 'Edit employee details' },
        { module: 'employees', action: 'delete', slug: 'employees:delete', description: 'Delete employee records' },
        { module: 'employees', action: 'download', slug: 'employees:download', description: 'Download employee documents' },
        { module: 'employees', action: 'mask', slug: 'employees:mask', description: 'View masked sensitive fields (salary, Aadhaar, PAN)' },

        // Aptitude
        { module: 'apptitude', action: 'view', slug: 'apptitude:view', description: 'View candidates and pipeline' },
        { module: 'apptitude', action: 'edit', slug: 'apptitude:edit', description: 'Edit apptitude records' },
        { module: 'apptitude', action: 'delete', slug: 'apptitude:delete', description: 'Delete candidates' },
        { module: 'apptitude', action: 'download', slug: 'apptitude:download', description: 'Download resumes and documents' },
        { module: 'apptitude', action: 'mask', slug: 'apptitude:mask', description: 'View masked candidate fields' },

        // Recruitment
        { module: 'recruitment', action: 'view', slug: 'recruitment:view', description: 'View candidates and pipeline' },
        { module: 'recruitment', action: 'edit', slug: 'recruitment:edit', description: 'Edit recruitment records' },
        { module: 'recruitment', action: 'delete', slug: 'recruitment:delete', description: 'Delete candidates' },
        { module: 'recruitment', action: 'download', slug: 'recruitment:download', description: 'Download resumes and documents' },
        { module: 'recruitment', action: 'mask', slug: 'recruitment:mask', description: 'View masked candidate fields' },

        // Departments
        { module: 'departments', action: 'view', slug: 'departments:view', description: 'View departments' },
        { module: 'departments', action: 'edit', slug: 'departments:edit', description: 'Edit departments' },
        { module: 'departments', action: 'delete', slug: 'departments:delete', description: 'Delete departments' },
        { module: 'departments', action: 'download', slug: 'departments:download', description: 'Download department data' },
        { module: 'departments', action: 'mask', slug: 'departments:mask', description: 'Mask department data' },

        // Designations
        { module: 'designations', action: 'view', slug: 'designations:view', description: 'View designations' },
        { module: 'designations', action: 'edit', slug: 'designations:edit', description: 'Edit designations' },
        { module: 'designations', action: 'delete', slug: 'designations:delete', description: 'Delete designations' },
        { module: 'designations', action: 'download', slug: 'designations:download', description: 'Download designation data' },
        { module: 'designations', action: 'mask', slug: 'designations:mask', description: 'Mask designation data' },

        // Settings
        { module: 'settings', action: 'view', slug: 'settings:view', description: 'View system settings' },
        { module: 'settings', action: 'edit', slug: 'settings:edit', description: 'Edit system settings' },
        { module: 'settings', action: 'delete', slug: 'settings:delete', description: 'Delete roles and groups' },
        { module: 'settings', action: 'download', slug: 'settings:download', description: 'Download settings data' },
        { module: 'settings', action: 'mask', slug: 'settings:mask', description: 'Mask settings data' },

        // Companies
        { module: 'companies', action: 'view', slug: 'companies:view', description: 'View all companies' },
        { module: 'companies', action: 'edit', slug: 'companies:edit', description: 'Edit company details' },
        { module: 'companies', action: 'delete', slug: 'companies:delete', description: 'Delete or suspend company' },
        { module: 'companies', action: 'download', slug: 'companies:download', description: 'Download company data' },
        { module: 'companies', action: 'mask', slug: 'companies:mask', description: 'Mask company data' },

        // Super Admin
        { module: 'super_admin', action: 'access', slug: 'super_admin:access', description: 'Access super admin features' },
        { module: 'super_admin', action: 'manage', slug: 'super_admin:manage', description: 'Manage other super admin users' },
] as const;