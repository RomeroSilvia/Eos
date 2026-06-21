import { supabase } from '../../config/supabase';
import type { PushTokenRow } from '../../database/schema.types';
import { TABLE_NAMES } from '../../database/tableNames';

export type NotificationHistoryRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  kind: string;
  is_read: boolean;
  created_at: string;
};

export const notificationsRepository = {
  upsertToken: async (
    userId: string,
    expoToken: string,
    platform: 'ios' | 'android'
  ): Promise<PushTokenRow> => {
    const db = supabase as any;

    const { data, error } = await db
      .from(TABLE_NAMES.pushTokens)
      .upsert(
        { user_id: userId, expo_token: expoToken, platform, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
      .select('*')
      .single();

    if (error) throw error;
    return data as PushTokenRow;
  },

  deleteToken: async (userId: string): Promise<void> => {
    const { error } = await supabase
      .from(TABLE_NAMES.pushTokens as any)
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  },

  findTokenByUserId: async (userId: string): Promise<PushTokenRow | null> => {
    const db = supabase as any;

    const { data, error } = await db
      .from(TABLE_NAMES.pushTokens)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  },

  findTokensByUserIds: async (userIds: string[]): Promise<PushTokenRow[]> => {
    const db = supabase as any;

    const { data, error } = await db
      .from(TABLE_NAMES.pushTokens)
      .select('*')
      .in('user_id', userIds);

    if (error) throw error;
    return (data ?? []) as PushTokenRow[];
  },

  saveNotification: async (
    userId: string,
    title: string,
    body: string,
    kind: string
  ): Promise<void> => {
    const db = supabase as any;
    const { error } = await db
      .from(TABLE_NAMES.notificationHistory)
      .insert({ user_id: userId, title, body, kind });
    if (error) throw error;
  },

  findNotificationsByUserId: async (userId: string): Promise<NotificationHistoryRow[]> => {
    const db = supabase as any;
    const { data, error } = await db
      .from(TABLE_NAMES.notificationHistory)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []) as NotificationHistoryRow[];
  },

  markNotificationRead: async (id: string, userId: string): Promise<void> => {
    const db = supabase as any;
    const { error } = await db
      .from(TABLE_NAMES.notificationHistory)
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
  }
};
