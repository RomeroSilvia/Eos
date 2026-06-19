import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    user: {
      id: string;
      role?: 'user' | 'specialist' | 'center_admin';
      accessToken: string;
    };
  }
}