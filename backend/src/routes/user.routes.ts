import express from 'express';
import User from '../models/User.model';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../models/User.model';
import bcrypt from 'bcryptjs';
import Group from '../models/Group.model';

const router = express.Router();

// Get all users (Admin only) - with optional role filter for teachers
router.get('/', authenticate, authorize(UserRole.ADMIN, UserRole.TEACHER), async (req, res) => {
  try {
    const { role } = req.query;
    const filter: any = {};

    if (role) {
      filter.role = role;
    }

    const users = await User.find(filter).select('-password');
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new user (Admin only)
router.post('/', authenticate, authorize(UserRole.ADMIN), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role
    });

    await user.save();

    // Return user without password
    const userResponse: any = user.toObject();
    delete userResponse.password;

    res.status(201).json({ message: 'User created successfully', user: userResponse });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Get user by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user (Admin only)
router.put('/:id', authenticate, authorize(UserRole.ADMIN), async (req, res) => {
  try {
    const updateData = { ...req.body };

    // Hash password if it's being updated
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User updated successfully', user });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Delete user (Admin only)
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Integrity Checks
    const dependencies: string[] = [];

    // 1. Check if user is in any Group (as student or teacher)
    const groupsWithUser = await Group.find({
      $or: [{ students: userId }, { teachers: userId }]
    }).select('name');

    if (groupsWithUser.length > 0) {
      dependencies.push(`Member of ${groupsWithUser.length} group(s): ${groupsWithUser.map((g: any) => g.name).join(', ')}`);
    }

    // 2. Check if user created any Test (that is not deleted)
    const Test = (await import('../models/Test.model')).default;
    const userTests = await Test.find({ createdBy: userId }).select('title');

    if (userTests.length > 0) {
      dependencies.push(`Creator of ${userTests.length} test(s): ${userTests.map((t: any) => t.title).join(', ')}`);
    }

    // 3. Check if user created any Question
    const Question = (await import('../models/Question.model')).default;
    const userQuestions = await Question.countDocuments({ createdBy: userId });

    if (userQuestions > 0) {
      dependencies.push(`Creator of ${userQuestions} question(s)`);
    }

    // 4. Check if user has any Submissions
    const Submission = (await import('../models/Submission.model')).default;
    const userSubmissions = await Submission.countDocuments({ student: userId });

    if (userSubmissions > 0) {
      dependencies.push(`Has ${userSubmissions} submission(s)`);
    }

    if (dependencies.length > 0) {
      return res.status(409).json({
        message: 'Cannot delete user due to existing dependencies',
        dependencies
      });
    }

    await User.findByIdAndDelete(userId);
    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
