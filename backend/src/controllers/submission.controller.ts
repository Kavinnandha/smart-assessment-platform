import { Response } from 'express';
import mongoose from 'mongoose';
import Submission from '../models/Submission.model';
import Test from '../models/Test.model';
import Question from '../models/Question.model';
import { AuthRequest } from '../middleware/auth.middleware';
import XLSX from 'xlsx';
import { evaluateAnswerWithAI, batchEvaluateWithAI, EvaluationRequest } from '../services/ai-evaluation.service';

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

    // Check if results should be shown immediately
    const shouldShowResults = test.showResultsImmediately;

    if (shouldShowResults) {
      // Show results immediately
      res.status(201).json({ 
        message: 'Submission created successfully', 
        submission,
        autoGraded: allAutoGradable,
        totalMarksObtained: allAutoGradable ? totalMarksObtained : undefined,
        showResults: true
      });
    } else {
      // Hide results until teacher publishes them
      res.status(201).json({ 
        message: 'Submission created successfully. Results will be available after teacher evaluation.',
        showResults: false
      });
    }
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
          select: 'questionText questionImage chapter topic marks name'
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
      .populate('answers.question', 'questionText')
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

/**
 * AI-powered evaluation of a submission
 * Uses local LM Studio model to evaluate student answers against correct answers
 * Works with all subjects and handles pending/submitted status
 * @route PUT /api/submissions/:id/ai-evaluate
 */
