import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { chatService } from './chat.service';

export const chatHealth: RequestHandler = (_req, res) => {
  res.json(chatService.getHealth());
};

export const getMessages: RequestHandler = asyncHandler(async (req, res) => {
  const relationId = typeof req.query.relationId === 'string' ? req.query.relationId : undefined;
  const before = typeof req.query.before === 'string' ? req.query.before : undefined;
  const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;

  const result = await chatService.getMessages({
    userId: req.user.id,
    role: req.user.role ?? 'user',
    relationId,
    before,
    limit
  });

  res.json(result);
});

export const sendMessage: RequestHandler = asyncHandler(async (req, res) => {
  const relationId = (req.body as { relationId?: unknown }).relationId;
  const content = (req.body as { content?: unknown }).content;

  if (typeof content !== 'string') {
    throw new ApiError(400, 'content es requerido.');
  }

  const result = await chatService.sendMessage({
    userId: req.user.id,
    role: req.user.role ?? 'user',
    relationId: typeof relationId === 'string' ? relationId : undefined,
    content
  });

  res.status(201).json(result);
});

export const startVideoCall: RequestHandler = asyncHandler(async (req, res) => {
  const relationId = (req.body as { relationId?: unknown }).relationId;

  const result = await chatService.startVideoCall({
    userId: req.user.id,
    role: req.user.role ?? 'user',
    relationId: typeof relationId === 'string' ? relationId : undefined
  });

  res.status(201).json(result);
});

export const markMessagesAsRead: RequestHandler = asyncHandler(async (req, res) => {
  const relationId = (req.body as { relationId?: unknown }).relationId;

  const result = await chatService.markAsRead({
    userId: req.user.id,
    role: req.user.role ?? 'user',
    relationId: typeof relationId === 'string' ? relationId : undefined
  });

  res.json(result);
});

export const uploadMediaMessage: RequestHandler = asyncHandler(async (req, res) => {
  const relationId = (req.body as { relationId?: unknown }).relationId;
  const file = req.file;

  if (!file) {
    throw new ApiError(400, 'El archivo es obligatorio.');
  }

  const result = await chatService.sendMediaMessage({
    userId: req.user.id,
    role: req.user.role ?? 'user',
    relationId: typeof relationId === 'string' ? relationId : undefined,
    file
  });

  res.status(201).json(result);
});
