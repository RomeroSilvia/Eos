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

  uploadFile: async (input: UploadFileInput): Promise<void> => {
    const { error } = await supabase.storage.from(input.bucket).upload(input.path, input.buffer, {
      contentType: input.contentType,
      upsert: false
    });

    if (error) throw error;
  },

  getPublicUrl: (bucket: string, path: string): string => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
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
  }
};
