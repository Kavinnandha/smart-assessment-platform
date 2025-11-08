import express from 'express';
import {
  createTest,
  autoGenerateTest,
  getTests,
  getTestById,
  updateTest,
  deleteTest,
  publishTest,
  unpublishTest,
  publishResults,
  unpublishResults
} from '../controllers/test.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../models/User.model';

const router = express.Router();

// Create test (Teacher/Admin)
router.post('/', authenticate, authorize(UserRole.TEACHER, UserRole.ADMIN), createTest);

// Auto-generate test (Teacher/Admin)
router.post('/auto-generate', authenticate, authorize(UserRole.TEACHER, UserRole.ADMIN), autoGenerateTest);

// Get all tests
router.get('/', authenticate, getTests);

// Get test by ID
router.get('/:id', authenticate, getTestById);

// Update test (Teacher/Admin)
router.put('/:id', authenticate, authorize(UserRole.TEACHER, UserRole.ADMIN), updateTest);

// Publish test (Teacher/Admin)
router.patch('/:id/publish', authenticate, authorize(UserRole.TEACHER, UserRole.ADMIN), publishTest);

// Unpublish test (Teacher/Admin)
router.patch('/:id/unpublish', authenticate, authorize(UserRole.TEACHER, UserRole.ADMIN), unpublishTest);

// Publish test results (Teacher/Admin)
router.patch('/:id/publish-results', authenticate, authorize(UserRole.TEACHER, UserRole.ADMIN), publishResults);

// Unpublish test results (Teacher/Admin)
router.patch('/:id/unpublish-results', authenticate, authorize(UserRole.TEACHER, UserRole.ADMIN), unpublishResults);

// Delete test (Teacher/Admin)
router.delete('/:id', authenticate, authorize(UserRole.TEACHER, UserRole.ADMIN), deleteTest);

export default router;
