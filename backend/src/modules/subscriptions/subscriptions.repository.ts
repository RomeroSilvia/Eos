import { supabase } from '../../config/supabase';

export const subscriptionsRepository = {
  findUserById: async (userId: string): Promise<any | null> => {
    const db = supabase as any;
    const { data, error } = await db
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .eq('role', 'user')
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  },

  findActiveCenterById: async (centerId: string): Promise<any | null> => {
    const db = supabase as any;
    const { data, error } = await db
      .from('centers')
      .select('id, is_active')
      .eq('id', centerId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  },

  findAdminCenterAssignment: async (adminUserId: string, centerId: string): Promise<any | null> => {
    const db = supabase as any;
    const { data, error } = await db
      .from('center_admins')
      .select('id, user_id, center_id')
      .eq('user_id', adminUserId)
      .eq('center_id', centerId)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  },

  findCurrentSubscriptionByUserId: async (userId: string): Promise<any | null> => {
    const db = supabase as any;
    const { data, error } = await db
      .from('subscriptions')
      .select('*, subscription_plans(*)')
      .eq('owner_type', 'user')
      .eq('owner_id', userId)
      .in('status', ['active', 'pending'])
      .order('started_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  },

  searchUsersByEmail: async (emailQuery: string): Promise<any[]> => {
    const db = supabase as any;
    const { data, error } = await db
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('role', 'user')
      .not('email', 'is', null)
      .ilike('email', `%${emailQuery}%`)
      .order('email', { ascending: true })
      .limit(10);

    if (error) throw error;
    return data ?? [];
  },

  listPlans: async (): Promise<any[]> => {
    const db = supabase as any;
    const { data, error } = await db
      .from('subscription_plans')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  createPlan: async (payload: Record<string, unknown>): Promise<any> => {
    const db = supabase as any;
    const { data, error } = await db
      .from('subscription_plans')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  updatePlan: async (planId: string, payload: Record<string, unknown>): Promise<any | null> => {
    const db = supabase as any;
    const { data, error } = await db
      .from('subscription_plans')
      .update(payload)
      .eq('id', planId)
      .select('*')
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  },

  findPlanById: async (planId: string): Promise<any | null> => {
    const db = supabase as any;
    const { data, error } = await db
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  },

  listSubscriptions: async (): Promise<any[]> => {
    const db = supabase as any;
    const { data, error } = await db
      .from('subscriptions')
      .select('*, subscription_plans(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  findSubscriptionById: async (subscriptionId: string): Promise<any | null> => {
    const db = supabase as any;
    const { data, error } = await db
      .from('subscriptions')
      .select('*, subscription_plans(*)')
      .eq('id', subscriptionId)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  },

  updateSubscriptionStatus: async (subscriptionId: string, payload: Record<string, unknown>): Promise<any | null> => {
    const db = supabase as any;
    const { data, error } = await db
      .from('subscriptions')
      .update(payload)
      .eq('id', subscriptionId)
      .select('*, subscription_plans(*)')
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  },

  createSubscription: async (payload: Record<string, unknown>): Promise<any> => {
    const db = supabase as any;
    const { data, error } = await db
      .from('subscriptions')
      .insert(payload)
      .select('*, subscription_plans(*)')
      .single();

    if (error) throw error;
    return data;
  },

  deactivateActiveSubscriptions: async (ownerType: string, ownerId: string): Promise<void> => {
    const db = supabase as any;
    const { error } = await db
      .from('subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString(),
        ends_at: new Date().toISOString()
      })
      .eq('owner_type', ownerType)
      .eq('owner_id', ownerId)
      .eq('status', 'active');

    if (error) throw error;
  }
};
