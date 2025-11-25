import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

export function errorHandler(error: any, req: Request, res: Response, next: NextFunction): void {
  if (error instanceof multer.MulterError) {
    console.error('Multer error:', error);
    res.status(400).json({ error: `File upload error: ${error.message}` });
    return;
  }

  if (error) {
    console.error('Unhandled error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  next();
}
