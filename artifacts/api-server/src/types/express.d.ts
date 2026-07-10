declare global {
  namespace Express {
    interface Request {
      userId?: number;
      userRole?: string;
      userEmailVerified?: boolean;
    }
  }
}

export {};
