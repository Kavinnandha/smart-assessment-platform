import { Response } from 'express';
import Test from '../models/Test.model';
import Question, { DifficultyLevel } from '../models/Question.model';
import { AuthRequest } from '../middleware/auth.middleware';

export const createTest = async (req: AuthRequest, res: Response) => {
  try {
    const test = new Test({
      ...req.body,
      createdBy: req.user?.userId
    });

    await test.save();
    await test.populate('questions.question');
    await test.populate('subject', 'name');
    
    res.status(201).json({ message: 'Test created successfully', test });
  } catch (error) {
    console.error('Create test error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const autoGenerateTest = async (req: AuthRequest, res: Response) => {
  try {
    const { subject, totalMarks, easyPercentage, mediumPercentage, hardPercentage, topics, title, duration } = req.body;

    // Calculate marks distribution
    const easyMarks = Math.floor(totalMarks * (easyPercentage / 100));
    const mediumMarks = Math.floor(totalMarks * (mediumPercentage / 100));
    const hardMarks = totalMarks - easyMarks - mediumMarks;

    // Build filter
    const filter: any = { subject };
    if (topics && topics.length > 0) {
      filter.topic = { $in: topics };
    }

    // Fetch questions by difficulty
    const easyQuestions = await Question.find({ ...filter, difficultyLevel: DifficultyLevel.EASY });
    const mediumQuestions = await Question.find({ ...filter, difficultyLevel: DifficultyLevel.MEDIUM });
    const hardQuestions = await Question.find({ ...filter, difficultyLevel: DifficultyLevel.HARD });

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

    const actualTotalMarks = currentEasyMarks + currentMediumMarks + currentHardMarks;

    const test = new Test({
      title: title || `Auto-generated ${subject} Test`,
      subject,
      duration: duration || 60,
      totalMarks: actualTotalMarks,
      questions: selectedQuestions,
      createdBy: req.user?.userId,
      isPublished: false
    });

    await test.save();
    await test.populate('questions.question');
    await test.populate('subject', 'name');

    res.status(201).json({ 
      message: 'Test auto-generated successfully', 
      test,
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
      filter.createdBy = req.user.userId;
    }

    const tests = await Test.find(filter)
      .populate('createdBy', 'name email')
      .populate('subject', 'name')
      .populate('questions.question')
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
      .populate('assignedTo', 'name email');

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
    const test = await Test.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('questions.question')
      .populate('subject', 'name');

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
    const test = await Test.findByIdAndDelete(req.params.id);

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

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
