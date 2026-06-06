export const PERMISSIONS = [
        // Employees
        { module: 'employees', action: 'view', slug: 'employees:view', description: 'View employee list and profiles' },
        { module: 'employees', action: 'edit', slug: 'employees:edit', description: 'Edit employee details' },
        { module: 'employees', action: 'delete', slug: 'employees:delete', description: 'Delete employee records' },
        { module: 'employees', action: 'download', slug: 'employees:download', description: 'Download employee documents' },
        { module: 'employees', action: 'mask', slug: 'employees:mask', description: 'View masked sensitive fields (salary, Aadhaar, PAN)' },

        // Aptitude
        { module: 'aptitude', action: 'view', slug: 'aptitude:view', description: 'View candidates and pipeline' },
        { module: 'aptitude', action: 'edit', slug: 'aptitude:edit', description: 'Edit aptitude records' },
        { module: 'aptitude', action: 'delete', slug: 'aptitude:delete', description: 'Delete candidates' },
        { module: 'aptitude', action: 'download', slug: 'aptitude:download', description: 'Download resumes and documents' },
        { module: 'aptitude', action: 'mask', slug: 'aptitude:mask', description: 'View masked candidate fields' },

        // Recruitment
        { module: 'recruitment', action: 'view', slug: 'recruitment:view', description: 'View candidates and pipeline' },
        { module: 'recruitment', action: 'edit', slug: 'recruitment:edit', description: 'Edit recruitment records' },
        { module: 'recruitment', action: 'delete', slug: 'recruitment:delete', description: 'Delete candidates' },
        { module: 'recruitment', action: 'download', slug: 'recruitment:download', description: 'Download resumes and documents' },
        { module: 'recruitment', action: 'mask', slug: 'recruitment:mask', description: 'View masked candidate fields' },

        // Departments
        { module: 'department', action: 'view', slug: 'department:view', description: 'View department' },
        { module: 'department', action: 'edit', slug: 'department:edit', description: 'Edit department' },
        { module: 'department', action: 'delete', slug: 'department:delete', description: 'Delete department' },
        { module: 'department', action: 'download', slug: 'department:download', description: 'Download department data' },
        { module: 'department', action: 'mask', slug: 'department:mask', description: 'Mask department data' },

        // Designations
        { module: 'designation', action: 'view', slug: 'designation:view', description: 'View designation' },
        { module: 'designation', action: 'edit', slug: 'designation:edit', description: 'Edit designation' },
        { module: 'designation', action: 'delete', slug: 'designation:delete', description: 'Delete designation' },
        { module: 'designation', action: 'download', slug: 'designation:download', description: 'Download designation data' },
        { module: 'designation', action: 'mask', slug: 'designation:mask', description: 'Mask designation data' },

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