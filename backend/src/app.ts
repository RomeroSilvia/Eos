import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { adminRouter } from './modules/admin/admin.routes';
import { auditRouter } from './modules/audit/audit.routes';
import { authRouter } from './modules/auth/auth.routes';
import { centersRouter } from './modules/centers/centers.routes';
import { chatRouter } from './modules/chat/chat.routes';
import { notificationsRouter } from './modules/notifications/notifications.routes';
import { productsRouter } from './modules/products/products.routes';
import { profileRouter } from './modules/profile/profile.routes';
import { progressRouter } from './modules/progress/progress.routes';
import { quizRouter } from './modules/quiz/quiz.routes';
import { routinesRouter } from './modules/routines/routines.routes';
import { specialistRouter } from './modules/specialists/specialist.legacy.routes';
import { specialistsRouter } from './modules/specialists/specialists.routes';
import { subscriptionsRouter } from './modules/subscriptions/subscriptions.routes';
import { errorMiddleware } from './middlewares/error.middleware';
import { notFoundMiddleware } from './middlewares/notFound.middleware';

export const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: '10mb' }));

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.get('/api/health', (_req, res) => {
  return res.json({
    app: 'eos-backend',
    status: 'ready',
    environment: env.nodeEnv
  });
});

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/centers', centersRouter);
app.use('/api/routines', routinesRouter);
app.use('/api/products', productsRouter);
app.use('/api/progress', progressRouter);
app.use('/api/quiz', quizRouter);
app.use('/api/profile', profileRouter);
app.use('/api/specialist', specialistRouter);
app.use('/api/specialists', specialistsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/admin/subscriptions', subscriptionsRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/admin/audit-log', auditRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);
