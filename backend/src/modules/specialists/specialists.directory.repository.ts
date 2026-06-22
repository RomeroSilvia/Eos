import { supabase } from '../../config/supabase';
import { TABLE_NAMES } from '../../database/tableNames';
import { specialistsSharedRepository } from './specialists.shared.repository';
import type {
  ProductRow,
  ProfileRow,
  RoutineLogRow,
  RoutineRow,
  RoutineStepLogRow,
  RoutineStepProductRow,
  RoutineStepRow,
  SpecialistProfileRow
} from '../../database/schema.types';

type ClientSpecialistRelationInsert = {
  client_id: string;
  specialist_id: string;
  status: 'active' | 'inactive';
};

type ClientSpecialistRelationRow = {
  id: string;
  client_id: string;
  specialist_id: string;
  status: string;
  created_at?: string | null;
};

type SpecialistWithProfile = {
  profile: Pick<ProfileRow, 'id' | 'full_name' | 'role'>;
  specialistProfile: Pick<SpecialistProfileRow, 'specialty' | 'license_status'>;
};

type VerifiedSpecialistProfile = SpecialistWithProfile;

type SpecialistWithPrivateProfile = {
  profile: Pick<ProfileRow, 'id' | 'full_name' | 'email' | 'role'>;
  specialistProfile: Pick<SpecialistProfileRow, 'specialty' | 'license_status'>;
};

type ActiveRelationWithSpecialist = Pick<ClientSpecialistRelationRow, 'id' | 'client_id' | 'specialist_id' | 'status'> & {
  specialist: Pick<ProfileRow, 'id' | 'full_name' | 'email'> | null;
  specialistProfile: Pick<SpecialistProfileRow, 'specialty' | 'license_status'> | null;
};

type ActiveRelationWithClient = Pick<ClientSpecialistRelationRow, 'id' | 'client_id' | 'specialist_id' | 'status'>;

type ClientProfileRow = Pick<ProfileRow, 'id' | 'full_name' | 'email' | 'skin_type'>;

type PatientRelationRow = Pick<ClientSpecialistRelationRow, 'id' | 'client_id' | 'specialist_id' | 'status' | 'created_at'>;

type SpecialistProfileIdentity = Pick<SpecialistProfileRow, 'id' | 'user_id'>;

type PatientSkinProfileRow = {
  user_id: string;
  skin_type: string | null;
  age_range: string | null;
  main_goal: string | null;
  imperfections: string | null;
  routine_steps: string | null;
  created_at: string;
};

type RoutineLogSummaryRow = Pick<RoutineLogRow, 'id' | 'user_id' | 'routine_id' | 'log_date' | 'completed_at' | 'completion_percentage' | 'created_at'>;

type RoutineStepProductWithProduct = Pick<RoutineStepProductRow, 'step_id' | 'product_id'> & {
  product: Pick<ProductRow, 'id' | 'name' | 'brand' | 'category'> | null;
};

