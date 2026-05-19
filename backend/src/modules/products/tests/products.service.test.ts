import { productsService } from '../products.service';
import { productsRepository } from '../products.repository';
import { supabase } from '../../../config/supabase';
import { ApiError } from '../../../utils/ApiError';
import type { ProductRow } from '../../../database/schema.types';

jest.mock('../products.repository', () => ({
  productsRepository: {
    findAllByUserId: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn()
  }
}));

jest.mock('../../../config/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn()
    }
  }
}));

const mockedRepo = jest.mocked(productsRepository);
const mockedStorageFrom = supabase.storage.from as jest.Mock;

function makeProduct(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    id: overrides.id ?? 'product-1',
    user_id: overrides.user_id ?? 'user-1',
    name: overrides.name ?? 'Crema hidratante',
    brand: overrides.brand ?? 'Cerave',
    category: overrides.category ?? 'moisturizer',
    notes: overrides.notes ?? null,
    image_url: overrides.image_url ?? null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z'
  };
}

function makeFile(originalname = 'photo.jpg'): Express.Multer.File {
  return {
    fieldname: 'image',
    originalname,
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024,
    buffer: Buffer.from('fake-image-data'),
    destination: '',
    filename: '',
    path: '',
    stream: null as any
  };
}

describe('productsService', () => {
  let mockUpload: jest.Mock;
  let mockGetPublicUrl: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUpload = jest.fn().mockResolvedValue({ error: null });
    mockGetPublicUrl = jest.fn().mockReturnValue({
      data: { publicUrl: 'https://cdn.example.com/image.jpg' }
    });

    mockedStorageFrom.mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl
    });
  });

  describe('getAll', () => {
    it('devuelve todos los productos del usuario', async () => {
      const products = [makeProduct({ id: 'p-1' }), makeProduct({ id: 'p-2', name: 'Sérum' })];
      mockedRepo.findAllByUserId.mockResolvedValue(products);

      const result = await productsService.getAll('user-1');

      expect(mockedRepo.findAllByUserId).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(products);
    });

    it('devuelve array vacío cuando el usuario no tiene productos', async () => {
      mockedRepo.findAllByUserId.mockResolvedValue([]);

      const result = await productsService.getAll('user-1');

      expect(result).toEqual([]);
    });

    it('propaga errores del repositorio', async () => {
      mockedRepo.findAllByUserId.mockRejectedValue(new Error('Supabase failed'));

      await expect(productsService.getAll('user-1')).rejects.toThrow('Supabase failed');
    });
  });

  describe('getById', () => {
    it('devuelve el producto cuando existe', async () => {
      const product = makeProduct();
      mockedRepo.findById.mockResolvedValue(product);

      const result = await productsService.getById('product-1', 'user-1');

      expect(mockedRepo.findById).toHaveBeenCalledWith('product-1', 'user-1');
      expect(result).toEqual(product);
    });

    it('lanza ApiError 404 cuando el producto no existe', async () => {
      mockedRepo.findById.mockResolvedValue(null);

      await expect(productsService.getById('inexistente', 'user-1')).rejects.toThrow(ApiError);
      await expect(productsService.getById('inexistente', 'user-1')).rejects.toMatchObject({
        statusCode: 404
      });
    });
  });

  describe('uploadImage', () => {
    it('sube la imagen y devuelve la URL pública', async () => {
      const file = makeFile('crema.jpg');

      const url = await productsService.uploadImage(file);

      expect(mockedStorageFrom).toHaveBeenCalledWith('product-images');
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/\.jpg$/),
        file.buffer,
        { contentType: 'image/jpeg' }
      );
      expect(url).toBe('https://cdn.example.com/image.jpg');
    });

    it('usa la extensión correcta según el nombre del archivo', async () => {
      const file = makeFile('foto.png');

      await productsService.uploadImage(file);

      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/\.png$/),
        expect.anything(),
        expect.anything()
      );
    });

    it('lanza ApiError 500 cuando falla la subida', async () => {
      mockUpload.mockResolvedValue({ error: { message: 'Bucket not found' } });

      await expect(productsService.uploadImage(makeFile())).rejects.toThrow(ApiError);
      await expect(productsService.uploadImage(makeFile())).rejects.toMatchObject({
        statusCode: 500
      });
    });
  });

  describe('create', () => {
    it('crea un producto sin imagen', async () => {
      const product = makeProduct();
      mockedRepo.create.mockResolvedValue(product);

      const result = await productsService.create('user-1', {
        name: 'Crema hidratante',
        brand: 'Cerave',
        category: 'moisturizer',
        notes: 'Para piel seca'
      });

      expect(mockedRepo.create).toHaveBeenCalledWith({
        user_id: 'user-1',
        name: 'Crema hidratante',
        brand: 'Cerave',
        category: 'moisturizer',
        notes: 'Para piel seca',
        image_url: null
      });
      expect(result).toEqual(product);
    });

    it('crea un producto con imagen, subiendo el archivo primero', async () => {
      const product = makeProduct({ image_url: 'https://cdn.example.com/image.jpg' });
      mockedRepo.create.mockResolvedValue(product);

      const result = await productsService.create('user-1', { name: 'Crema', brand: 'Cerave', category: 'moisturizer' }, makeFile());

      expect(mockUpload).toHaveBeenCalled();
      expect(mockedRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ image_url: 'https://cdn.example.com/image.jpg' })
      );
      expect(result).toEqual(product);
    });

    it('lanza ApiError 500 cuando el repositorio no devuelve el producto creado', async () => {
      mockedRepo.create.mockResolvedValue(null);

      await expect(
        productsService.create('user-1', { name: 'Crema', brand: 'Cerave', category: 'moisturizer' })
      ).rejects.toMatchObject({ statusCode: 500 });
    });
  });

  describe('update', () => {
    it('actualiza los campos del producto', async () => {
      const updated = makeProduct({ name: 'Nuevo nombre' });
      mockedRepo.update.mockResolvedValue(updated);

      const result = await productsService.update('product-1', 'user-1', { name: 'Nuevo nombre' });

      expect(mockedRepo.update).toHaveBeenCalledWith(
        'product-1',
        'user-1',
        expect.objectContaining({ name: 'Nuevo nombre' })
      );
      expect(result).toEqual(updated);
    });

    it('sube la imagen nueva cuando se envía archivo', async () => {
      mockedRepo.update.mockResolvedValue(makeProduct({ image_url: 'https://cdn.example.com/image.jpg' }));

      await productsService.update('product-1', 'user-1', { name: 'Crema' }, makeFile());

      expect(mockUpload).toHaveBeenCalled();
      expect(mockedRepo.update).toHaveBeenCalledWith(
        'product-1',
        'user-1',
        expect.objectContaining({ image_url: 'https://cdn.example.com/image.jpg' })
      );
    });

    it('no incluye image_url en el payload cuando no se envía archivo', async () => {
      mockedRepo.update.mockResolvedValue(makeProduct());

      await productsService.update('product-1', 'user-1', { name: 'Crema' });

      expect(mockUpload).not.toHaveBeenCalled();
      const payload = mockedRepo.update.mock.calls[0][2];
      expect(payload).not.toHaveProperty('image_url');
    });

    it('lanza ApiError 404 cuando el repositorio devuelve null', async () => {
      mockedRepo.update.mockResolvedValue(null);

      await expect(
        productsService.update('inexistente', 'user-1', { name: 'Crema' })
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('remove', () => {
    it('elimina el producto', async () => {
      mockedRepo.remove.mockResolvedValue(true);

      await productsService.remove('product-1', 'user-1');

      expect(mockedRepo.remove).toHaveBeenCalledWith('product-1', 'user-1');
    });

    it('propaga errores del repositorio', async () => {
      mockedRepo.remove.mockRejectedValue(new Error('Supabase failed'));

      await expect(productsService.remove('product-1', 'user-1')).rejects.toThrow('Supabase failed');
    });
  });
});
