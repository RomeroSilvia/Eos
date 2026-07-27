import { createClient } from '@supabase/supabase-js';
import { env } from '../../config/env';
import { supabase } from '../../config/supabase';
import { TABLE_NAMES } from '../../database/tableNames';
import type { ProfileInsert, ProfileRow } from '../../database/schema.types';
import type { AuthProviderResponse, AuthUser } from './auth.types';

type SupabaseResult<TData> = {
  data: TData;
  error: { message: string; status?: number } | null;
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

  signInWithPassword: async (email: string, password: string): Promise<SupabaseResult<AuthProviderResponse>> => {
    return supabase.auth.signInWithPassword({ email, password }) as Promise<SupabaseResult<AuthProviderResponse>>;
  },

  signInWithIdToken: async (provider: 'google', token: string): Promise<SupabaseResult<AuthProviderResponse>> => {
    return supabase.auth.signInWithIdToken({ provider, token }) as Promise<SupabaseResult<AuthProviderResponse>>;
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
      .from(TABLE_NAMES.profiles)
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  upsertProfile: async (data: ProfileInsert): Promise<ProfileRow> => {
    const { data: profile, error } = await supabase
      .from(TABLE_NAMES.profiles)
      .upsert(data, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) throw error;
    return profile;
  },

  createProfile: async (data: ProfileInsert): Promise<ProfileRow> => {
    const { data: profile, error } = await supabase
      .from(TABLE_NAMES.profiles)
      .insert(data)
      .select('*')
      .single();

    if (error) throw error;
    return profile;
  }
};
