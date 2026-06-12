import { Request, Response, Router, NextFunction } from 'express';
import {employeeController} from "./employee.controller"
import { authenticate, authorize } from '../auth/auth.middleware';
import { asyncHandler } from '../../middleware/errorHandler.middleware';
import { rbacCheck } from '../../middleware/rbac.middleware';
import {
  listValidation, idValidation, STEP_VALIDATORS,
} from './employee.validation';


export const employeeRoutes = Router();
employeeRoutes.use(authenticate);

// Static routes — ALL must be declared before /:id to avoid param collision
employeeRoutes.get('/summary',              asyncHandler(employeeController.summary));
employeeRoutes.get('/next-code',            asyncHandler(employeeController.nextCode));
employeeRoutes.get('/field-permissions',    asyncHandler(employeeController.fieldPermissions));
employeeRoutes.get('/template',             employeeController.downloadTemplate);

// Manager search (must be before /:id — otherwise Express treats 'search' as an id param)
employeeRoutes.get('/managers/search',      asyncHandler(employeeController.managersSearch));
employeeRoutes.get('/managers/:id',         asyncHandler(employeeController.managerById));

// Draft
employeeRoutes.post('/draft',                asyncHandler(employeeController.saveDraft));
employeeRoutes.get('/draft/:sessionId',      asyncHandler(employeeController.getDraft));
employeeRoutes.delete('/draft/:sessionId',   asyncHandler(employeeController.discardDraft));

// Bulk
employeeRoutes.get('/bulk-upload/template',  employeeController.downloadTemplate);
employeeRoutes.post('/bulk-upload',
  rbacCheck('employees', 'create'),
  ...employeeController.bulkUpload,
);

// CRUD
employeeRoutes.get('/',
  rbacCheck('employees', 'view'),
  listValidation,
  asyncHandler(employeeController.getAll),
);

employeeRoutes.post('/',
  rbacCheck('employees', 'create'),
  asyncHandler(employeeController.create),
);

employeeRoutes.get('/:id',
  rbacCheck('employees', 'view'),
  idValidation,
  asyncHandler(employeeController.getById),
);

employeeRoutes.delete('/:id',
  rbacCheck('employees', 'delete'),
  idValidation,
  asyncHandler(employeeController.remove),
);

// Step update — dynamic validation by step name
employeeRoutes.patch('/:id/step/:step',
  rbacCheck('employees', 'edit'),
  idValidation,
  (req: Request, res: Response, next: NextFunction) => {
    const validators = STEP_VALIDATORS[req.params.step] || [];
    if (!validators.length) return next();
    // Run validators sequentially
    Promise.all(validators.map((v: any) => v.run(req)))
      .then(() => next())
      .catch(next);
  },
  asyncHandler(employeeController.updateStep),
);