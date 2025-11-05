import { Response } from 'express';
import Submission from '../models/Submission.model';
import Test from '../models/Test.model';
import Question from '../models/Question.model';
import { AuthRequest } from '../middleware/auth.middleware';
import XLSX from 'xlsx';

export const createSubmission = async (req: AuthRequest, res: Response) => {
  try {
    const { testId, answers, timeTaken } = req.body;

    // Check if submission already exists
    const existing = await Submission.findOne({
      test: testId,
      student: req.user?.userId
    });

    if (existing) {
      return res.status(400).json({ message: 'Submission already exists' });
    }

    // Get test with questions populated
    const test = await Test.findById(testId).populate('questions.question');
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    // Auto-evaluate MCQ and True/False questions
    const evaluatedAnswers = await Promise.all(
      answers.map(async (answer: any) => {
        const testQuestion = test.questions.find(
          q => q.question._id.toString() === answer.question.toString()
        );

        if (!testQuestion) {
          return {
            question: answer.question,
            answerText: answer.answer,
            marksObtained: 0
          };
        }

        const question: any = testQuestion.question;
        const maxMarks = testQuestion.marks;

        // Auto-grade MCQ and True/False questions
        if (question.questionType === 'multiple-choice' || question.questionType === 'true-false') {
          const studentAnswer = answer.answer?.trim();
          const correctAnswer = question.correctAnswer?.trim();

          const isCorrect = studentAnswer && correctAnswer && 
                           studentAnswer.toLowerCase() === correctAnswer.toLowerCase();

          return {
            question: answer.question,
            answerText: answer.answer,
            marksObtained: isCorrect ? maxMarks : 0,
            remarks: isCorrect ? 'Correct (Auto-graded)' : 'Incorrect (Auto-graded)'
          };
        } else {
          // Short answer and long answer need manual evaluation
          return {
            question: answer.question,
            answerText: answer.answer,
            marksObtained: 0,
            remarks: 'Pending manual evaluation'
          };
        }
      })
    );

    // Calculate total marks obtained (only for auto-graded questions)
    const totalMarksObtained = evaluatedAnswers.reduce(
      (sum, ans) => sum + (ans.marksObtained || 0), 
      0
    );

    // Determine status: evaluated if all questions are auto-gradable, otherwise submitted
    const allAutoGradable = test.questions.every((tq: any) => {
      const q = tq.question;
      return q.questionType === 'multiple-choice' || q.questionType === 'true-false';
    });

    const submission = new Submission({
      test: testId,
      student: req.user?.userId,
      answers: evaluatedAnswers,
      timeTaken,
      totalMarksObtained: allAutoGradable ? totalMarksObtained : undefined,
      status: allAutoGradable ? 'evaluated' : 'submitted',
      evaluatedBy: allAutoGradable ? req.user?.userId : undefined,
      evaluatedAt: allAutoGradable ? new Date() : undefined
    });

    await submission.save();
    res.status(201).json({ 
      message: 'Submission created successfully', 
      submission,
      autoGraded: allAutoGradable,
      totalMarksObtained: allAutoGradable ? totalMarksObtained : undefined
    });
  } catch (error) {
    console.error('Create submission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getSubmissions = async (req: AuthRequest, res: Response) => {
  try {
    const { testId, status } = req.query;
    const filter: any = {};

    if (testId) filter.test = testId;
    if (status) filter.status = status;

    // Filter based on role
    if (req.user?.role === 'student') {
      filter.student = req.user.userId;
    }

    const submissions = await Submission.find(filter)
      .populate('student', 'name email')
      .populate({
        path: 'test',
        select: 'title subject totalMarks',
        populate: {
          path: 'subject',
          select: 'name'
        }
      })
      .populate('answers.question')
      .populate('evaluatedBy', 'name email')
      .sort({ submittedAt: -1 });

    res.json({ submissions });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getSubmissionById = async (req: AuthRequest, res: Response) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('student', 'name email')
      .populate({
        path: 'test',
        populate: {
          path: 'questions.question subject',
          select: 'questionNumber questionText questionImage chapter topic marks name'
        }
      })
      .populate('answers.question')
      .populate('evaluatedBy', 'name email');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    res.json({ submission });
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const evaluateSubmission = async (req: AuthRequest, res: Response) => {
  try {
    const { answers } = req.body;

    // Validate marks
    const test = await Test.findById(req.body.testId).populate('questions.question');
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    // Validate each answer's marks
    for (const answer of answers) {
      const testQuestion = test.questions.find(
        q => q.question._id.toString() === answer.question.toString()
      );
      if (testQuestion && answer.marksObtained > testQuestion.marks) {
        return res.status(400).json({ 
          message: `Marks obtained cannot exceed ${testQuestion.marks} for question ${answer.question}` 
        });
      }
    }

    // Calculate total marks
    const totalMarksObtained = answers.reduce((sum: number, ans: any) => sum + (ans.marksObtained || 0), 0);

    const submission = await Submission.findByIdAndUpdate(
      req.params.id,
      {
        answers,
        totalMarksObtained,
        evaluatedBy: req.user?.userId,
        evaluatedAt: new Date(),
        status: 'evaluated'
      },
      { new: true, runValidators: true }
    ).populate('answers.question');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    res.json({ message: 'Submission evaluated successfully', submission });
  } catch (error) {
    console.error('Evaluate submission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const bulkEvaluate = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    let updatedCount = 0;

    for (const row of data) {
      const rowData = row as any;
      const submission = await Submission.findById(rowData.submissionId);
      if (submission) {
        // Parse marks data from Excel
        const answers = submission.answers.map((ans: any, index: number) => ({
          ...ans.toObject(),
          marksObtained: rowData[`Q${index + 1}_Marks`] !== undefined ? Number(rowData[`Q${index + 1}_Marks`]) : ans.marksObtained,
          remarks: rowData[`Q${index + 1}_Remarks`] || ans.remarks
        }));

        const totalMarksObtained = answers.reduce((sum, ans) => sum + (ans.marksObtained || 0), 0);

        await Submission.findByIdAndUpdate(rowData.submissionId, {
          answers,
          totalMarksObtained,
          evaluatedBy: req.user?.userId,
          evaluatedAt: new Date(),
          status: 'evaluated'
        });

        updatedCount++;
      }
    }

    res.json({ 
      message: `${updatedCount} submissions evaluated successfully`,
      count: updatedCount 
    });
  } catch (error) {
    console.error('Bulk evaluate error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const exportSubmissions = async (req: AuthRequest, res: Response) => {
  try {
    const { testId } = req.query;
    
    const submissions = await Submission.find({ test: testId })
      .populate('student', 'name email')
      .populate('test', 'title')
      .populate('answers.question', 'questionNumber questionText')
      .lean();

    const exportData: any[] = [];

    for (const sub of submissions) {
      const student = sub.student as any;
      const row: any = {
        'Submission ID': sub._id,
        'Student Name': student.name,
        'Student Email': student.email,
        'Status': sub.status,
        'Total Marks': sub.totalMarksObtained || 'Not Evaluated',
        'Time Taken (min)': sub.timeTaken || 'N/A'
      };

      // Add question-wise marks
      sub.answers.forEach((ans: any, index: number) => {
        row[`Q${index + 1}_Marks`] = ans.marksObtained || '';
        row[`Q${index + 1}_Remarks`] = ans.remarks || '';
      });

      exportData.push(row);
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Submissions');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=submissions.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Export submissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
