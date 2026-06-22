export type ChatMessageRow = {
  id: string;
  relation_id: string;
  sender_id: string;
  content: string;
  message_type?: 'text' | 'image' | null;
  media_path?: string | null;
  media_mime_type?: string | null;
  media_size?: number | null;
  read_at: string | null;
  created_at: string;
};

export type ChatMessageInsert = {
  relation_id: string;
  sender_id: string;
  content: string;
  message_type?: 'text' | 'image';
  media_path?: string | null;
  media_mime_type?: string | null;
  media_size?: number | null;
};

export type ChatMessageResponse = Omit<ChatMessageRow, 'media_path'> & {
  mediaUrl?: string | null;
  mediaAvailable?: boolean;
};
