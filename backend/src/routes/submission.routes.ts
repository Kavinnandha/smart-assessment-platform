import express from 'express';
import multer from 'multer';
import {
  createSubmission,
  getSubmissions,
  getSubmissionById,
  evaluateSubmission,
  bulkEvaluate,
  exportSubmissions,
  aiEvaluateSubmission,
  aiEvaluateSingleAnswer
} from '../controllers/submission.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../models/User.model';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Create submission (Student)
router.post('/', authenticate, authorize(UserRole.STUDENT), createSubmission);

// Get all submissions
router.get('/', authenticate, getSubmissions);

// Export submissions (Teacher/Admin)
router.get('/export', authenticate, authorize(UserRole.TEACHER, UserRole.ADMIN), exportSubmissions);

// Bulk evaluate (Teacher/Admin)
router.post('/bulk-evaluate', authenticate, authorize(UserRole.TEACHER, UserRole.ADMIN), upload.single('file'), bulkEvaluate);

// Get submission by ID
router.get('/:id', authenticate, getSubmissionById);

// Evaluate submission (Teacher/Admin)
router.put('/:id/evaluate', authenticate, authorize(UserRole.TEACHER, UserRole.ADMIN), evaluateSubmission);

// AI-powered evaluation routes (Teacher/Admin)
router.put('/:id/ai-evaluate', authenticate, authorize(UserRole.TEACHER, UserRole.ADMIN), aiEvaluateSubmission);
router.post('/:id/evaluate-answer', authenticate, authorize(UserRole.TEACHER, UserRole.ADMIN), aiEvaluateSingleAnswer);

export default router;
