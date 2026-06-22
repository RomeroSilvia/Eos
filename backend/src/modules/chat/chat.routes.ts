import { Router, type RequestHandler } from 'express';
import multer, { MulterError } from 'multer';
import { authenticate } from '../../middlewares/auth.middleware';
import { ApiError } from '../../utils/ApiError';
import { MAX_CHAT_IMAGE_SIZE_BYTES, MAX_CHAT_IMAGE_SIZE_MB } from './chat.constants';
import {
  clearMessages,
  chatHealth,
  getMessageById,
  getMessages,
  startVideoCall,
  markMessagesAsRead,
  sendMessage,
  uploadMediaMessage
} from './chat.controller';

export const chatRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_CHAT_IMAGE_SIZE_BYTES,
    files: 1
  },
  fileFilter: (_req, _file, callback) => {
    callback(null, true);
  }
});

chatRouter.get('/health', chatHealth);

chatRouter.use(authenticate);

const handleChatImageUpload: RequestHandler = (req, res, next) => {
  if (!req.is('multipart/form-data')) {
    next();
    return;
  }

  upload.single('image')(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    next(mapChatImageUploadError(error));
  });
};

chatRouter.get('/messages', getMessages);
chatRouter.get('/messages/:messageId', getMessageById);
chatRouter.post('/messages', handleChatImageUpload, sendMessage);
chatRouter.post('/video-call', startVideoCall);
chatRouter.post('/media', uploadMediaMessage);
chatRouter.patch('/messages/read', markMessagesAsRead);
chatRouter.delete('/messages', clearMessages);

function mapChatImageUploadError(error: unknown): Error {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return new ApiError(413, `La imagen no puede superar los ${MAX_CHAT_IMAGE_SIZE_MB} MB.`);
    }

    if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
      return new ApiError(400, 'La solicitud debe incluir solo una imagen.');
    }

    return new ApiError(400, 'No pudimos procesar la imagen enviada.');
  }

  return new ApiError(500, 'No pudimos procesar la imagen enviada.');
}
