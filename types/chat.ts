export type ChatMessageKind = 'text' | 'image' | 'call_invite' | 'call_ended';

export type ChatParsedPayload = {
  kind: ChatMessageKind;
  text?: string;
  url?: string;
  title?: string;
};

export type ChatMessage = {
  id: string;
  relation_id: string;
  sender_id: string;
  content: string;
  message_type?: 'text' | 'image';
  mediaPath?: string | null;
  mediaUrl?: string | null;
  mediaAvailable?: boolean;
  media_mime_type?: string | null;
  media_size?: number | null;
  read_at: string | null;
  created_at: string;
};

export type ChatParticipant = {
  id: string;
  fullName: string | null;
  email: string | null;
};

export type ChatTokenSummary = {
  used: number;
  limit: number | null;
  remaining: number | null;
  isLimited: boolean;
};

export type ChatAccessInfo = {
  hasActiveSubscription: boolean;
  videoCallsEnabled: boolean;
  tokenResetWindowHours: number;
  messageTokens: ChatTokenSummary;
  imageTokens: ChatTokenSummary;
};
