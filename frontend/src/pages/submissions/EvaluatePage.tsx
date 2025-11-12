import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, User, Calendar, Clock, FileText, CheckCircle, AlertCircle, Download, File, Sparkles, Loader2 } from 'lucide-react';

interface Question {
  _id: string;
  questionNumber: string;
  questionText: string;
  questionImage?: string;
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }>;
  correctAnswerAttachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }>;
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
  resultsRestricted?: boolean;
}

const EvaluatePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiEvaluating, setAiEvaluating] = useState(false);
  const [evaluatedAnswers, setEvaluatedAnswers] = useState<EvaluatedAnswer[]>([]);
  
  // Get API base URL for file uploads
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const FILE_BASE_URL = API_BASE_URL.replace('/api', '');
  
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
      
      // Check if results are available (if answers array is empty and it's a student viewing)
      if (isStudent && fetchedSubmission.answers.length === 0 && fetchedSubmission.test?.questions?.length > 0) {
        // Results are not yet available for students
        setSubmission({
          ...fetchedSubmission,
          resultsRestricted: true
        });
      } else {
        setSubmission(fetchedSubmission);
      }
      
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

  const handleAIEvaluate = async () => {
    if (!submission) return;

    const confirm = window.confirm(
      'This will use AI to automatically evaluate all subjective questions. ' +
      'MCQ and True/False questions are already graded.\n\n' +
      'The AI will compare student answers with the correct answers in the database.\n\n' +
      'Continue with AI evaluation?'
    );

    if (!confirm) return;

    setAiEvaluating(true);
    try {
      const response = await api.put(`/submissions/${id}/ai-evaluate`);
      
      alert(
        `AI Evaluation Completed!\n\n` +
        `Questions Evaluated: ${response.data.evaluationDetails.totalQuestionsEvaluated}\n` +
        `Total Marks: ${response.data.evaluationDetails.totalMarksObtained}/${maxMarks}\n` +
        `Subject: ${response.data.evaluationDetails.subject}\n\n` +
        `The submission has been updated with AI evaluation results. You can review and adjust marks if needed.`
      );
      
      // Reload submission to get updated marks and remarks
      await fetchSubmission();
    } catch (error: any) {
      console.error('AI Evaluation failed:', error);
      const errorMessage = error.response?.data?.message || 'AI evaluation failed. Please check:\n1. LM Studio is running\n2. Questions have correct answers in database\n3. Backend server is responding';
      alert(`AI Evaluation Error:\n\n${errorMessage}`);
    } finally {
      setAiEvaluating(false);
    }
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

  // Helper function to render question text with inline attachments
  const renderQuestionWithAttachments = (questionText: string, attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }>) => {
    if (!attachments || attachments.length === 0) {
      return <p className="font-medium text-gray-900 mb-3">{questionText}</p>;
    }

    // Check if question text contains attachment placeholders
    const placeholderRegex = /\{\{attachment:(\d+)\}\}/g;
    const hasPlaceholders = placeholderRegex.test(questionText);

    if (!hasPlaceholders) {
      // No placeholders found, display attachments at the end (backward compatibility)
      return (
        <>
          <p className="font-medium text-gray-900 mb-3">{questionText}</p>
          <div className="mt-3 space-y-2">
            <p className="text-sm font-medium text-gray-700">Attachments:</p>
            {attachments.map((attachment, idx) => renderAttachment(attachment, idx))}
          </div>
        </>
      );
    }

    // Split text by placeholders and render inline
    const parts: (string | React.ReactNode)[] = [];
    let lastIndex = 0;
    const matches = questionText.matchAll(/\{\{attachment:(\d+)\}\}/g);

    for (const match of matches) {
      const matchIndex = match.index!;
      const attachmentIndex = parseInt(match[1]);

      // Add text before placeholder
      if (matchIndex > lastIndex) {
        parts.push(questionText.substring(lastIndex, matchIndex));
      }

      // Add attachment
      if (attachmentIndex < attachments.length) {
        parts.push(
          <div key={`attachment-${attachmentIndex}`} className="my-3">
            {renderAttachment(attachments[attachmentIndex], attachmentIndex)}
          </div>
        );
      }

      lastIndex = matchIndex + match[0].length;
    }

    // Add remaining text
    if (lastIndex < questionText.length) {
      parts.push(questionText.substring(lastIndex));
    }

    return (
      <div className="font-medium mb-3">
        {parts.map((part, idx) => 
          typeof part === 'string' ? <span key={idx}>{part}</span> : part
        )}
      </div>
    );
  };

  const renderAttachment = (attachment: {
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }, idx: number) => {
    return (
      <div key={idx} className="inline-block w-full">
        {attachment.fileType.startsWith('image/') ? (
          <div className="space-y-2">
            <img 
              src={`${FILE_BASE_URL}${attachment.fileUrl}`}
              alt={attachment.fileName}
              className="max-w-2xl rounded-lg border shadow-sm"
            />
            <p className="text-xs text-muted-foreground">{attachment.fileName}</p>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/20 border rounded-lg max-w-md">
            <File className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0" />
            <a 
              href={`${FILE_BASE_URL}${attachment.fileUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate flex-1"
            >
              {attachment.fileName}
            </a>
            <Download className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </div>
        )}
      </div>
    );
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

  if (submission.resultsRestricted) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={() => navigate('/tests')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tests
          </Button>
        </div>

        <div className="bg-card p-6 rounded-lg shadow text-center">
          <div className="mb-4">
            <Clock className="h-16 w-16 mx-auto text-orange-500 dark:text-orange-400 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Results Pending Publication</h2>
            <p className="text-muted-foreground mb-4">
              Your test has been submitted successfully! However, the results are not yet available for viewing.
            </p>
            <p className="text-muted-foreground mb-6">
              Your teacher needs to publish the results before you can see your score and evaluation.
            </p>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Test Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Test:</span>
                <span className="font-medium ml-2">{submission.test.title}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Subject:</span>
                <span className="font-medium ml-2">{submission.test.subject.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Submitted At:</span>
                <span className="font-medium ml-2">{new Date(submission.submittedAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 rounded-full text-xs ml-2">
                  Awaiting Result Publication
                </span>
              </div>
            </div>
          </div>

          <Button onClick={() => navigate('/tests')} className="bg-blue-600 hover:bg-blue-700">
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

        <div className="flex items-center gap-3">
          {/* AI Evaluate Button - Only for Teachers */}
          {!isStudent && (submission.status === 'pending' || submission.status === 'submitted') && (
            <Button
              onClick={handleAIEvaluate}
              disabled={aiEvaluating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {aiEvaluating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  AI Evaluating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Evaluate
                </>
              )}
            </Button>
          )}

          {submission.status === 'evaluated' ? (
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 rounded-full text-sm font-medium flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              Evaluated
            </span>
          ) : (
            <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 rounded-full text-sm font-medium flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Pending Evaluation
            </span>
          )}
        </div>
      </div>

      {/* Submission Info */}
      <div className="bg-card p-6 rounded-lg shadow mb-6">
        <h1 className="text-2xl font-bold mb-4">
          {submission.test.title}
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-xs text-muted-foreground">Student</p>
              <p className="font-medium">{submission.student.name}</p>
              <p className="text-xs text-muted-foreground">{submission.student.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-xs text-muted-foreground">Submitted</p>
              <p className="font-medium">{formatDate(submission.submittedAt)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-xs text-muted-foreground">Time Taken</p>
              <p className="font-medium">{formatTime(submission.timeTaken)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-xs text-muted-foreground">Subject</p>
              <p className="font-medium">{submission.test.subject.name}</p>
            </div>
          </div>
        </div>

        {submission.evaluatedBy && submission.evaluatedAt && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Evaluated by <span className="font-medium">{submission.evaluatedBy.name}</span> on{' '}
              {formatDate(submission.evaluatedAt)}
            </p>
          </div>
        )}
      </div>

      {/* Score Summary */}
      <div className="bg-card p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Score Summary</h2>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Score</p>
            <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
              {totalMarks.toFixed(1)} / {maxMarks}
            </p>
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-2">Percentage</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                <div
                  className={`h-4 rounded-full transition-all ${
                    percentage >= 75 ? 'bg-green-600 dark:bg-green-500' :
                    percentage >= 50 ? 'bg-yellow-600 dark:bg-yellow-500' :
                    'bg-red-600 dark:bg-red-500'
                  }`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              <span className={`text-xl font-bold ${
                percentage >= 75 ? 'text-green-600 dark:text-green-400' :
                percentage >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                'text-red-600 dark:text-red-400'
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
            <div key={answer.question._id} className="bg-card p-6 rounded-lg shadow">
              <div className="flex gap-4">
                <div className="shrink-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
                    {index + 1}
                  </div>
                </div>

                <div className="flex-1">
                  {/* Question */}
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">
                          Q{index + 1}
                        </p>
                        {renderQuestionWithAttachments(answer.question.questionText, answer.question.attachments)}
                        {answer.question.questionImage && (
                          <img 
                            src={answer.question.questionImage} 
                            alt="Question" 
                            className="max-w-md rounded-lg border mb-2"
                          />
                        )}
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>Chapter: {answer.question.chapter}</span>
                          {answer.question.topic && <span>Topic: {answer.question.topic}</span>}
                        </div>
                      </div>
                      <span className="ml-4 px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-full text-sm font-medium shrink-0">
                        {maxMarks} marks
                      </span>
                    </div>
                  </div>

                  {/* Student's Answer */}
                  <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg border">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {isStudent ? 'Your Answer:' : "Student's Answer:"}
                    </p>
                    <p className="whitespace-pre-wrap">
                      {answer.answer || answer.answerText || 'No answer provided'}
                    </p>
                  </div>

                  {/* Reference Answer Attachments - Only show to teachers */}
                  {!isStudent && answer.question.correctAnswerAttachments && answer.question.correctAnswerAttachments.length > 0 && (
                    <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-sm font-medium text-green-900 dark:text-green-400 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Reference Answer Attachments
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {answer.question.correctAnswerAttachments.map((attachment, idx) => {
                          const fileUrl = `${FILE_BASE_URL}${attachment.fileUrl}`;
                          return (
                            <div key={idx} className="border border-green-300 dark:border-green-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
                              {attachment.fileType.startsWith('image/') ? (
                                <div className="relative">
                                  <img 
                                    src={fileUrl}
                                    alt={attachment.fileName}
                                    className="w-full h-48 object-contain bg-gray-50 dark:bg-gray-900"
                                  />
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-48 bg-gray-50 dark:bg-gray-900">
                                  <File className="w-12 h-12 text-gray-400 dark:text-gray-600" />
                                </div>
                              )}
                              <div className="p-2 border-t border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                                <a 
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-medium text-green-900 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 truncate block"
                                >
                                  {attachment.fileName}
                                </a>
                                <p className="text-xs text-green-700 dark:text-green-500">
                                  {(attachment.fileSize / 1024).toFixed(2)} KB
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Evaluation Section */}
                  {isStudent ? (
                    // Student View - Read only
                    submission.status === 'evaluated' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-2">
                            Marks Obtained
                          </label>
                          <div className="flex items-center gap-2">
                            <span className={`text-3xl font-bold ${
                              (evaluatedAnswer?.marksObtained || 0) >= maxMarks * 0.75 ? 'text-green-600 dark:text-green-400' :
                              (evaluatedAnswer?.marksObtained || 0) >= maxMarks * 0.5 ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-red-600 dark:text-red-400'
                            }`}>
                              {evaluatedAnswer?.marksObtained ?? 0}
                            </span>
                            <span className="text-xl text-muted-foreground">/ {maxMarks}</span>
                          </div>
                        </div>

                        {evaluatedAnswer?.remarks && (
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-muted-foreground mb-2">
                              Teacher's Remarks
                            </label>
                            <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
                              <p className="whitespace-pre-wrap">
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
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                          Marks Obtained <span className="text-red-600 dark:text-red-400">*</span>
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
                          <span className="text-sm text-muted-foreground">/ {maxMarks}</span>
                        </div>
                        {evaluatedAnswer && evaluatedAnswer.marksObtained! > maxMarks && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Cannot exceed maximum marks
                          </p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
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
        <div className="mt-6 bg-card p-6 rounded-lg shadow sticky bottom-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-sm text-muted-foreground">
                  Total: <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalMarks.toFixed(1)}</span> / {maxMarks}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {percentage.toFixed(1)}% - {
                    percentage >= 75 ? 'Excellent' :
                    percentage >= 60 ? 'Good' :
                    percentage >= 50 ? 'Average' :
                    percentage >= 35 ? 'Below Average' :
                    'Needs Improvement'
                  }
                </p>
              </div>

              {/* AI Evaluate info */}
              {(submission.status === 'pending' || submission.status === 'submitted') && (
                <div className="border-l pl-6">
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">💡 Quick Tip</p>
                  <p className="text-xs text-muted-foreground">
                    Use "AI Evaluate" button above to<br />
                    automatically grade subjective answers
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {(submission.status === 'pending' || submission.status === 'submitted') && (
                <Button
                  onClick={handleAIEvaluate}
                  disabled={aiEvaluating}
                  size="lg"
                  variant="outline"
                  className="border-purple-600 text-purple-600 hover:bg-purple-50"
                >
                  {aiEvaluating ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      AI Evaluating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      AI Evaluate
                    </>
                  )}
                </Button>
              )}
              
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
        </div>
      )}
    </div>
  );
};

export default EvaluatePage;
