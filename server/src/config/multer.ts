import multer from 'multer';

// Configure multer for file uploads
export const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});
