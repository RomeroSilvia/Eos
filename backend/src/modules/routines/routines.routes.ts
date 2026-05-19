import { Router } from 'express';
import { mockAuth } from '../../middlewares/mockAuth.middleware';
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

routinesRouter.use(mockAuth);

routinesRouter.get('/', getUserRoutines);
routinesRouter.get('/:id', getRoutineById);
routinesRouter.post('/', createRoutine);
routinesRouter.patch('/:id', updateRoutine);
routinesRouter.delete('/:id', deleteRoutine);

routinesRouter.get('/:id/steps', getStepsByRoutine);
routinesRouter.post('/:id/steps', createStep);
routinesRouter.patch('/steps/:stepId', updateStep);
routinesRouter.delete('/steps/:stepId', deleteStep);

routinesRouter.get('/steps/:stepId/products', getStepProducts);
routinesRouter.put('/steps/:stepId/products', setStepProducts);
routinesRouter.post('/steps/:stepId/products', attachProduct);
routinesRouter.delete('/steps/:stepId/products/:productId', detachProduct);