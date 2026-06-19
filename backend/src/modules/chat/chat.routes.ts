import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middlewares/auth.middleware';
import {
	chatHealth,
	getMessages,
	startVideoCall,
	markMessagesAsRead,
	sendMessage,
	uploadMediaMessage
} from './chat.controller';

export const chatRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

chatRouter.get('/health', chatHealth);

chatRouter.use(authenticate);

chatRouter.get('/messages', getMessages);
chatRouter.post('/messages', sendMessage);
chatRouter.post('/video-call', startVideoCall);
chatRouter.post('/media', upload.single('file'), uploadMediaMessage);
chatRouter.patch('/messages/read', markMessagesAsRead);
