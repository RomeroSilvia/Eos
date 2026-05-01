import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { authRouter } from './modules/auth/auth.routes';
import { productsRouter } from './modules/products/products.routes';
import { profileRouter } from './modules/profile/profile.routes';
import { progressRouter } from './modules/progress/progress.routes';
import { routinesRouter } from './modules/routines/routines.routes';
import { errorMiddleware } from './middlewares/error.middleware';
import { notFoundMiddleware } from './middlewares/notFound.middleware';

export const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    app: 'eos-backend',
    status: 'ready',
    environment: env.nodeEnv
  });
});

app.use('/api/auth', authRouter);
app.use('/api/routines', routinesRouter);
app.use('/api/products', productsRouter);
app.use('/api/progress', progressRouter);
app.use('/api/profile', profileRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);
