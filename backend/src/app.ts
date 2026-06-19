import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { adminRouter } from './modules/admin/admin.routes';
import { authRouter } from './modules/auth/auth.routes';
import { productsRouter } from './modules/products/products.routes';
import { profileRouter } from './modules/profile/profile.routes';
import { progressRouter } from './modules/progress/progress.routes';
import { quizRouter } from './modules/quiz/quiz.routes';
import { routinesRouter } from './modules/routines/routines.routes';
import { specialistRouter } from './modules/specialist/specialist.routes';
import { errorMiddleware } from './middlewares/error.middleware';
import { notFoundMiddleware } from './middlewares/notFound.middleware';

export const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  return res.json({
    app: 'eos-backend',
    status: 'ready',
    environment: env.nodeEnv
  });
});

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/routines', routinesRouter);
app.use('/api/products', productsRouter);
app.use('/api/progress', progressRouter);
app.use('/api/profile', profileRouter);
app.use('/api/quiz', quizRouter);
app.use('/api/specialist', specialistRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);
