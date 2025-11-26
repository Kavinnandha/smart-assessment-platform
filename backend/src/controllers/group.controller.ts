import { Request, Response } from 'express';
import Group from '../models/Group.model';
import User from '../models/User.model';

// Get all groups for the logged-in user (teacher/admin)
export const getGroups = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    // Admin can see all groups, teachers see only groups they are assigned to
    const query = userRole === 'admin' ? {} : { teachers: userId };

    const groups = await Group.find(query)
      .populate('students', 'name email')
      .populate('teachers', 'name email')
      .populate('createdBy', 'name email')
      .populate('subject', 'name')
      .sort({ createdAt: -1 });

    res.json(groups);
  } catch (error: any) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ message: 'Failed to fetch groups', error: error.message });
  }
};

// Get a single group by ID
export const getGroupById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    const group = await Group.findById(id)
      .populate('students', 'name email')
      .populate('teachers', 'name email')
      .populate('createdBy', 'name email')
      .populate('subject', 'name');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check permissions: admin can see all, teachers only their own
    if (userRole !== 'admin' && group.createdBy.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(group);
  } catch (error: any) {
    console.error('Error fetching group:', error);
    res.status(500).json({ message: 'Failed to fetch group', error: error.message });
  }
};

// Create a new group
export const createGroup = async (req: Request, res: Response) => {
  try {
    const { name, description, subject, students, teachers } = req.body;
    const userId = (req as any).user.userId;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    if (!subject) {
      return res.status(400).json({ message: 'Subject is required' });
    }

    // Validate students are actual student users
    if (students && students.length > 0) {
      const validStudents = await User.find({
        _id: { $in: students },
        role: 'student',
      });

      if (validStudents.length !== students.length) {
        return res.status(400).json({
          message: 'Some student IDs are invalid or not students'
        });
      }
    }

    // Validate teachers are actual teacher users
    if (teachers && teachers.length > 0) {
      const validTeachers = await User.find({
        _id: { $in: teachers },
        role: 'teacher',
      });

      if (validTeachers.length !== teachers.length) {
        return res.status(400).json({
          message: 'Some teacher IDs are invalid or not teachers'
        });
      }
    }

    const group = new Group({
      name: name.trim(),
      description: description?.trim() || '',
      subject: subject,
      students: students || [],
      teachers: teachers || [],
      createdBy: userId,
    });

    await group.save();

    // Populate before sending response
    await group.populate('students', 'name email');
    await group.populate('teachers', 'name email');
    await group.populate('createdBy', 'name email');
    await group.populate('subject', 'name');

    res.status(201).json({
      message: 'Group created successfully',
      group,
    });
  } catch (error: any) {
    console.error('Error creating group:', error);
    res.status(500).json({ message: 'Failed to create group', error: error.message });
  }
};

// Update a group
export const updateGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, subject, students, teachers } = req.body;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    const group = await Group.findById(id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check permissions: admin can update all, teachers only their own
    if (userRole !== 'admin' && group.createdBy.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Validate students if provided
    if (students && students.length > 0) {
      const validStudents = await User.find({
        _id: { $in: students },
        role: 'student',
      });

      if (validStudents.length !== students.length) {
        return res.status(400).json({
          message: 'Some student IDs are invalid or not students'
        });
      }
    }

    // Validate teachers if provided
    if (teachers && teachers.length > 0) {
      const validTeachers = await User.find({
        _id: { $in: teachers },
        role: 'teacher',
      });

      if (validTeachers.length !== teachers.length) {
        return res.status(400).json({
          message: 'Some teacher IDs are invalid or not teachers'
        });
      }
    }

    // Update fields
    if (name !== undefined) group.name = name.trim();
    if (description !== undefined) group.description = description.trim();
    if (subject !== undefined) group.subject = subject;
    if (students !== undefined) group.students = students;
    if (teachers !== undefined) group.teachers = teachers;

    await group.save();

    // Populate before sending response
    await group.populate('students', 'name email');
    await group.populate('teachers', 'name email');
    await group.populate('createdBy', 'name email');
    await group.populate('subject', 'name');

    res.json({
      message: 'Group updated successfully',
      group,
    });
  } catch (error: any) {
    console.error('Error updating group:', error);
    res.status(500).json({ message: 'Failed to update group', error: error.message });
  }
};

// Delete a group
export const deleteGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    const group = await Group.findById(id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check permissions: admin can delete all, teachers only their own
    if (userRole !== 'admin' && group.createdBy.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Integrity Check: Check if group is assigned to any Test
    const Test = (await import('../models/Test.model')).default;
    const testsWithGroup = await Test.find({ assignedGroups: id }).select('title');

    if (testsWithGroup.length > 0) {
      return res.status(409).json({
        message: 'Cannot delete group due to existing dependencies',
        dependencies: [`Assigned to ${testsWithGroup.length} test(s): ${testsWithGroup.map(t => t.title).join(', ')}`]
      });
    }

    await Group.findByIdAndDelete(id);

    res.json({ message: 'Group deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting group:', error);
    res.status(500).json({ message: 'Failed to delete group', error: error.message });
  }
};

// Add students to a group
export const addStudentsToGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { students } = req.body;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: 'Students array is required' });
    }

    const group = await Group.findById(id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check permissions
    if (userRole !== 'admin' && group.createdBy.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Validate students
    const validStudents = await User.find({
      _id: { $in: students },
      role: 'student',
    });

    if (validStudents.length !== students.length) {
      return res.status(400).json({
        message: 'Some student IDs are invalid or not students'
      });
    }

    // Add only new students (avoid duplicates)
    const newStudents = students.filter(
      studentId => !group.students.includes(studentId)
    );

    group.students.push(...newStudents);
    await group.save();

    await group.populate('students', 'name email');
    await group.populate('createdBy', 'name email');
    await group.populate('subject', 'name');

    res.json({
      message: 'Students added successfully',
      group,
    });
  } catch (error: any) {
    console.error('Error adding students to group:', error);
    res.status(500).json({
      message: 'Failed to add students to group',
      error: error.message
    });
  }
};

// Remove students from a group
export const removeStudentsFromGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { students } = req.body;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: 'Students array is required' });
    }

    const group = await Group.findById(id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check permissions
    if (userRole !== 'admin' && group.createdBy.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Remove students
    group.students = group.students.filter(
      studentId => !students.includes(studentId.toString())
    );

    await group.save();

    await group.populate('students', 'name email');
    await group.populate('createdBy', 'name email');
    await group.populate('subject', 'name');

    res.json({
      message: 'Students removed successfully',
      group,
    });
  } catch (error: any) {
    console.error('Error removing students from group:', error);
    res.status(500).json({
      message: 'Failed to remove students from group',
      error: error.message
    });
  }
};
