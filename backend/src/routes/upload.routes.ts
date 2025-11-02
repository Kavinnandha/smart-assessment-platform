import express from 'express';
import { upload, uploadFile } from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// Upload single file
router.post('/', authenticate, upload.single('file'), uploadFile);

export default router;
