import { Router } from "express"
import { authenticate } from "../auth/auth.middleware";
import { requireSuperAdmin } from "./superAdmin.middleware";
import {
    getPlatformStats,
    listCompanies,
    getCompany,
    createCompany,
    updateCompany,
    suspendCompany,
    activateCompany,
} from "./superAdmin.controller"
import { body, param } from 'express-validator';
import { validate } from '../../middleware/validate.middleware';

export const superAdminRouter = Router();
superAdminRouter.use(authenticate, requireSuperAdmin);

superAdminRouter.get('/stats', getPlatformStats);
superAdminRouter.get('/companies', listCompanies);
superAdminRouter.get('/companies/:id', [param('id').isInt().toInt()], validate, getCompany);
superAdminRouter.post('/companies', [body('name').trim().notEmpty(), body('admin_email').isEmail(), body('admin_password').isLength({ min: 8 })], validate, createCompany);
superAdminRouter.put('/companies/:id', [param('id').isInt().toInt()], validate, updateCompany);
superAdminRouter.post('/companies/:id/suspend', [param('id').isInt().toInt()], validate, suspendCompany);
superAdminRouter.post('/companies/:id/activate', [param('id').isInt().toInt()], validate, activateCompany);
// superAdminRouter.post('/switch-company/:id', requireSuperAdmin, [param('id').isInt().toInt()], validate, switchCompany,);
// superAdminRouter.post('/exit-company', requireSuperAdmin, exitCompany);