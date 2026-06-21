import { Router, type RequestHandler } from 'express';
import multer, { MulterError } from 'multer';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/requireRole.middleware';
import { ApiError } from '../../utils/ApiError';
import { getSpecialistStatus, registerSpecialist, specialistHealth } from './specialists.registration.controller';
import {
  SPECIALIST_DOCUMENT_ALLOWED_MIME_TYPES,
  SPECIALIST_DOCUMENT_MAX_SIZE_BYTES
} from './specialists.constants';

export const specialistRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: SPECIALIST_DOCUMENT_MAX_SIZE_BYTES,
    files: 2
  },
  fileFilter: (_req, file, callback) => {
    if (!SPECIALIST_DOCUMENT_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      callback(new ApiError(400, 'Formato no permitido. Usá JPG, PNG o WEBP.'));
      return;
    }

    callback(null, true);
  }
});

export const handleSpecialistDocumentUpload: RequestHandler = (req, res, next) => {
  upload.fields([
    { name: 'dniPhoto', maxCount: 1 },
    { name: 'titlePhoto', maxCount: 1 }
  ])(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    next(mapSpecialistUploadError(error));
  });
};

export function mapSpecialistUploadError(error: unknown): Error {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return new ApiError(413, 'La imagen es demasiado grande. Subí una imagen de hasta 5 MB.');
    }

    if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
      return new ApiError(400, 'La solicitud debe incluir solo dniPhoto y titlePhoto.');
    }

    return new ApiError(400, 'No pudimos procesar las imagenes enviadas.');
  }

  return new ApiError(500, 'No pudimos procesar las imagenes enviadas.');
}

specialistRouter.get('/health', specialistHealth);
specialistRouter.post(
  '/register',
  authenticate,
  requireRole('specialist'),
  handleSpecialistDocumentUpload,
  registerSpecialist
);
specialistRouter.get('/status', authenticate, requireRole('specialist'), getSpecialistStatus);
