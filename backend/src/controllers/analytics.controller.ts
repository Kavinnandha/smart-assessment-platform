import { Response } from 'express';
import Submission from '../models/Submission.model';
import Test from '../models/Test.model';
import Question, { DifficultyLevel } from '../models/Question.model';
import { AuthRequest } from '../middleware/auth.middleware';

export const getStudentReport = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, testId } = req.params;

    const submission = await Submission.findOne({
      test: testId,
      student: studentId
    })
      .populate('test')
      .populate({
        path: 'answers.question',
        populate: { path: 'question' }
      });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const test = await Test.findById(testId).populate('questions.question');
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    // Calculate difficulty-wise performance
    const difficultyAnalysis = {
      easy: { obtained: 0, total: 0 },
      medium: { obtained: 0, total: 0 },
      hard: { obtained: 0, total: 0 }
    };

    const topicAnalysis: any = {};
    const chapterAnalysis: any = {};

    for (const answer of submission.answers) {
      const question = answer.question as any;
      const difficulty = question.difficultyLevel as DifficultyLevel;
      const marks = answer.marksObtained || 0;
      const totalMarks = question.marks;

      // Difficulty analysis
      if (difficulty in difficultyAnalysis) {
        difficultyAnalysis[difficulty].obtained += marks;
        difficultyAnalysis[difficulty].total += totalMarks;
      }

      // Topic analysis
      if (!topicAnalysis[question.topic]) {
        topicAnalysis[question.topic] = { obtained: 0, total: 0 };
      }
      topicAnalysis[question.topic].obtained += marks;
      topicAnalysis[question.topic].total += totalMarks;

      // Chapter analysis
      if (!chapterAnalysis[question.chapter]) {
        chapterAnalysis[question.chapter] = { obtained: 0, total: 0 };
      }
      chapterAnalysis[question.chapter].obtained += marks;
      chapterAnalysis[question.chapter].total += totalMarks;
    }

    // Get class average
    const allSubmissions = await Submission.find({ test: testId, status: 'evaluated' });
    const classAverage = allSubmissions.length > 0
      ? allSubmissions.reduce((sum, sub) => sum + (sub.totalMarksObtained || 0), 0) / allSubmissions.length
      : 0;

    // Calculate rank
    const sortedSubmissions = allSubmissions
      .filter(sub => sub.totalMarksObtained !== undefined)
      .sort((a, b) => (b.totalMarksObtained || 0) - (a.totalMarksObtained || 0));
    
    const rank = sortedSubmissions.findIndex(sub => (sub._id as any).toString() === (submission._id as any).toString()) + 1;

    const report = {
      student: submission.student,
      test: test.title,
      totalMarks: test.totalMarks,
      marksObtained: submission.totalMarksObtained,
      percentage: test.totalMarks > 0 ? ((submission.totalMarksObtained || 0) / test.totalMarks) * 100 : 0,
      timeTaken: submission.timeTaken,
      difficultyAnalysis,
      topicAnalysis,
      chapterAnalysis,
      classAverage,
      rank,
      totalStudents: allSubmissions.length
    };

    res.json({ report });
  } catch (error) {
    console.error('Get student report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getTestAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { testId } = req.params;

    const test = await Test.findById(testId).populate('questions.question');
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    const submissions = await Submission.find({ test: testId, status: 'evaluated' })
      .populate('student', 'name email')
      .populate('answers.question');

    if (submissions.length === 0) {
      return res.json({ 
        message: 'No submissions evaluated yet',
        analytics: null 
      });
    }

    // Overall statistics
    const totalMarks = test.totalMarks;
    const averageScore = submissions.reduce((sum, sub) => sum + (sub.totalMarksObtained || 0), 0) / submissions.length;
    const highestScore = Math.max(...submissions.map(sub => sub.totalMarksObtained || 0));
    const lowestScore = Math.min(...submissions.map(sub => sub.totalMarksObtained || 0));

    // Score distribution
    const scoreRanges = {
      '0-25%': 0,
      '26-50%': 0,
      '51-75%': 0,
      '76-100%': 0
    };

    submissions.forEach(sub => {
      const percentage = ((sub.totalMarksObtained || 0) / totalMarks) * 100;
      if (percentage <= 25) scoreRanges['0-25%']++;
      else if (percentage <= 50) scoreRanges['26-50%']++;
      else if (percentage <= 75) scoreRanges['51-75%']++;
      else scoreRanges['76-100%']++;
    });

    // Difficulty-wise performance
    const difficultyPerformance = {
      easy: { avgObtained: 0, avgTotal: 0, count: 0 },
      medium: { avgObtained: 0, avgTotal: 0, count: 0 },
      hard: { avgObtained: 0, avgTotal: 0, count: 0 }
    };

    submissions.forEach(sub => {
      sub.answers.forEach((answer: any) => {
        const question = answer.question;
        const difficulty = question.difficultyLevel as DifficultyLevel;
        
        if (difficulty in difficultyPerformance) {
          difficultyPerformance[difficulty].avgObtained += answer.marksObtained || 0;
          difficultyPerformance[difficulty].avgTotal += question.marks;
          difficultyPerformance[difficulty].count++;
        }
      });
    });

    // Calculate averages
    Object.keys(difficultyPerformance).forEach(key => {
      const perf = difficultyPerformance[key as DifficultyLevel];
      if (perf.count > 0) {
        perf.avgObtained = perf.avgObtained / submissions.length;
        perf.avgTotal = perf.avgTotal / submissions.length;
      }
    });

    // Question-wise analysis
    const questionAnalysis: any[] = [];
    test.questions.forEach((tq: any) => {
      const question = tq.question;
      let totalObtained = 0;
      let attemptedCount = 0;

      submissions.forEach(sub => {
        const answer = sub.answers.find((ans: any) => 
          ans.question._id.toString() === question._id.toString()
        );
        if (answer) {
          totalObtained += answer.marksObtained || 0;
          if (answer.marksObtained !== undefined) attemptedCount++;
        }
      });

      questionAnalysis.push({
        questionNumber: question.questionNumber,
        questionText: question.questionText.substring(0, 100) + '...',
        totalMarks: question.marks,
        averageMarks: attemptedCount > 0 ? totalObtained / attemptedCount : 0,
        attemptedBy: attemptedCount,
        difficulty: question.difficultyLevel
      });
    });

    const analytics = {
      testTitle: test.title,
      totalStudents: submissions.length,
      totalMarks,
      averageScore,
      highestScore,
      lowestScore,
      scoreRanges,
      difficultyPerformance,
      questionAnalysis
    };

    res.json({ analytics });
  } catch (error) {
    console.error('Get test analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;

    let stats: any = {};

    if (role === 'admin') {
      const totalTests = await Test.countDocuments();
      const totalQuestions = await Question.countDocuments();
      const totalSubmissions = await Submission.countDocuments();
      
      stats = {
        totalTests,
        totalQuestions,
        totalSubmissions,
        role
      };
    } else if (role === 'teacher') {
      const myTests = await Test.countDocuments({ createdBy: userId });
      const myQuestions = await Question.countDocuments({ createdBy: userId });
      const pendingEvaluations = await Submission.countDocuments({
        test: { $in: await Test.find({ createdBy: userId }).distinct('_id') },
        status: 'submitted'
      });

      stats = {
        myTests,
        myQuestions,
        pendingEvaluations,
        role
      };
    } else if (role === 'student') {
      const assignedTests = await Test.countDocuments({
        assignedTo: userId,
        isPublished: true
      });
      
      const completedTests = await Submission.countDocuments({
        student: userId,
        status: { $in: ['submitted', 'evaluated'] }
      });

      const pendingTests = assignedTests - completedTests;

      const submissions = await Submission.find({
        student: userId,
        status: 'evaluated'
      }).populate('test', 'totalMarks');

      const averageScore = submissions.length > 0
        ? submissions.reduce((sum, sub) => {
            const percentage = ((sub.totalMarksObtained || 0) / (sub.test as any).totalMarks) * 100;
            return sum + percentage;
          }, 0) / submissions.length
        : 0;

      stats = {
        assignedTests,
        completedTests,
        pendingTests,
        averageScore: Math.round(averageScore),
        role
      };
    }

    res.json({ stats });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
