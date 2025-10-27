import express from 'express';
import {
  getStudentReport,
  getTestAnalytics,
  getDashboardStats
} from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// Get dashboard stats
router.get('/dashboard', authenticate, getDashboardStats);

// Get student report
router.get('/student/:studentId/test/:testId', authenticate, getStudentReport);

// Get test analytics
router.get('/test/:testId', authenticate, getTestAnalytics);

export default router;