export const specialistsDirectoryRepository = {
  findVerifiedSpecialists: async (filters: { specialty?: string; name?: string }): Promise<VerifiedSpecialistProfile[]> => {
    const db = supabase as any;

    let query = db
      .from(TABLE_NAMES.specialistProfiles)
      .select(
        `
        specialty,
        license_status,
        profiles!inner(id, full_name, role)
      `
      )
      .eq('license_status', 'verified');

    if (filters.specialty) {
      query = query.eq('specialty', filters.specialty);
    }

    if (filters.name) {
      query = query.ilike('profiles.full_name', `%${filters.name}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data ?? []).map((row: any) => ({
      profile: {
        id: row.profiles.id,
        full_name: row.profiles.full_name,
        role: row.profiles.role
      },
      specialistProfile: {
        specialty: row.specialty,
        license_status: row.license_status
      }
    }));
  },

  findVerifiedSpecialistByUserId: async (userId: string): Promise<SpecialistWithPrivateProfile | null> => {
    const db = supabase as any;

    const { data, error } = await db
      .from(TABLE_NAMES.specialistProfiles)
      .select(
        `
        specialty,
        license_status,
        profiles!inner(id, full_name, email, role)
      `
      )
      .eq('user_id', userId)
      .eq('license_status', 'verified')
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      profile: {
        id: data.profiles.id,
        full_name: data.profiles.full_name,
        email: data.profiles.email,
        role: data.profiles.role
      },
      specialistProfile: {
        specialty: data.specialty,
        license_status: data.license_status
      }
    };
  },

  findActiveRelationByClientId: async (clientId: string): Promise<ActiveRelationWithSpecialist | null> => {
    const db = supabase as any;

    const { data, error } = await db
      .from(TABLE_NAMES.clientSpecialistRelations)
      .select('id, client_id, specialist_id, status')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    const relation = Array.isArray(data) ? data[0] : null;

    if (!relation) return null;

    const [specialist, specialistProfile] = await Promise.all([
      specialistsSharedRepository.findProfileById(relation.specialist_id),
      specialistsDirectoryRepository.findSpecialistProfileByUserId(relation.specialist_id)
    ]);

    return {
      id: relation.id,
      client_id: relation.client_id,
      specialist_id: relation.specialist_id,
      status: relation.status,
      specialist,
      specialistProfile: specialistProfile ?? null
    };
  },

  findSpecialistProfileByUserId: async (
    userId: string
  ): Promise<Pick<SpecialistProfileRow, 'specialty' | 'license_status'> | null> => {
    const data = await specialistsSharedRepository.findSpecialistProfileByUserId(userId);

    if (data) {
      return {
        specialty: data.specialty,
        license_status: data.license_status
      };
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId);

      if (authError || !authData?.user) {
        return null;
      }

      const specialty = authData.user.user_metadata?.specialty;

      if (specialty === 'dermatologo' || specialty === 'cosmetologo') {
        return {
          specialty,
          license_status: 'pending'
        } as Pick<SpecialistProfileRow, 'specialty' | 'license_status'>;
      }
    } catch {
      return null;
    }

    return null;
  },

  findSpecialistProfileIdentityByUserId: async (userId: string): Promise<SpecialistProfileIdentity | null> => {
    const db = supabase as any;

    const { data, error } = await db
      .from(TABLE_NAMES.specialistProfiles)
      .select('id, user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  },

  findActiveRelationsBySpecialistId: async (specialistId: string): Promise<ActiveRelationWithClient[]> => {
    const db = supabase as any;

    const { data, error } = await db
      .from(TABLE_NAMES.clientSpecialistRelations)
      .select('id, client_id, specialist_id, status')
      .eq('specialist_id', specialistId)
      .eq('status', 'active');

    if (error) throw error;
    return data ?? [];
  },

  findRelationsBySpecialistIds: async (specialistIds: string[]): Promise<PatientRelationRow[]> => {
    if (specialistIds.length === 0) {
      return [];
    }

    const db = supabase as any;

    const { data, error } = await db
      .from(TABLE_NAMES.clientSpecialistRelations)
      .select('id, client_id, specialist_id, status, created_at')
      .in('specialist_id', specialistIds)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  findRelationBySpecialistAndClient: async (
    specialistIds: string[],
    clientId: string
  ): Promise<PatientRelationRow | null> => {
    if (specialistIds.length === 0) {
      return null;
    }

    const db = supabase as any;

    const { data, error } = await db
      .from(TABLE_NAMES.clientSpecialistRelations)
      .select('id, client_id, specialist_id, status, created_at')
      .in('specialist_id', specialistIds)
      .eq('client_id', clientId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    return Array.isArray(data) ? data[0] ?? null : null;
  },

  findProfilesByIds: async (
    userIds: string[]
  ): Promise<ClientProfileRow[]> => {
    if (userIds.length === 0) {
      return [];
    }

    const db = supabase as any;

    const { data, error } = await db
      .from(TABLE_NAMES.profiles)
      .select('id, full_name, email, skin_type')
      .in('id', userIds)
      .eq('role', 'user');

    if (error) throw error;
    return data ?? [];
  },

  findLatestSkinProfilesByUserIds: async (userIds: string[]): Promise<Map<string, PatientSkinProfileRow>> => {
    if (userIds.length === 0) {
      return new Map<string, PatientSkinProfileRow>();
    }

    const db = supabase as any;

    const { data, error } = await db
      .from(TABLE_NAMES.skinProfiles)
      .select('user_id, skin_type, age_range, main_goal, imperfections, routine_steps, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    if (error) {
      return new Map<string, PatientSkinProfileRow>();
    }

    const profileByUserId = new Map<string, PatientSkinProfileRow>();

    for (const row of data ?? []) {
      if (!profileByUserId.has(row.user_id)) {
        profileByUserId.set(row.user_id, row);
      }
    }

    return profileByUserId;
  },

  findLatestSkinTypesByUserIds: async (userIds: string[]): Promise<Map<string, string>> => {
    if (userIds.length === 0) {
      return new Map<string, string>();
    }

    const db = supabase as any;

    const { data, error } = await db
      .from('skin_profiles')
      .select('user_id, skin_type, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    if (error) {
      return new Map<string, string>();
    }

    const skinTypeByUserId = new Map<string, string>();

    for (const row of data ?? []) {
      if (!skinTypeByUserId.has(row.user_id) && typeof row.skin_type === 'string' && row.skin_type.trim()) {
        skinTypeByUserId.set(row.user_id, row.skin_type.trim());
      }
    }

    return skinTypeByUserId;
  },

  findLatestRoutineLogsByUserIds: async (userIds: string[]): Promise<Map<string, RoutineLogSummaryRow>> => {
    if (userIds.length === 0) {
      return new Map<string, RoutineLogSummaryRow>();
    }

    const db = supabase as any;

    const { data, error } = await db
      .from(TABLE_NAMES.routineLogs)
      .select('id, user_id, routine_id, log_date, completed_at, completion_percentage, created_at')
      .in('user_id', userIds)
      .order('log_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      return new Map<string, RoutineLogSummaryRow>();
    }

    const latestLogByUserId = new Map<string, RoutineLogSummaryRow>();

    for (const row of data ?? []) {
      if (!latestLogByUserId.has(row.user_id)) {
        latestLogByUserId.set(row.user_id, row);
      }
    }

    return latestLogByUserId;
  },

  findRoutinesByUserId: async (userId: string): Promise<RoutineRow[]> => {
    const { data, error } = await supabase
      .from(TABLE_NAMES.routines)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  findRecentRoutineLogsByUserId: async (userId: string, limit: number): Promise<RoutineLogRow[]> => {
    const { data, error } = await supabase
      .from(TABLE_NAMES.routineLogs)
      .select('*')
      .eq('user_id', userId)
      .order('log_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data ?? [];
  },

  findRoutineStepsByRoutineIds: async (routineIds: string[]): Promise<RoutineStepRow[]> => {
    if (routineIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from(TABLE_NAMES.routineSteps)
      .select('*')
      .in('routine_id', routineIds)
      .order('step_order', { ascending: true });

    if (error) throw error;
    return data ?? [];
  },

  findStepLogsByRoutineLogIds: async (routineLogIds: string[]): Promise<RoutineStepLogRow[]> => {
    if (routineLogIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from(TABLE_NAMES.routineStepLogs)
      .select('*')
      .in('routine_log_id', routineLogIds)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data ?? [];
  },

  findStepProductsByStepIds: async (stepIds: string[]): Promise<RoutineStepProductWithProduct[]> => {
    if (stepIds.length === 0) {
      return [];
    }

    const db = supabase as any;

    const { data, error } = await db
      .from(TABLE_NAMES.routineStepProducts)
      .select(
        `
        step_id,
        product_id,
        products(id, name, brand, category)
      `
      )
      .in('step_id', stepIds);

    if (error) throw error;

    return (data ?? []).map((row: any) => ({
      step_id: row.step_id,
      product_id: row.product_id,
      product: row.products
        ? {
            id: row.products.id,
            name: row.products.name,
            brand: row.products.brand,
            category: row.products.category
          }
        : null
    }));
  },

  findProfilePhotoById: async (userId: string): Promise<string | null> => {
    const db = supabase as any;
    const candidateColumns = ['avatar_url', 'profile_photo_url', 'photo_url'];

    for (const columnName of candidateColumns) {
      try {
        const { data, error } = await db
          .from(TABLE_NAMES.profiles)
          .select(`id, ${columnName}`)
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          continue;
        }

        const value = data?.[columnName];

        if (typeof value === 'string' && value.trim()) {
          return value;
        }
      } catch {
        continue;
      }
    }

    return null;
  },

  deactivateActiveRelation: async (clientId: string): Promise<void> => {
    const db = supabase as any;

    const { error } = await db
      .from(TABLE_NAMES.clientSpecialistRelations)
      .update({ status: 'inactive' })
      .eq('client_id', clientId)
      .eq('status', 'active');

    if (error) throw error;
  },

  createRelation: async (payload: ClientSpecialistRelationInsert): Promise<ClientSpecialistRelationRow> => {
    const db = supabase as any;

    const { data, error } = await db
      .from(TABLE_NAMES.clientSpecialistRelations)
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
