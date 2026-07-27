export type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

export type AuthSession = {
  access_token: string;
};

export type AuthProviderResponse = {
  user: AuthUser | null;
  session: AuthSession | null;
};
