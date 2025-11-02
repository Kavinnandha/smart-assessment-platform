import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, User, Calendar, Clock, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface Question {
  _id: string;
  questionNumber: string;
  questionText: string;
  questionImage?: string;
  chapter: string;
  topic: string;
  marks: number;
}

interface Answer {
  question: Question;
  answer?: string;
  answerText?: string;
  marksObtained?: number;
  remarks?: string;
}

interface EvaluatedAnswer {
  question: string;
  marksObtained?: number;
  remarks?: string;
}

interface Submission {
  _id: string;
  test: {
    _id: string;
    title: string;
    subject: {
      name: string;
    };
    totalMarks: number;
    questions: {
      question: Question;
      marks: number;
    }[];
  };
  student: {
    _id: string;
    name: string;
    email: string;
  };
  answers: Answer[];
  totalMarksObtained?: number;
  submittedAt: string;
  timeTaken?: number;
  status: string;
  isEvaluated?: boolean;
  evaluatedBy?: {
    name: string;
  };
  evaluatedAt?: string;
}

const EvaluatePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [evaluatedAnswers, setEvaluatedAnswers] = useState<EvaluatedAnswer[]>([]);
  
  const isStudent = user?.role === 'student';

  useEffect(() => {
    fetchSubmission();
  }, [id]);

  const fetchSubmission = async () => {
    try {
      const response = await api.get(`/submissions/${id}`);
      const fetchedSubmission = response.data.submission;
      console.log('Fetched submission:', fetchedSubmission);
      console.log('Test questions:', fetchedSubmission.test?.questions);
      setSubmission(fetchedSubmission);
      
      // Initialize evaluated answers with existing data or defaults
      const initialAnswers = fetchedSubmission.answers.map((ans: Answer) => ({
        question: ans.question._id,
        marksObtained: ans.marksObtained ?? 0,
        remarks: ans.remarks ?? ''
      }));
      setEvaluatedAnswers(initialAnswers);
    } catch (error) {
      console.error('Failed to fetch submission:', error);
      alert('Failed to load submission');
    } finally {
      setLoading(false);
    }
  };

  const handleMarksChange = (questionId: string, marks: string) => {
    const numMarks = parseFloat(marks) || 0;
    setEvaluatedAnswers((prev) =>
      prev.map((ans) =>
        ans.question === questionId ? { ...ans, marksObtained: numMarks } : ans
      )
    );
  };

  const handleRemarksChange = (questionId: string, remarks: string) => {
    setEvaluatedAnswers((prev) =>
      prev.map((ans) =>
        ans.question === questionId ? { ...ans, remarks } : ans
      )
    );
  };

  const calculateTotalMarks = () => {
    return evaluatedAnswers.reduce((sum, ans) => sum + (ans.marksObtained || 0), 0);
  };

  const handleSubmit = async () => {
    if (!submission) return;

    // Validate marks
    for (let i = 0; i < evaluatedAnswers.length; i++) {
      const answer = evaluatedAnswers[i];
      const testQuestion = submission.test.questions.find(
        q => q.question._id === answer.question
      );
      
      if (testQuestion && answer.marksObtained! > testQuestion.marks) {
        alert(`Marks for question ${i + 1} cannot exceed ${testQuestion.marks}`);
        return;
      }

      if (answer.marksObtained! < 0) {
        alert(`Marks for question ${i + 1} cannot be negative`);
        return;
      }
    }

    // Merge student answers with evaluation data
    const completeAnswers = submission.answers.map((ans) => {
      const evaluation = evaluatedAnswers.find(e => e.question === ans.question._id);
      return {
        question: ans.question._id,
        answerText: ans.answer || ans.answerText,
        marksObtained: evaluation?.marksObtained || 0,
        remarks: evaluation?.remarks || ''
      };
    });

    setSaving(true);
    try {
      await api.put(`/submissions/${id}/evaluate`, {
        testId: submission.test._id,
        answers: completeAnswers
      });
      
      alert('Submission evaluated successfully!');
      navigate(isStudent ? '/tests' : `/tests/submissions?testId=${submission.test._id}`);
    } catch (error: any) {
      console.error('Failed to evaluate submission:', error);
      alert(error.response?.data?.message || 'Failed to evaluate submission');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatTime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-gray-600">Loading submission...</p>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-red-600">Submission not found</p>
          <Button onClick={() => navigate('/tests')} className="mt-4">
            Back to Tests
          </Button>
        </div>
      </div>
    );
  }

  const totalMarks = calculateTotalMarks();
  const maxMarks = submission.test.totalMarks;
  const percentage = maxMarks > 0 ? (totalMarks / maxMarks) * 100 : 0;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          onClick={() => navigate(isStudent ? '/tests' : `/tests/submissions?testId=${submission.test._id}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {isStudent ? 'Back to Tests' : 'Back to Submissions'}
        </Button>

        <div className="flex items-center gap-2">
          {submission.status === 'evaluated' ? (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              Evaluated
            </span>
          ) : (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Pending Evaluation
            </span>
          )}
        </div>
      </div>

      {/* Submission Info */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {submission.test.title}
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Student</p>
              <p className="font-medium text-gray-900">{submission.student.name}</p>
              <p className="text-xs text-gray-600">{submission.student.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Submitted</p>
              <p className="font-medium text-gray-900">{formatDate(submission.submittedAt)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Time Taken</p>
              <p className="font-medium text-gray-900">{formatTime(submission.timeTaken)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Subject</p>
              <p className="font-medium text-gray-900">{submission.test.subject.name}</p>
            </div>
          </div>
        </div>

        {submission.evaluatedBy && submission.evaluatedAt && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600">
              Evaluated by <span className="font-medium">{submission.evaluatedBy.name}</span> on{' '}
              {formatDate(submission.evaluatedAt)}
            </p>
          </div>
        )}
      </div>

      {/* Score Summary */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Score Summary</h2>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Total Score</p>
            <p className="text-4xl font-bold text-blue-600">
              {totalMarks.toFixed(1)} / {maxMarks}
            </p>
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500 mb-2">Percentage</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200 rounded-full h-4">
                <div
                  className={`h-4 rounded-full transition-all ${
                    percentage >= 75 ? 'bg-green-600' :
                    percentage >= 50 ? 'bg-yellow-600' :
                    'bg-red-600'
                  }`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              <span className={`text-xl font-bold ${
                percentage >= 75 ? 'text-green-600' :
                percentage >= 50 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {percentage.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Questions and Answers */}
      <div className="space-y-6">
        {submission.answers.map((answer, index) => {
          // Find the matching test question with marks allocation
          const testQuestion = submission.test.questions.find(
            q => {
              // Handle both populated and unpopulated question IDs
              const qId = typeof q.question === 'object' ? q.question._id : q.question;
              const answerId = typeof answer.question === 'object' ? answer.question._id : answer.question;
              return qId.toString() === answerId.toString();
            }
          );
          const maxMarks = testQuestion?.marks || answer.question?.marks || 0;
          
          console.log('Question matching:', {
            index,
            answerQuestionId: answer.question._id,
            testQuestion: testQuestion,
            maxMarks
          });
          
          const evaluatedAnswer = evaluatedAnswers.find(
            a => a.question === answer.question._id
          );

          return (
            <div key={answer.question._id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex gap-4">
                <div className="shrink-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                    {index + 1}
                  </div>
                </div>

                <div className="flex-1">
                  {/* Question */}
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">
                          Q{answer.question.questionNumber}
                        </p>
                        <p className="text-lg font-medium text-gray-900 mb-2">
                          {answer.question.questionText}
                        </p>
                        {answer.question.questionImage && (
                          <img 
                            src={answer.question.questionImage} 
                            alt="Question" 
                            className="max-w-md rounded-lg border mb-2"
                          />
                        )}
                        <div className="flex gap-4 text-sm text-gray-600">
                          <span>Chapter: {answer.question.chapter}</span>
                          {answer.question.topic && <span>Topic: {answer.question.topic}</span>}
                        </div>
                      </div>
                      <span className="ml-4 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium shrink-0">
                        {maxMarks} marks
                      </span>
                    </div>
                  </div>

                  {/* Student's Answer */}
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      {isStudent ? 'Your Answer:' : "Student's Answer:"}
                    </p>
                    <p className="text-gray-900 whitespace-pre-wrap">
                      {answer.answer || answer.answerText || 'No answer provided'}
                    </p>
                  </div>

                  {/* Evaluation Section */}
                  {isStudent ? (
                    // Student View - Read only
                    submission.status === 'evaluated' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Marks Obtained
                          </label>
                          <div className="flex items-center gap-2">
                            <span className={`text-3xl font-bold ${
                              (evaluatedAnswer?.marksObtained || 0) >= maxMarks * 0.75 ? 'text-green-600' :
                              (evaluatedAnswer?.marksObtained || 0) >= maxMarks * 0.5 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {evaluatedAnswer?.marksObtained ?? 0}
                            </span>
                            <span className="text-xl text-gray-600">/ {maxMarks}</span>
                          </div>
                        </div>

                        {evaluatedAnswer?.remarks && (
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Teacher's Remarks
                            </label>
                            <div className="p-3 bg-white rounded-lg border">
                              <p className="text-gray-900 whitespace-pre-wrap">
                                {evaluatedAnswer.remarks}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    // Teacher View - Editable
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Marks Obtained <span className="text-red-600">*</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max={maxMarks}
                            step="0.5"
                            value={evaluatedAnswer?.marksObtained ?? 0}
                            onChange={(e) => handleMarksChange(answer.question._id, e.target.value)}
                            className="w-32"
                          />
                          <span className="text-sm text-gray-600">/ {maxMarks}</span>
                        </div>
                        {evaluatedAnswer && evaluatedAnswer.marksObtained! > maxMarks && (
                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Cannot exceed maximum marks
                          </p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Remarks (Optional)
                        </label>
                        <Textarea
                          value={evaluatedAnswer?.remarks ?? ''}
                          onChange={(e) => handleRemarksChange(answer.question._id, e.target.value)}
                          placeholder="Add feedback or comments for the student..."
                          className="min-h-20"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit Button - Only for Teachers */}
      {!isStudent && (
        <div className="mt-6 bg-white p-6 rounded-lg shadow sticky bottom-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                Total: <span className="text-2xl font-bold text-blue-600">{totalMarks.toFixed(1)}</span> / {maxMarks}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {percentage.toFixed(1)}% - {
                  percentage >= 75 ? 'Excellent' :
                  percentage >= 60 ? 'Good' :
                  percentage >= 50 ? 'Average' :
                  percentage >= 35 ? 'Below Average' :
                  'Needs Improvement'
                }
              </p>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              size="lg"
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="h-5 w-5 mr-2" />
              {saving ? 'Saving...' : submission.status === 'evaluated' ? 'Update Evaluation' : 'Save Evaluation'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluatePage;
