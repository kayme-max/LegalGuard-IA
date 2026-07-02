import multer from 'multer';

// Configure Multer for file uploads
export const upload = multer({ storage: multer.memoryStorage() });
