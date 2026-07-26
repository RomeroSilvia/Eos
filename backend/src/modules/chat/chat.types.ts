import type { Tables, TablesInsert } from '../../database/database.types';

export type ChatMessageRow = Tables<'chat_messages'>;

export type ChatMessageInsert = Omit<TablesInsert<'chat_messages'>, 'id' | 'read_at' | 'created_at'>;

export type ChatMessageResponse = Omit<ChatMessageRow, 'media_path'> & {
  mediaUrl?: string | null;
  mediaAvailable?: boolean;
};

export type ChatTokenSummary = {
  used: number;
  limit: number | null;
  remaining: number | null;
  isLimited: boolean;
};

export type ChatAccessSummary = {
  hasActiveSubscription: boolean;
  videoCallsEnabled: boolean;
  tokenResetWindowHours: number;
  messageTokens: ChatTokenSummary;
  imageTokens: ChatTokenSummary;
};
