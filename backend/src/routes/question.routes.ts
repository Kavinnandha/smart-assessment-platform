import express from 'express';
import multer from 'multer';
import {
  createQuestion,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  importQuestions,
  exportQuestions
} from '../controllers/question.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../models/User.model';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Create question (Teacher/Admin)
router.post('/', authenticate, authorize(UserRole.TEACHER, UserRole.ADMIN), createQuestion);

// Get all questions
router.get('/', authenticate, getQuestions);

// Export questions
router.get('/export', authenticate, authorize(UserRole.TEACHER, UserRole.ADMIN), exportQuestions);

// Import questions (Teacher/Admin)
router.post('/import', authenticate, authorize(UserRole.TEACHER, UserRole.ADMIN), upload.single('file'), importQuestions);

// Get question by ID
router.get('/:id', authenticate, getQuestionById);

// Update question (Teacher/Admin)
router.put('/:id', authenticate, authorize(UserRole.TEACHER, UserRole.ADMIN), updateQuestion);

// Delete question (Teacher/Admin)
router.delete('/:id', authenticate, authorize(UserRole.TEACHER, UserRole.ADMIN), deleteQuestion);

export default router;
