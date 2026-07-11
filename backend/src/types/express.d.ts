import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    user: {
      id: string;
      email?: string | null;
      role?: 'user' | 'specialist' | 'center_admin';
      accessToken: string;
    };
  }
}
