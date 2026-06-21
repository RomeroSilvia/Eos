import { MulterError } from 'multer';
import { ApiError } from '../../../utils/ApiError';
import { mapSpecialistUploadError } from '../specialist.legacy.routes';

describe('specialistRoutes upload', () => {
  it('rechaza archivo demasiado grande con 413', () => {
    const result = mapSpecialistUploadError(new MulterError('LIMIT_FILE_SIZE'));

    expect(result).toMatchObject({
      statusCode: 413,
      message: 'La imagen es demasiado grande. Subí una imagen de hasta 5 MB.'
    });
  });

  it('rechaza MIME invalido con 400', () => {
    const result = mapSpecialistUploadError(new ApiError(400, 'Formato no permitido. Usá JPG, PNG o WEBP.'));

    expect(result).toMatchObject({
      statusCode: 400,
      message: 'Formato no permitido. Usá JPG, PNG o WEBP.'
    });
  });

  it('rechaza archivos o campos inesperados con 400', () => {
    const result = mapSpecialistUploadError(new MulterError('LIMIT_UNEXPECTED_FILE'));

    expect(result).toMatchObject({
      statusCode: 400,
      message: 'La solicitud debe incluir solo dniPhoto y titlePhoto.'
    });
  });
});
