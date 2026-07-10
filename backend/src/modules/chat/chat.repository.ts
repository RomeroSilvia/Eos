import { supabase } from '../../config/supabase';
import type { ChatMessageInsert, ChatMessageRow } from './chat.types';

type RelationRow = {
  id: string;
  client_id: string;
  specialist_id: string;
  status: 'active' | 'inactive';
};

type ProfileLite = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type UploadFileInput = {
  bucket: string;
  path: string;
  buffer: Buffer;
  contentType: string;
};

type MonthlyMessageCountInput = {
  senderId: string;
  fromIso: string;
  toIso: string;
};

export const chatRepository = {
  findActiveRelationByClientId: async (clientId: string): Promise<RelationRow | null> => {
    const { data, error } = await supabase
      .from('client_specialist_relations')
      .select('id, client_id, specialist_id, status')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  findRelationById: async (relationId: string): Promise<RelationRow | null> => {
    const { data, error } = await supabase
      .from('client_specialist_relations')
      .select('id, client_id, specialist_id, status')
      .eq('id', relationId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  findMessages: async (relationId: string, limit: number, before?: string): Promise<ChatMessageRow[]> => {
    const query = supabase
      .from('chat_messages')
      .select('*')
      .eq('relation_id', relationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    const beforeQuery = before ? query.lt('created_at', before) : query;

    const { data, error } = await beforeQuery;

    if (error) throw error;

    return (data ?? []).reverse();
  },

  findMessageById: async (relationId: string, messageId: string): Promise<ChatMessageRow | null> => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('id', messageId)
      .eq('relation_id', relationId)
      .maybeSingle();

    if (error) throw error;

    return data;
  },

  createMessage: async (payload: ChatMessageInsert): Promise<ChatMessageRow> => {
    const db = supabase as any;

    const { data, error } = await db
      .from('chat_messages')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  markMessagesAsRead: async (relationId: string, readerId: string): Promise<void> => {
    const db = supabase as any;

    const { error } = await db
      .from('chat_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('relation_id', relationId)
      .is('read_at', null)
      .neq('sender_id', readerId);

    if (error) throw error;
  },

  deleteMessagesByRelationId: async (relationId: string): Promise<void> => {
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('relation_id', relationId);

    if (error) throw error;
  },

  uploadFile: async (input: UploadFileInput): Promise<void> => {
    const { error } = await supabase.storage.from(input.bucket).upload(input.path, input.buffer, {
      contentType: input.contentType,
      upsert: false
    });

    if (error) throw error;
  },

  deleteFile: async (bucket: string, path: string): Promise<void> => {
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) throw error;
  },

  createSignedUrl: async (bucket: string, path: string, expiresIn: number): Promise<string | null> => {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);

    if (error || !data?.signedUrl) {
      return null;
    }

    return data.signedUrl;
  },

  findProfileById: async (userId: string): Promise<ProfileLite | null> => {
    const db = supabase as any;

    const { data, error } = await db
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  },

  countMonthlyTextMessagesBySender: async (input: MonthlyMessageCountInput): Promise<number> => {
    const { count, error } = await supabase
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_id', input.senderId)
      .eq('message_type', 'text')
      .gte('created_at', input.fromIso)
      .lt('created_at', input.toIso);

    if (error) throw error;
    return count ?? 0;
  },

  countMonthlyImageMessagesBySender: async (input: MonthlyMessageCountInput): Promise<number> => {
    const { count, error } = await supabase
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_id', input.senderId)
      .eq('message_type', 'image')
      .gte('created_at', input.fromIso)
      .lt('created_at', input.toIso);

    if (error) throw error;
    return count ?? 0;
  }
};
