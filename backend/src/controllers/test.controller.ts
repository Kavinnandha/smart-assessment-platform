import { Response } from 'express';
import Test from '../models/Test.model';
import Group from '../models/Group.model';
import Question, { DifficultyLevel } from '../models/Question.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../models/User.model';

export const createTest = async (req: AuthRequest, res: Response) => {
  try {
    // If assignedGroups is provided, populate assignedTo with students from those groups
    let assignedStudents = req.body.assignedTo || [];

    if (req.body.assignedGroups && req.body.assignedGroups.length > 0) {
      // Fetch all groups and extract student IDs
      const groups = await Group.find({ _id: { $in: req.body.assignedGroups } });
      const studentIds = new Set(assignedStudents); // Use Set to avoid duplicates

      groups.forEach(group => {
        group.students.forEach(studentId => {
          studentIds.add(studentId.toString());
        });
      });

      assignedStudents = Array.from(studentIds);
    }

    const test = new Test({
      ...req.body,
      assignedTo: assignedStudents,
      createdBy: req.user?.userId
    });

    await test.save();
    await test.populate('questions.question');
    await test.populate('subject', 'name');
    await test.populate('assignedGroups', 'name');
    await test.populate('assignedTo', 'name email');

    res.status(201).json({ message: 'Test created successfully', test });
  } catch (error) {
    console.error('Create test error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const autoGenerateTest = async (req: AuthRequest, res: Response) => {
  try {
    const {
      subject,
      totalMarks,
      easyPercentage,
      mediumPercentage,
      hardPercentage,
      topics,
      title,
      duration,
      chapters,
      questionTypes,
      specificMarks
    } = req.body;

    // Calculate marks distribution
    const easyMarks = Math.floor(totalMarks * (easyPercentage / 100));
    const mediumMarks = Math.floor(totalMarks * (mediumPercentage / 100));
    const hardMarks = totalMarks - easyMarks - mediumMarks;

    // Build filter
    const filter: any = { subject };
    if (topics && topics.length > 0) {
      filter.topic = { $in: topics };
    }
    if (chapters && chapters.length > 0) {
      filter.chapter = { $in: chapters };
    }
    if (questionTypes && questionTypes.length > 0) {
      filter.questionType = { $in: questionTypes };
    }
    if (specificMarks && specificMarks.length > 0) {
      filter.marks = { $in: specificMarks };
    }

    // Fetch questions by difficulty
    const easyQuestions = await Question.find({ ...filter, difficultyLevel: DifficultyLevel.EASY });
    const mediumQuestions = await Question.find({ ...filter, difficultyLevel: DifficultyLevel.MEDIUM });
    const hardQuestions = await Question.find({ ...filter, difficultyLevel: DifficultyLevel.HARD });

    // Check if any questions are available
    const totalAvailableQuestions = easyQuestions.length + mediumQuestions.length + hardQuestions.length;
    if (totalAvailableQuestions === 0) {
      const filterCriteria = [];
      if (chapters && chapters.length > 0) {
        filterCriteria.push(`chapter${chapters.length > 1 ? 's' : ''}: ${chapters.join(', ')}`);
      }
      if (topics && topics.length > 0) {
        filterCriteria.push(`topic${topics.length > 1 ? 's' : ''}: ${topics.join(', ')}`);
      }
      if (questionTypes && questionTypes.length > 0) {
        filterCriteria.push(`question type${questionTypes.length > 1 ? 's' : ''}: ${questionTypes.join(', ')}`);
      }
      if (specificMarks && specificMarks.length > 0) {
        filterCriteria.push(`mark value${specificMarks.length > 1 ? 's' : ''}: ${specificMarks.join(', ')}`);
      }

      const message = filterCriteria.length > 0
        ? `No questions found matching the selected criteria: ${filterCriteria.join(', ')}`
        : 'No questions found for the selected subject';
      return res.status(404).json({ message });
    }

    // Select questions to match target marks
    const selectedQuestions: any[] = [];
    let order = 1;
    let currentEasyMarks = 0;
    let currentMediumMarks = 0;
    let currentHardMarks = 0;

    // Select easy questions
    for (const q of easyQuestions) {
      if (currentEasyMarks + q.marks <= easyMarks) {
        selectedQuestions.push({ question: q._id, marks: q.marks, order: order++ });
        currentEasyMarks += q.marks;
      }
    }

    // Select medium questions
    for (const q of mediumQuestions) {
      if (currentMediumMarks + q.marks <= mediumMarks) {
        selectedQuestions.push({ question: q._id, marks: q.marks, order: order++ });
        currentMediumMarks += q.marks;
      }
    }

    // Select hard questions
    for (const q of hardQuestions) {
      if (currentHardMarks + q.marks <= hardMarks) {
        selectedQuestions.push({ question: q._id, marks: q.marks, order: order++ });
        currentHardMarks += q.marks;
      }
    }

    // Check if we were able to select any questions
    if (selectedQuestions.length === 0) {
      const filterCriteria = [];
      if (chapters && chapters.length > 0) {
        filterCriteria.push(`chapter${chapters.length > 1 ? 's' : ''}: ${chapters.join(', ')}`);
      }
      if (topics && topics.length > 0) {
        filterCriteria.push(`topic${topics.length > 1 ? 's' : ''}: ${topics.join(', ')}`);
      }
      if (questionTypes && questionTypes.length > 0) {
        filterCriteria.push(`question type${questionTypes.length > 1 ? 's' : ''}: ${questionTypes.join(', ')}`);
      }
      if (specificMarks && specificMarks.length > 0) {
        filterCriteria.push(`mark value${specificMarks.length > 1 ? 's' : ''}: ${specificMarks.join(', ')}`);
      }

      const criteriaText = filterCriteria.length > 0
        ? ` with the selected criteria (${filterCriteria.join(', ')})`
        : '';

      const message = `No suitable questions found${criteriaText} matching the difficulty distribution and total marks. Try adjusting the difficulty percentages, total marks, or selection criteria.`;
      return res.status(404).json({ message });
    }

    const actualTotalMarks = currentEasyMarks + currentMediumMarks + currentHardMarks;

    // Populate the selected questions with full question details
    const populatedQuestions = await Question.find({
      _id: { $in: selectedQuestions.map(q => q.question) }
    }).populate('subject', 'name');

    // Map the populated questions back with their marks and order
    const questionsWithDetails = selectedQuestions.map(sq => {
      const questionDetail = populatedQuestions.find((q: any) => q._id.toString() === sq.question.toString());
      return {
        question: questionDetail,
        marks: sq.marks,
        order: sq.order
      };
    });

    // Return the selected questions without saving the test
    res.status(200).json({
      message: 'Questions auto-generated successfully',
      questions: questionsWithDetails,
      distribution: {
        easy: currentEasyMarks,
        medium: currentMediumMarks,
        hard: currentHardMarks,
        total: actualTotalMarks
      }
    });
  } catch (error) {
    console.error('Auto-generate test error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getTests = async (req: AuthRequest, res: Response) => {
  try {
    const { subject, isPublished } = req.query;
    const filter: any = {};

    if (subject) filter.subject = subject;
    if (isPublished !== undefined) filter.isPublished = isPublished === 'true';

    // Filter based on role
    if (req.user?.role === 'student') {
      filter.assignedTo = req.user.userId;
      filter.isPublished = true;
    } else if (req.user?.role === 'teacher') {
      // Teachers can see:
      // 1. Tests assigned to groups where they are teachers (ALL teachers in the group can see)
      // 2. Tests they created with individual student assignment (ONLY creator can see)

      // Find all groups where the teacher is assigned
      const teacherGroups = await Group.find({
        teachers: req.user.userId
      }).select('_id');

      const teacherGroupIds = teacherGroups.map(g => g._id);

      // Build OR conditions:
      filter.$or = [
        // Condition 1: Tests assigned to groups where this teacher is a member
        // This allows ALL teachers in the group to see and manage the test
        { assignedGroups: { $in: teacherGroupIds } },

        // Condition 2: Tests created by this teacher with no group assignment
        // This is for individual student assignments (makeup tests, etc.)
        // ONLY the creator can see these tests
        {
          createdBy: req.user.userId,
          $or: [
            { assignedGroups: { $exists: true, $size: 0 } },  // Empty array
            { assignedGroups: { $exists: false } }             // Field doesn't exist (backward compatibility)
          ]
        }
      ];
    }

    const tests = await Test.find(filter)
      .populate('createdBy', 'name email')
      .populate('subject', 'name')
      .populate('questions.question')
      .populate('assignedGroups', 'name')
      .sort({ createdAt: -1 });

    res.json({ tests });
  } catch (error) {
    console.error('Get tests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getTestById = async (req: AuthRequest, res: Response) => {
  try {
    const test = await Test.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('subject', 'name')
      .populate('questions.question')
      .populate('assignedTo', 'name email')
      .populate('assignedGroups', 'name');

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    res.json({ test });
  } catch (error) {
    console.error('Get test error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateTest = async (req: AuthRequest, res: Response) => {
  try {
    // If assignedGroups is provided, populate assignedTo with students from those groups
    let updateData = { ...req.body };

    if (req.body.assignedGroups && req.body.assignedGroups.length > 0) {
      // Fetch all groups and extract student IDs
      const groups = await Group.find({ _id: { $in: req.body.assignedGroups } });
      const studentIds = new Set(req.body.assignedTo || []); // Use Set to avoid duplicates

      groups.forEach(group => {
        group.students.forEach(studentId => {
          studentIds.add(studentId.toString());
        });
      });

      updateData.assignedTo = Array.from(studentIds);
    }

    const test = await Test.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('questions.question')
      .populate('subject', 'name')
      .populate('assignedGroups', 'name')
      .populate('assignedTo', 'name email');

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    res.json({ message: 'Test updated successfully', test });
  } catch (error) {
    console.error('Update test error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteTest = async (req: AuthRequest, res: Response) => {
  try {
    const testId = req.params.id;
    const force = req.query.force === 'true';

    const test = await Test.findById(testId);

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    // Integrity Check: Check for Submissions
    const Submission = (await import('../models/Submission.model')).default;
    const submissionCount = await Submission.countDocuments({ test: testId });

    if (submissionCount > 0 && !force) {
      return res.status(409).json({
        message: 'Cannot delete test due to existing dependencies',
        dependencies: [`Has ${submissionCount} student submission(s)`],
        canCascade: true
      });
    }

    // If force is true or no submissions, delete submissions first (cascade)
    if (submissionCount > 0 && force) {
      await Submission.deleteMany({ test: testId });
    }

    await Test.findByIdAndDelete(testId);

    res.json({ message: 'Test deleted successfully' });
  } catch (error) {
    console.error('Delete test error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const publishTest = async (req: AuthRequest, res: Response) => {
  try {
    const test = await Test.findByIdAndUpdate(
      req.params.id,
      { isPublished: true },
      { new: true }
    )
      .populate('subject', 'name')
      .populate('createdBy', 'name email');

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    res.json({ message: 'Test published successfully', test });
  } catch (error) {
    console.error('Publish test error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const unpublishTest = async (req: AuthRequest, res: Response) => {
  try {
    const test = await Test.findByIdAndUpdate(
      req.params.id,
      { isPublished: false },
      { new: true }
    )
      .populate('subject', 'name')
      .populate('createdBy', 'name email');

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    res.json({ message: 'Test unpublished successfully', test });
  } catch (error) {
    console.error('Unpublish test error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const publishResults = async (req: AuthRequest, res: Response) => {
  try {
    const test = await Test.findById(req.params.id);

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    // Check if user is authorized (teacher who created the test or admin)
    if (test.createdBy.toString() !== req.user?.userId && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to publish results for this test' });
    }

    // Update test to mark results as published
    const updatedTest = await Test.findByIdAndUpdate(
      req.params.id,
      { resultsPublished: true },
      { new: true }
    )
      .populate('subject', 'name')
      .populate('createdBy', 'name email');

    res.json({ message: 'Results published successfully. Students can now view their results.', test: updatedTest });
  } catch (error) {
    console.error('Publish results error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const unpublishResults = async (req: AuthRequest, res: Response) => {
  try {
    const test = await Test.findById(req.params.id);

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    // Check if user is authorized (teacher who created the test or admin)
    if (test.createdBy.toString() !== req.user?.userId && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to unpublish results for this test' });
    }

    // Update test to mark results as unpublished
    const updatedTest = await Test.findByIdAndUpdate(
      req.params.id,
      { resultsPublished: false },
      { new: true }
    )
      .populate('subject', 'name')
      .populate('createdBy', 'name email');

    res.json({ message: 'Results hidden from students successfully.', test: updatedTest });
  } catch (error) {
    console.error('Unpublish results error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
