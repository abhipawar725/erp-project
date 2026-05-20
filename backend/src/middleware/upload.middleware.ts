import multer, { FileFilterCallback, StorageEngine } from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request } from 'express';
import { env } from '../config/env';

// ─────────────────────────────────────────────────────────────────────────────
// Directory helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Ensures the upload sub-directory exists, creates it recursively if not. */
function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/** Build an absolute path under the configured upload root. */
function uploadPath(...segments: string[]): string {
  return path.join(process.cwd(), env.upload.dir, ...segments);
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage engine factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a disk-storage engine that:
 *  - Places files under `uploads/<subDir>/`
 *  - Uses a cryptographically random filename to prevent collisions and
 *    to avoid leaking original file names in URLs.
 *  - Preserves the original file extension (lowercased).
 */
function diskStorage(subDir: string): StorageEngine {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = uploadPath(subDir);
      ensureDir(dir);
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const randomHex = crypto.randomBytes(16).toString('hex');
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${randomHex}${ext}`);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// File filter factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a Multer file-filter function that rejects files whose MIME type
 * does not match the provided regex.
 *
 * Checks both `file.mimetype` and the extension from `file.originalname` as a
 * secondary guard (some clients spoof MIME types).
 */
function makeFileFilter(allowedMimeRegex: RegExp, allowedExtensions: string[]) {
  return (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const mimeOk = allowedMimeRegex.test(file.mimetype);
    const extOk  = allowedExtensions.includes(ext);

    if (mimeOk && extOk) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Invalid file type. Received "${file.mimetype}" (.${ext}). ` +
          `Allowed: ${allowedExtensions.join(', ')}`,
        ),
      );
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Configured Multer instances
// ─────────────────────────────────────────────────────────────────────────────

/**
 * uploadAvatar
 * Accepts: JPEG, PNG, WebP images
 * Limit:   2 MB
 * Dir:     uploads/avatars/
 * Usage:   router.post('/avatar', uploadAvatar.single('avatar'), handler)
 */
export const uploadAvatar = multer({
  storage: diskStorage('avatars'),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: makeFileFilter(
    /^image\/(jpeg|png|webp)$/,
    ['jpg', 'jpeg', 'png', 'webp'],
  ),
});

/**
 * uploadResume
 * Accepts: PDF, Word (.doc, .docx)
 * Limit:   10 MB (from env)
 * Dir:     uploads/resumes/
 * Usage:   router.post('/resume', uploadResume.single('resume'), handler)
 */
export const uploadResume = multer({
  storage: diskStorage('resumes'),
  limits: { fileSize: env.upload.maxFileSize },
  fileFilter: makeFileFilter(
    /^(application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document))$/,
    ['pdf', 'doc', 'docx'],
  ),
});

/**
 * uploadDocument
 * Accepts: PDF, Word, Excel, images (JPG, PNG)
 * Limit:   10 MB (from env)
 * Dir:     uploads/documents/
 * Usage:   router.post('/documents', uploadDocument.single('document'), handler)
 */
export const uploadDocument = multer({
  storage: diskStorage('documents'),
  limits: { fileSize: env.upload.maxFileSize },
  fileFilter: makeFileFilter(
    /^(application\/(pdf|msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet))|image\/(jpeg|png))$/,
    ['pdf', 'doc', 'docx', 'xlsx', 'xls', 'jpg', 'jpeg', 'png'],
  ),
});

/**
 * uploadBulkCSV
 * Accepts: CSV files only
 * Limit:   5 MB
 * Dir:     uploads/bulk/
 * Usage:   router.post('/import', uploadBulkCSV.single('file'), handler)
 */
export const uploadBulkCSV = multer({
  storage: diskStorage('bulk'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: makeFileFilter(
    /^(text\/csv|application\/vnd\.ms-excel)$/,
    ['csv'],
  ),
});

// ─────────────────────────────────────────────────────────────────────────────
// Multer error handler
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Wraps a Multer middleware and converts MulterError instances into a clean
 * API response instead of crashing the server.
 *
 * Usage:
 *   router.post('/avatar', handleUpload(uploadAvatar.single('avatar')), controller);
 */
export function handleUpload(
  multerMiddleware: (req: Request, res: any, cb: (err?: any) => void) => void,
) {
  return (req: Request, res: any, next: any): void => {
    multerMiddleware(req, res, (err) => {
      if (!err) { next(); return; }

      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({
          success: false,
          message: `File too large. Maximum allowed size is ${Math.round(env.upload.maxFileSize / 1024 / 1024)} MB`,
          data: null,
          errors: null,
        });
        return;
      }

      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        res.status(400).json({
          success: false,
          message: `Unexpected field name "${err.field}". Check the field name in your request.`,
          data: null,
          errors: null,
        });
        return;
      }

      // File type rejection or other errors
      res.status(400).json({
        success: false,
        message: err.message || 'File upload failed',
        data: null,
        errors: null,
      });
    });
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// URL builder (for generating public URLs after upload)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Converts a saved filename back into a publicly accessible URL path.
 *
 * Usage in controller after a successful upload:
 *   const url = buildUploadUrl('avatars', req.file.filename);
 *   // → '/uploads/avatars/1748123456789-abc123.jpg'
 */
export function buildUploadUrl(subDir: string, filename: string): string {
  return `/uploads/${subDir}/${filename}`;
}
