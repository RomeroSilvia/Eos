import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import {
  getUserRoutines,
  getRoutineById,
  createRoutine,
  updateRoutine,
  deleteRoutine,
  getStepsByRoutine,
  createStep,
  updateStep,
  deleteStep,
  getStepProducts,
  setStepProducts,
  attachProduct,
  detachProduct,
  routinesHealth
} from './routines.controller';

export const routinesRouter = Router();

routinesRouter.get('/health', routinesHealth);

routinesRouter.use(authenticate);

// Rutas de productos por paso — deben ir antes que /:id para evitar conflictos
routinesRouter.get('/steps/:stepId/products', getStepProducts);
routinesRouter.put('/steps/:stepId/products', setStepProducts);
routinesRouter.post('/steps/:stepId/products', attachProduct);
routinesRouter.delete('/steps/:stepId/products/:productId', detachProduct);

// Rutas de pasos
routinesRouter.patch('/steps/:stepId', updateStep);
routinesRouter.delete('/steps/:stepId', deleteStep);

// Rutas de rutinas — /:id al final para no interceptar rutas específicas
routinesRouter.get('/', getUserRoutines);
routinesRouter.post('/', createRoutine);
routinesRouter.get('/:id/steps', getStepsByRoutine);
routinesRouter.post('/:id/steps', createStep);
routinesRouter.get('/:id', getRoutineById);
routinesRouter.patch('/:id', updateRoutine);
routinesRouter.delete('/:id', deleteRoutine);
