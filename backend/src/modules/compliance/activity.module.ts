/**
 * activity.module.ts — Compatibility re-export shim
 *
 * This file previously contained everything (utility + controller + router)
 * which caused TypeScript path resolution failures.
 *
 * It has been split into:
 *   utils/activityLogger.ts          ← logActivity() utility (import this)
 *   modules/compliance/activity.service.ts
 *   modules/compliance/activity.controller.ts
 *   modules/compliance/activity.routes.ts  ← Router default export (import this in routes/index.ts)
 *
 * This shim re-exports the utility so any file that still references the old
 * path continues to compile without changes.
 *
 * @deprecated Import directly from '../../utils/activityLogger' instead.
 */

export { logActivity, logActivitySync } from '../../utils/activityLogger';
export { default } from './activity.routes';