export const aiEvaluateSubmission = async (req: AuthRequest, res: Response) => {
  try {
    const submissionId = req.params.id;
    const { forceReEvaluate } = req.query; // Optional: allow re-evaluation

    // Get submission with populated data (including subject info)
    const submission = await Submission.findById(submissionId)
      .populate({
        path: 'test',
        populate: [
          {
            path: 'questions.question',
            populate: {
              path: 'subject',
              select: 'name code'
            }
          },
          {
            path: 'subject',
            select: 'name code'
          }
        ]
      })
      .populate('answers.question');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const test = submission.test as any;

    if (!test || !test.questions) {
      return res.status(400).json({ message: 'Test data not found' });
    }

    // Check submission status - allow pending and submitted
    if (submission.status === 'evaluated' && !forceReEvaluate) {
      return res.status(400).json({ 
        message: 'Submission has already been evaluated. Use ?forceReEvaluate=true to re-evaluate.',
        currentStatus: submission.status,
        evaluatedAt: submission.evaluatedAt,
        totalMarksObtained: submission.totalMarksObtained
      });
    }

    // Log evaluation start with subject info
    console.log(`\n${'='.repeat(60)}`);
    console.log(`AI Evaluation Started`);
    console.log(`Submission ID: ${submissionId}`);
    console.log(`Test: ${test.title}`);
    if (test.subject) {
      console.log(`Subject: ${test.subject.name} (${test.subject.code || 'N/A'})`);
    }
    console.log(`Status: ${submission.status}`);
    console.log(`${'='.repeat(60)}\n`);

    // Prepare evaluation requests for all answers
    const evaluationRequests: EvaluationRequest[] = [];
    const answerMapping: any[] = [];

    for (const answer of submission.answers) {
      const question = answer.question as any;
      
      // Find the corresponding test question to get max marks
      const testQuestion = test.questions.find(
        (tq: any) => tq.question._id.toString() === question._id.toString()
      );

      if (!testQuestion) {
        continue;
      }

      const maxMarks = testQuestion.marks;

      // Only evaluate questions that need evaluation (not MCQ or True/False)
      if (question.questionType === 'short-answer' || question.questionType === 'long-answer') {
        evaluationRequests.push({
          questionText: question.questionText,
          correctAnswer: question.correctAnswer || 'No model answer provided',
          studentAnswer: answer.answerText || '',
          maxMarks: maxMarks
        });

        answerMapping.push({
          questionId: question._id,
          maxMarks: maxMarks
        });
      }
    }

    if (evaluationRequests.length === 0) {
      // Check if all questions are already graded
      const allAnswersGraded = submission.answers.every(
        (ans: any) => ans.marksObtained !== undefined && ans.marksObtained !== null
      );

      if (allAnswersGraded) {
        return res.status(400).json({ 
          message: 'No questions to evaluate. All questions are already graded (auto-graded or manually evaluated).',
          suggestion: 'Use ?forceReEvaluate=true to re-evaluate or use manual evaluation to adjust marks.'
        });
      } else {
        return res.status(400).json({ 
          message: 'No subjective questions found to evaluate. Only MCQ/True-False questions exist or questions lack correct answers.',
          tip: 'Ensure questions have correctAnswer field populated in the database.'
        });
      }
    }

    // Evaluate using AI
    console.log(`🤖 Starting AI evaluation for ${evaluationRequests.length} answer(s)...`);
    console.log(`📚 Subject: ${test.subject?.name || 'Unknown'}`);
    console.log(`⏳ Estimated time: ${evaluationRequests.length * 3}-${evaluationRequests.length * 5} seconds\n`);
    
    const evaluationResults = await batchEvaluateWithAI(evaluationRequests);
    
    console.log(`✅ AI evaluation completed for ${evaluationResults.length} answer(s)\n`);

    // Update submission with AI evaluation results
    const updatedAnswers = submission.answers.map((answer) => {
      const question = answer.question as any;
      const mappingIndex = answerMapping.findIndex(
        (m: any) => m.questionId.toString() === question._id.toString()
      );

      if (mappingIndex !== -1) {
        const evaluation = evaluationResults[mappingIndex];
        return {
          question: answer.question,
          answerText: answer.answerText,
          answerImage: answer.answerImage,
          marksObtained: evaluation.marksObtained,
          remarks: `AI Evaluation: ${evaluation.feedback}`
        };
      }

      return answer;
    });

    // Calculate total marks
    const totalMarksObtained = updatedAnswers.reduce(
      (sum: number, ans: any) => sum + (ans.marksObtained || 0),
      0
    );

    // Update submission
    submission.answers = updatedAnswers;
    submission.totalMarksObtained = totalMarksObtained;
    submission.evaluatedBy = req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined;
    submission.evaluatedAt = new Date();
    submission.status = 'evaluated';

    await submission.save();

    // Log completion
    console.log(`${'='.repeat(60)}`);
    console.log(`✅ AI Evaluation Completed Successfully`);
    console.log(`Total Marks Obtained: ${totalMarksObtained}/${test.questions.reduce((sum: number, q: any) => sum + q.marks, 0)}`);
    console.log(`Questions Evaluated: ${evaluationRequests.length}`);
    console.log(`${'='.repeat(60)}\n`);

    res.json({
      message: 'Submission evaluated successfully using AI',
      submission: await Submission.findById(submissionId)
        .populate('student', 'name email')
        .populate({
          path: 'test',
          select: 'title subject totalMarks',
          populate: {
            path: 'subject',
            select: 'name code'
          }
        })
        .populate('answers.question')
        .populate('evaluatedBy', 'name email'),
      evaluationDetails: {
        totalQuestionsEvaluated: evaluationRequests.length,
        totalQuestions: submission.answers.length,
        totalMarksObtained,
        subject: test.subject?.name || 'Unknown',
        aiModel: 'LM Studio - Local AI',
        evaluatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('AI Evaluate submission error:', error);
    res.status(500).json({ 
      message: 'Server error during AI evaluation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * AI-powered evaluation of a single answer within a submission
 * @route POST /api/submissions/:id/evaluate-answer
 */
export const aiEvaluateSingleAnswer = async (req: AuthRequest, res: Response) => {
  try {
    const submissionId = req.params.id;
    const { questionId } = req.body;

    // Get submission
    const submission = await Submission.findById(submissionId)
      .populate({
        path: 'test',
        populate: {
          path: 'questions.question'
        }
      })
      .populate('answers.question');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const test = submission.test as any;

    // Find the specific answer
    const answerIndex = submission.answers.findIndex(
      (ans: any) => ans.question._id.toString() === questionId
    );

    if (answerIndex === -1) {
      return res.status(404).json({ message: 'Answer not found in submission' });
    }

    const answer = submission.answers[answerIndex];
    const question = answer.question as any;

    // Find max marks for this question
    const testQuestion = test.questions.find(
      (tq: any) => tq.question._id.toString() === questionId
    );

    if (!testQuestion) {
      return res.status(404).json({ message: 'Question not found in test' });
    }

    const maxMarks = testQuestion.marks;

    // Evaluate using AI
    const evaluation = await evaluateAnswerWithAI({
      questionText: question.questionText,
      correctAnswer: question.correctAnswer || 'No model answer provided',
      studentAnswer: answer.answerText || '',
      maxMarks: maxMarks
    });

    // Update the specific answer
    submission.answers[answerIndex].marksObtained = evaluation.marksObtained;
    submission.answers[answerIndex].remarks = `AI Evaluation: ${evaluation.feedback}`;

    // Recalculate total marks
    const totalMarksObtained = submission.answers.reduce(
      (sum: number, ans: any) => sum + (ans.marksObtained || 0),
      0
    );

    submission.totalMarksObtained = totalMarksObtained;

    // Check if all answers are evaluated
    const allEvaluated = submission.answers.every(
      (ans: any) => ans.marksObtained !== undefined && ans.marksObtained !== null
    );

    if (allEvaluated && submission.status !== 'evaluated') {
      submission.status = 'evaluated';
      submission.evaluatedBy = req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined;
      submission.evaluatedAt = new Date();
    }

    await submission.save();

    res.json({
      message: 'Answer evaluated successfully using AI',
      evaluation: {
        questionId: questionId,
        marksObtained: evaluation.marksObtained,
        maxMarks: maxMarks,
        feedback: evaluation.feedback,
        evaluationDetails: evaluation.evaluationDetails
      },
      submission: {
        totalMarksObtained: submission.totalMarksObtained,
        status: submission.status
      }
    });
  } catch (error) {
    console.error('AI Evaluate answer error:', error);
    res.status(500).json({ 
      message: 'Server error during AI evaluation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
