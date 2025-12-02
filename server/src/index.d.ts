import "express";

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Request {
      userId?: string;
    }
  }
}

export { };
