import express from 'express';
import {
  getGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  addStudentsToGroup,
  removeStudentsFromGroup,
} from '../controllers/group.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Group CRUD routes
router.get('/', getGroups);
router.get('/:id', getGroupById);
router.post('/', createGroup);
router.put('/:id', updateGroup);
router.delete('/:id', deleteGroup);

// Student management routes
router.post('/:id/students/add', addStudentsToGroup);
router.post('/:id/students/remove', removeStudentsFromGroup);

export default router;
