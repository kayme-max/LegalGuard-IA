import multer from 'multer';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

// Configure Multer to use diskStorage instead of memoryStorage to prevent OOM errors with large files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, os.tmpdir());
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

export const upload = multer({ storage: storage });
