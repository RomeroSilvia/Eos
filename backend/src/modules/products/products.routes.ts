import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import {
	createProduct,
	deleteProduct,
	forceDeleteProduct,
	getProductById,
	getProducts,
	productsHealth,
	replaceProduct,
	updateProduct
} from './products.controller';

export const productsRouter = Router();

productsRouter.get('/health', productsHealth);

productsRouter.use(authenticate);

productsRouter.get('/', getProducts);
productsRouter.get('/:id', getProductById);
productsRouter.post('/', createProduct);
productsRouter.patch('/:id', updateProduct);
productsRouter.delete('/:id', deleteProduct);
productsRouter.delete('/:id/force', forceDeleteProduct);
productsRouter.put('/:id/replace', replaceProduct);
