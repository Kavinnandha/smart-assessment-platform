import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, Users, FileText, ArrowLeft, Eye, EyeOff, Edit, PlayCircle, Send, AlertCircle, CheckCircle, Download, File } from 'lucide-react';

interface Question {
  _id: string;
  question: {
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
    chapter: string;
    topic: string;
    difficultyLevel: string;
    options?: string[];
    correctAnswer?: string;
  };
  marks: number;
  order: number;
}

interface Answer {
  question: string;
  answer: string;
}

interface Test {
  _id: string;
  title: string;
  subject: {
    _id: string;
    name: string;
  };
  description?: string;
  duration: number;
  totalMarks: number;
  questions: Question[];
  assignedTo: {
    _id: string;
    name: string;
    email: string;
  }[];
  scheduledDate?: string;
  deadline?: string;
  isPublished: boolean;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

const TakeTestPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  
  // Get API base URL for file uploads
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const FILE_BASE_URL = API_BASE_URL.replace('/api', '');
  
  // Student test-taking state
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [testStarted, setTestStarted] = useState(false);
  
  const isStudent = user?.role === 'student';
  const isTakingTest = location.pathname.includes('/tests/take/');

  useEffect(() => {
    fetchTest();
    if (isStudent && isTakingTest) {
      checkExistingSubmission();
    }
  }, [id, isStudent, isTakingTest]);

  const checkExistingSubmission = async () => {
    try {
      const response = await api.get('/submissions');
      const submissions = response.data.submissions || [];
      const existingSubmission = submissions.find(
        (sub: any) => sub.test === id || sub.test?._id === id
      );
      
      if (existingSubmission) {
        setAlreadySubmitted(true);
      }
    } catch (error) {
      console.error('Failed to check submissions:', error);
    }
  };

