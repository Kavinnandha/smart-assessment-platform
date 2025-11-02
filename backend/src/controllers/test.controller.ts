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
    const { subject, totalMarks, easyPercentage, mediumPercentage, hardPercentage, topics, title, duration, chapters } = req.body;

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

    // Fetch questions by difficulty
    const easyQuestions = await Question.find({ ...filter, difficultyLevel: DifficultyLevel.EASY });
    const mediumQuestions = await Question.find({ ...filter, difficultyLevel: DifficultyLevel.MEDIUM });
    const hardQuestions = await Question.find({ ...filter, difficultyLevel: DifficultyLevel.HARD });

    // Check if any questions are available
    const totalAvailableQuestions = easyQuestions.length + mediumQuestions.length + hardQuestions.length;
    if (totalAvailableQuestions === 0) {
      const message = chapters && chapters.length > 0 
        ? `No questions found in the selected chapter${chapters.length > 1 ? 's' : ''}: ${chapters.join(', ')}`
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
      const message = chapters && chapters.length > 0
        ? `No suitable questions found in the selected chapter${chapters.length > 1 ? 's' : ''} matching the criteria. Try adjusting the difficulty percentages or total marks.`
        : 'No suitable questions found matching the criteria. Try adjusting the difficulty percentages or total marks.';
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
