import type { ProfileInsert, ProfileRow, ProfileUpdate } from '../../database/schema.types';

export const authRepository = {
  findProfileById: async (_userId: string): Promise<ProfileRow | null> => {
    // TODO: Implement Supabase query to get profile by user id.
    return null;
  },

  createProfile: async (_data: ProfileInsert): Promise<ProfileRow | null> => {
    // TODO: Implement Supabase query to create a profile after auth signup.
    return null;
  },

  updateLastLogin: async (_userId: string): Promise<ProfileUpdate | null> => {
    // TODO: Implement last login tracking when the profile schema includes this field.
    return null;
  }
};
