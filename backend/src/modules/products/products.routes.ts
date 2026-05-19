import { Router } from 'express';
import multer from 'multer';
import { createProduct, deleteProduct, getProductById, getProducts, productsHealth, updateProduct } from './products.controller';
import { mockAuth } from '../../middlewares/mockAuth.middleware';

export const productsRouter = Router();

const upload = multer({ storage: multer.memoryStorage() });

productsRouter.get('/health', productsHealth);
productsRouter.use(mockAuth);

productsRouter.get('/', getProducts);
productsRouter.get('/:id', getProductById);
productsRouter.post('/', upload.single('image'), createProduct);
productsRouter.patch('/:id', upload.single('image'), updateProduct);
productsRouter.delete('/:id', deleteProduct);
