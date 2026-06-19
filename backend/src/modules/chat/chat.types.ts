export type ChatMessageRow = {
  id: string;
  relation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
};

export type ChatMessageInsert = {
  relation_id: string;
  sender_id: string;
  content: string;
};
