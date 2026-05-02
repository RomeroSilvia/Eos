import { Router } from 'express';
import { createProduct, deleteProduct, getProductById, getProducts, updateProduct } from './products.controller';

export const productsRouter = Router();

productsRouter.get('/', getProducts);
productsRouter.get('/:id', getProductById);
productsRouter.post('/', createProduct);
productsRouter.patch('/:id', updateProduct);
productsRouter.delete('/:id', deleteProduct);