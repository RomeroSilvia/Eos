import { createClient } from '@supabase/supabase-js';
import { env } from '../../config/env';
import { supabase } from '../../config/supabase';
import type { ProfileInsert, ProfileRow, ProfileUpdate } from '../../database/schema.types';

type SupabaseResult<TData> = {
  data: TData;
  error: { message: string; status?: number } | null;
};

type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

type AuthSession = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
};

type AuthResponse = {
  user: AuthUser | null;
  session: AuthSession | null;
};

type CreateAuthUserInput = {
  email: string;
  password: string;
  email_confirm: boolean;
  user_metadata: Record<string, unknown>;
};

export const authRepository = {
  createAuthUser: async (input: CreateAuthUserInput): Promise<SupabaseResult<{ user: AuthUser | null }>> => {
    return supabase.auth.admin.createUser(input) as Promise<SupabaseResult<{ user: AuthUser | null }>>;
  },

  signInWithPassword: async (email: string, password: string): Promise<SupabaseResult<AuthResponse>> => {
    return supabase.auth.signInWithPassword({ email, password }) as Promise<SupabaseResult<AuthResponse>>;
  },

  signInWithIdToken: async (provider: 'google' | 'apple', token: string): Promise<SupabaseResult<AuthResponse>> => {
    return supabase.auth.signInWithIdToken({ provider, token }) as Promise<SupabaseResult<AuthResponse>>;
  },

  resetPasswordForEmail: async (email: string, redirectTo: string): Promise<SupabaseResult<Record<string, never>>> => {
    return supabase.auth.resetPasswordForEmail(email, { redirectTo }) as Promise<SupabaseResult<Record<string, never>>>;
  },

  updatePasswordWithToken: async (token: string, password: string): Promise<SupabaseResult<{ user: AuthUser | null }>> => {
    const passwordClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    return passwordClient.auth.updateUser({ password }) as Promise<SupabaseResult<{ user: AuthUser | null }>>;
  },

  findProfileById: async (userId: string): Promise<ProfileRow | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  upsertProfile: async (data: ProfileInsert): Promise<ProfileRow> => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .upsert(data, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) throw error;
    return profile;
  },

  createProfile: async (data: ProfileInsert): Promise<ProfileRow> => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .insert(data)
      .select('*')
      .single();

    if (error) throw error;
    return profile;
  },

  updateProfile: async (userId: string, data: ProfileUpdate): Promise<ProfileRow> => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', userId)
      .select('*')
      .single();

    if (error) throw error;
    return profile;
  }
};
