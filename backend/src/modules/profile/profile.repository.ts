import type { ProfileInsert, ProfileRow, ProfileUpdate } from '../../database/schema.types';

export const profileRepository = {
  findByUserId: async (_userId: string): Promise<ProfileRow | null> => {
    // TODO: Implement Supabase query to get profile by user id.
    return null;
  },

  create: async (_data: ProfileInsert): Promise<ProfileRow | null> => {
    // TODO: Implement Supabase query to create a profile.
    return null;
  },

  update: async (_userId: string, _data: ProfileUpdate): Promise<ProfileRow | null> => {
    // TODO: Implement Supabase query to update profile by user id.
    return null;
  }
};
