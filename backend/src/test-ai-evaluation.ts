/**
 * Test script for AI Evaluation Service
 * This script tests the AI evaluation with actual database data
 * 
 * Usage: npx ts-node src/test-ai-evaluation.ts <submissionId>
 * Example: npx ts-node src/test-ai-evaluation.ts 673abc123def456789
 * 
 * Prerequisites:
 * 1. MongoDB must be running and connected
 * 2. LM Studio must be running on http://127.0.0.1:1234
 * 3. A submission must exist in the database
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Submission from './models/Submission.model';
import Question from './models/Question.model';
import Test from './models/Test.model';
import { evaluateAnswerWithAI, batchEvaluateWithAI, EvaluationRequest } from './services/ai-evaluation.service';

// Load environment variables
dotenv.config();

async function connectDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-assessment';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');
  } catch (error: any) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
}

async function testWithDatabaseData(submissionId?: string) {
  console.log('🧪 Testing AI Evaluation with Database Data...\n');
  console.log('⚠️  Make sure LM Studio is running on http://127.0.0.1:1234\n');

  try {
    // Connect to database
    await connectDatabase();

    let submission;

    if (submissionId) {
      // Test with specific submission
      console.log(`📋 Fetching submission: ${submissionId}\n`);
      submission = await Submission.findById(submissionId)
        .populate({
          path: 'test',
          populate: {
            path: 'questions.question'
          }
        })
        .populate('answers.question')
        .populate('student', 'name email');
    } else {
      // Find any submission that needs evaluation
      console.log('📋 Looking for a submission to evaluate...\n');
      submission = await Submission.findOne({ 
        status: { $in: ['submitted', 'pending'] } 
      })
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
        .populate('answers.question')
        .populate('student', 'name email');
    }

    if (!submission) {
      console.log('⚠️  No submission found to evaluate.');
      console.log('\n💡 Tips:');
      console.log('   - Make sure students have submitted answers');
      console.log('   - Provide a submission ID as argument: npx ts-node src/test-ai-evaluation.ts <submissionId>');
      console.log('   - Check your database has submissions with status "submitted" or "pending"');
      await mongoose.disconnect();
      return;
    }

    const student = submission.student as any;
    const test = submission.test as any;

    console.log('📄 Submission Details:');
    console.log(`   Student: ${student.name} (${student.email})`);
    console.log(`   Test: ${test.title}`);
    if (test.subject) {
      console.log(`   Subject: ${test.subject.name}${test.subject.code ? ` (${test.subject.code})` : ''}`);
    }
    console.log(`   Status: ${submission.status}`);
    console.log(`   Total Answers: ${submission.answers.length}\n`);

    // Prepare evaluation requests for short-answer and long-answer questions
    const evaluationRequests: EvaluationRequest[] = [];
    const evaluationMapping: Array<{ index: number; questionText: string }> = [];

    for (let i = 0; i < submission.answers.length; i++) {
      const answer = submission.answers[i];
      const question = answer.question as any;

      // Find max marks from test
      const testQuestion = test.questions.find(
        (tq: any) => tq.question._id.toString() === question._id.toString()
      );

      if (!testQuestion) continue;

      const maxMarks = testQuestion.marks;

      // Only evaluate subjective questions (not already auto-graded)
      if (question.questionType === 'short-answer' || question.questionType === 'long-answer') {
        console.log(`\n📝 Question ${i + 1} (${question.questionType}):`);
        console.log(`   Q: ${question.questionText.substring(0, 100)}...`);
        console.log(`   Max Marks: ${maxMarks}`);
        console.log(`   Student Answer: ${answer.answerText?.substring(0, 100) || 'No answer'}...`);
        console.log(`   Correct Answer: ${question.correctAnswer?.substring(0, 100) || 'Not provided'}...`);

        if (!answer.answerText) {
          console.log('   ⚠️  Skipping - No student answer provided');
          continue;
        }

        if (!question.correctAnswer) {
          console.log('   ⚠️  Skipping - No correct answer in database');
          continue;
        }

        evaluationRequests.push({
          questionText: question.questionText,
          correctAnswer: question.correctAnswer,
          studentAnswer: answer.answerText,
          maxMarks: maxMarks
        });

        evaluationMapping.push({
          index: i,
          questionText: question.questionText.substring(0, 50)
        });
      } else {
        console.log(`\n✓ Question ${i + 1} (${question.questionType}) - Already auto-graded: ${answer.marksObtained || 0}/${maxMarks}`);
      }
    }

    if (evaluationRequests.length === 0) {
      console.log('\n⚠️  No questions to evaluate.');
      console.log('   All questions are either:');
      console.log('   - Already auto-graded (MCQ/True-False)');
      console.log('   - Missing student answers');
      console.log('   - Missing correct answers in database');
      await mongoose.disconnect();
      return;
    }

    console.log(`\n\n🤖 Starting AI Evaluation for ${evaluationRequests.length} answer(s)...\n`);
    console.log('⏳ This may take a few seconds per answer...\n');

    // Evaluate using AI
    const results = await batchEvaluateWithAI(evaluationRequests);

    // Display results
    console.log('\n' + '='.repeat(80));
    console.log('📊 EVALUATION RESULTS');
    console.log('='.repeat(80) + '\n');

    let totalMarks = 0;
    let totalMaxMarks = 0;

    results.forEach((result, index) => {
      const mapping = evaluationMapping[index];
      const request = evaluationRequests[index];
      
      console.log(`Question ${mapping.index + 1}: ${mapping.questionText}...`);
      console.log(`Marks Obtained: ${result.marksObtained}/${request.maxMarks}`);
      console.log(`Feedback: ${result.feedback}`);
      console.log(`Details: ${result.evaluationDetails}`);
      console.log('-'.repeat(80));

      totalMarks += result.marksObtained;
      totalMaxMarks += request.maxMarks;
    });

    console.log(`\n🎯 Total Marks: ${totalMarks.toFixed(2)}/${totalMaxMarks}`);
    console.log(`📈 Percentage: ${((totalMarks / totalMaxMarks) * 100).toFixed(2)}%\n`);

    console.log('✅ AI Evaluation Test Completed Successfully!');
    console.log('\n💡 To actually save these results to the database, use the API endpoint:');
    console.log(`   PUT /api/submissions/${submission._id}/ai-evaluate`);

  } catch (error: any) {
    console.error('\n❌ Test Failed:', error.message);
    console.error('\nFull Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Get submission ID from command line arguments
const submissionId = process.argv[2];

// Run the test
testWithDatabaseData(submissionId).catch(console.error);
