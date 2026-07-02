import { Router, type RequestHandler } from 'express';
import multer, { MulterError } from 'multer';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/requireRole.middleware';
import { ApiError } from '../../utils/ApiError';
import {
  createCenter,
  deleteCenter,
  getCenterDashboard,
  listCenterSpecialists,
  listCenters,
  updateCenter,
  uploadCenterImage
} from './centers.controller';

const MAX_CENTER_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_CENTER_IMAGE_SIZE_MB = 5;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_CENTER_IMAGE_SIZE_BYTES,
    files: 1
  }
});

export const centersRouter = Router();

centersRouter.use(authenticate);
centersRouter.use(requireRole('center_admin'));

centersRouter.get('/', listCenters);
centersRouter.get('/:centerId/dashboard', getCenterDashboard);
centersRouter.get('/:centerId/specialists', listCenterSpecialists);
centersRouter.post('/', createCenter);
centersRouter.post('/:centerId/image', handleCenterImageUpload, uploadCenterImage);
centersRouter.patch('/:centerId', updateCenter);
centersRouter.delete('/:centerId', deleteCenter);

function handleCenterImageUpload(req: Parameters<RequestHandler>[0], res: Parameters<RequestHandler>[1], next: Parameters<RequestHandler>[2]): void {
  upload.single('image')(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    next(mapCenterImageUploadError(error));
  });
}

function mapCenterImageUploadError(error: unknown): Error {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return new ApiError(413, `La imagen no puede superar los ${MAX_CENTER_IMAGE_SIZE_MB} MB.`);
    }

    if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
      return new ApiError(400, 'La solicitud debe incluir solo una imagen.');
    }

    return new ApiError(400, 'No pudimos procesar la imagen enviada.');
  }

  return new ApiError(500, 'No pudimos procesar la imagen enviada.');
}
