import { supabase } from '../../config/supabase';
import { TABLE_NAMES } from '../../database/tableNames';
import { specialistsSharedRepository } from './specialists.shared.repository';
import type {
  ProfileRow,
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
  status: 'active' | 'inactive';
};

type SpecialistWithProfile = {
  profile: Pick<ProfileRow, 'id' | 'full_name' | 'email' | 'role'>;
  specialistProfile: Pick<SpecialistProfileRow, 'specialty' | 'license_status'>;
};

type ActiveRelationWithSpecialist = Pick<ClientSpecialistRelationRow, 'id' | 'client_id' | 'specialist_id' | 'status'> & {
  specialist: Pick<ProfileRow, 'id' | 'full_name' | 'email'> | null;
  specialistProfile: Pick<SpecialistProfileRow, 'specialty' | 'license_status'> | null;
};

type ActiveRelationWithClient = Pick<ClientSpecialistRelationRow, 'id' | 'client_id' | 'specialist_id' | 'status'>;

type ClientProfileRow = Pick<ProfileRow, 'id' | 'full_name' | 'email' | 'skin_type'>;

export const specialistsDirectoryRepository = {
  findVerifiedSpecialists: async (filters: { specialty?: string; name?: string }): Promise<SpecialistWithProfile[]> => {
    const db = supabase as any;

    let query = db
      .from(TABLE_NAMES.specialistProfiles)
      .select(
        `
        specialty,
        license_status,
        profiles!inner(id, full_name, email, role)
      `
      )
      .eq('license_status', 'verified')
      .eq('profiles.role', 'specialist');

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
        email: row.profiles.email,
        role: row.profiles.role
      },
      specialistProfile: {
        specialty: row.specialty,
        license_status: row.license_status
      }
    }));
  },

  findVerifiedSpecialistByUserId: async (userId: string): Promise<SpecialistWithProfile | null> => {
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
      .eq('profiles.role', 'specialist')
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
      .from('client_specialist_relations')
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

  findActiveRelationsBySpecialistId: async (specialistId: string): Promise<ActiveRelationWithClient[]> => {
    const db = supabase as any;

    const { data, error } = await db
      .from('client_specialist_relations')
      .select('id, client_id, specialist_id, status')
      .eq('specialist_id', specialistId)
      .eq('status', 'active');

    if (error) throw error;
    return data ?? [];
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
      .from('client_specialist_relations')
      .update({ status: 'inactive' })
      .eq('client_id', clientId)
      .eq('status', 'active');

    if (error) throw error;
  },

  createRelation: async (payload: ClientSpecialistRelationInsert): Promise<ClientSpecialistRelationRow> => {
    const db = supabase as any;

    const { data, error } = await db
      .from('client_specialist_relations')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