  // Timer for students
  useEffect(() => {
    if (testStarted && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [testStarted, timeRemaining]);

  const fetchTest = async () => {
    try {
      const response = await api.get(`/tests/${id}`);
      const fetchedTest = response.data.test;
      setTest(fetchedTest);
      
      // Initialize answers for students
      if (isStudent) {
        const initialAnswers = fetchedTest.questions.map((q: Question) => ({
          question: q.question._id,
          answer: ''
        }));
        setAnswers(initialAnswers);
      }
    } catch (error) {
      console.error('Failed to fetch test:', error);
      alert('Failed to load test details');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = () => {
    if (test) {
      setTimeRemaining(test.duration * 60); // Convert minutes to seconds
      setTestStarted(true);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) =>
      prev.map((a) =>
        a.question === questionId ? { ...a, answer } : a
      )
    );
  };

  const handleSubmit = async () => {
    if (!test) return;
    
    const unanswered = answers.filter(a => !a.answer.trim()).length;
    if (unanswered > 0) {
      if (!window.confirm(`You have ${unanswered} unanswered question(s). Do you want to submit anyway?`)) {
        return;
      }
    }

    setSubmitting(true);
    try {
      await api.post('/submissions', {
        testId: test._id,
        answers: answers,
        timeTaken: (test.duration * 60) - timeRemaining
      });
      
      alert('Test submitted successfully!');
      navigate('/tests');
    } catch (error: any) {
      console.error('Failed to submit test:', error);
      alert(error.response?.data?.message || 'Failed to submit test');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async () => {
    try {
      await api.patch(`/tests/${id}/publish`);
      alert('Test published successfully');
      fetchTest();
    } catch (error) {
      console.error('Failed to publish test:', error);
      alert('Failed to publish test');
    }
  };

  const handleUnpublish = async () => {
    if (!window.confirm('Are you sure you want to unpublish this test? Students will no longer see it.')) {
      return;
    }

    try {
      await api.patch(`/tests/${id}/unpublish`);
      alert('Test unpublished successfully');
      fetchTest();
    } catch (error) {
      console.error('Failed to unpublish test:', error);
      alert('Failed to unpublish test');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper function to render question text with inline attachments
  const renderQuestionWithAttachments = (questionText: string, attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }>) => {
    if (!attachments || attachments.length === 0) {
      return <p className="text-lg font-medium text-gray-900 mb-2">{questionText}</p>;
    }

    // Check if question text contains attachment placeholders
    const placeholderRegex = /\{\{attachment:(\d+)\}\}/g;
    const hasPlaceholders = placeholderRegex.test(questionText);

    if (!hasPlaceholders) {
      // No placeholders found, display attachments at the end (backward compatibility)
      return (
        <>
          <p className="text-lg font-medium text-gray-900 mb-2">{questionText}</p>
          <div className="mt-4 space-y-2">
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
          <div key={`attachment-${attachmentIndex}`} className="my-4">
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
      <div className="text-lg font-medium text-gray-900 mb-2">
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
            <p className="text-xs text-gray-500">{attachment.fileName}</p>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-gray-50 border rounded-lg max-w-md">
            <File className="w-5 h-5 text-gray-500 shrink-0" />
            <a 
              href={`${FILE_BASE_URL}${attachment.fileUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline truncate flex-1"
            >
              {attachment.fileName}
            </a>
            <Download className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-gray-600">Loading test details...</p>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-red-600">Test not found</p>
          <Button onClick={() => navigate('/tests')} className="mt-4">
            Back to Tests
          </Button>
        </div>
      </div>
    );
  }

  // Student view - Test taking interface
  if (isStudent && isTakingTest) {
    // Check if student has already submitted this test
    if (alreadySubmitted) {
      return (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-8 rounded-lg shadow">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                <CheckCircle className="h-8 w-8 text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Test Already Submitted</h1>
              <p className="text-lg text-gray-600 mb-6">
                You have already submitted this test. Only one attempt is allowed.
              </p>
              
              <div className="bg-blue-50 p-6 rounded-lg mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{test?.title}</h2>
                <p className="text-gray-600">{test?.subject?.name || 'N/A'}</p>
              </div>

              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => navigate('/tests')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Tests
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (!testStarted) {
      return (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-8 rounded-lg shadow">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{test.title}</h1>
            <p className="text-lg text-gray-600 mb-6">{test.subject?.name || 'N/A'}</p>
            
            {test.description && (
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <p className="text-gray-700">{test.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-2 text-gray-700">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="font-semibold">{test.duration} minutes</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Questions</p>
                  <p className="font-semibold">{test.questions.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Total Marks</p>
                  <p className="font-semibold">{test.totalMarks}</p>
                </div>
              </div>
              {test.deadline && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm text-gray-500">Deadline</p>
                    <p className="font-medium text-sm">{formatDate(test.deadline)}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-900 mb-2">Important Instructions:</h3>
                  <ul className="list-disc list-inside space-y-1 text-yellow-800 text-sm">
                    <li>Once you start, the timer will begin automatically</li>
                    <li>You cannot pause or restart the test</li>
                    <li>All answers are auto-saved as you type</li>
                    <li>Test will auto-submit when time expires</li>
                    <li>Make sure you have stable internet connection</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/tests')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleStartTest}
                className="bg-green-600 hover:bg-green-700 flex-1"
              >
                <PlayCircle className="h-5 w-5 mr-2" />
                Start Test
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Test in progress
    return (
      <div className="max-w-5xl mx-auto">
        {/* Timer and Header */}
        <div className="bg-white p-4 rounded-lg shadow mb-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{test.title}</h2>
              <p className="text-sm text-gray-600">{test.subject?.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Time Remaining</p>
                <p className={`text-2xl font-bold ${timeRemaining < 300 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatTime(timeRemaining)}
                </p>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="h-4 w-4 mr-2" />
                {submitting ? 'Submitting...' : 'Submit Test'}
              </Button>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {test.questions
            .sort((a, b) => a.order - b.order)
            .map((item, index) => {
              const answer = answers.find(a => a.question === item.question._id);
              return (
                <div key={item._id} className="bg-white p-6 rounded-lg shadow">
                  <div className="flex gap-4">
                    <div className="shrink-0">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                        {index + 1}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          {renderQuestionWithAttachments(item.question.questionText, item.question.attachments)}
                          {item.question.questionImage && (
                            <img 
                              src={item.question.questionImage} 
                              alt="Question" 
                              className="max-w-md rounded-lg border mb-4"
                            />
                          )}
                          <div className="flex gap-4 text-sm text-gray-600">
                            <span>Chapter: {item.question.chapter}</span>
                            {item.question.topic && <span>Topic: {item.question.topic}</span>}
                          </div>
                        </div>
                        <span className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium shrink-0">
                          {item.marks} marks
                        </span>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Your Answer:
                        </label>
                        <Textarea
                          value={answer?.answer || ''}
                          onChange={(e) => handleAnswerChange(item.question._id, e.target.value)}
                          placeholder="Type your answer here..."
                          className="min-h-32"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Submit Button at Bottom */}
        <div className="mt-6 bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <p className="text-gray-600">
              Answered: {answers.filter(a => a.answer.trim()).length} / {test.questions.length}
            </p>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              size="lg"
              className="bg-green-600 hover:bg-green-700"
            >
              <Send className="h-5 w-5 mr-2" />
              {submitting ? 'Submitting...' : 'Submit Test'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Teacher view - Test details
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          onClick={() => navigate('/tests')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tests
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/tests/edit/${test._id}`)}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Test
          </Button>
          
          {test.isPublished ? (
            <Button
              variant="outline"
              onClick={handleUnpublish}
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            >
              <EyeOff className="h-4 w-4 mr-2" />
              Unpublish
            </Button>
          ) : (
            <Button
              onClick={handlePublish}
              className="bg-green-600 hover:bg-green-700"
            >
              <Eye className="h-4 w-4 mr-2" />
              Publish
            </Button>
          )}
        </div>
      </div>

      {/* Test Header */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {test.title}
            </h1>
            <p className="text-lg text-gray-600">{test.subject?.name || 'N/A'}</p>
          </div>
          {test.isPublished ? (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              Published
            </span>
          ) : (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
              Draft
            </span>
          )}
        </div>

        {test.description && (
          <p className="text-gray-700 mb-4 p-4 bg-gray-50 rounded-lg">
            {test.description}
          </p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2 text-gray-700">
            <Clock className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Duration</p>
              <p className="font-semibold">{test.duration} minutes</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <FileText className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Questions</p>
              <p className="font-semibold">{test.questions.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <FileText className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Total Marks</p>
              <p className="font-semibold">{test.totalMarks}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Users className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Assigned To</p>
              <p className="font-semibold">{test.assignedTo.length} students</p>
            </div>
          </div>
        </div>

        {(test.scheduledDate || test.deadline) && (
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
            {test.scheduledDate && (
              <div className="flex items-center gap-2 text-gray-700">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-500">Scheduled Date</p>
                  <p className="font-medium text-sm">{formatDate(test.scheduledDate)}</p>
                </div>
              </div>
            )}
            {test.deadline && (
              <div className="flex items-center gap-2 text-gray-700">
                <Calendar className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-xs text-gray-500">Deadline</p>
                  <p className="font-medium text-sm">{formatDate(test.deadline)}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-gray-600">
            Created by <span className="font-medium">{test.createdBy.name}</span> on{' '}
            {formatDate(test.createdAt)}
          </p>
        </div>
      </div>

      {/* Questions List */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Questions ({test.questions.length})</h2>
        <div className="space-y-4">
          {test.questions
            .sort((a, b) => a.order - b.order)
            .map((item, index) => (
              <div key={item._id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start gap-4">
                  <div className="shrink-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm text-gray-500">
                          Q{item.question.questionNumber}
                        </p>
                        <div className="mt-1">
                          {renderQuestionWithAttachments(item.question.questionText, item.question.attachments)}
                        </div>
                        {/* Display question image if exists */}
                        {item.question.questionImage && (
                          <img 
                            src={item.question.questionImage} 
                            alt="Question" 
                            className="max-w-md rounded-lg border mt-2"
                          />
                        )}
                      </div>
                      <span className="ml-4 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium shrink-0">
                        {item.marks} marks
                      </span>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-600 mt-2">
                      <span>Chapter: {item.question.chapter}</span>
                      {item.question.topic && (
                        <span>Topic: {item.question.topic}</span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          item.question.difficultyLevel === 'easy'
                            ? 'bg-green-100 text-green-800'
                            : item.question.difficultyLevel === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {item.question.difficultyLevel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Assigned Students */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">
          Assigned Students ({test.assignedTo.length})
        </h2>
        {test.assignedTo.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No students assigned to this test
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {test.assignedTo.map((student) => (
              <div
                key={student._id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
                  {student.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {student.name}
                  </p>
                  <p className="text-sm text-gray-600 truncate">{student.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TakeTestPage;
