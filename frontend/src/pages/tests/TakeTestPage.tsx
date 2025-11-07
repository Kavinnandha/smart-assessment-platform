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
    correctAnswerAttachments?: Array<{
      fileName: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
    }>;
    attachmentPosition?: 'before' | 'after' | 'custom';
    questionType?: 'multiple-choice' | 'true-false' | 'short-answer' | 'long-answer';
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
      const response = await api.post('/submissions', {
        testId: test._id,
        answers: answers,
        timeTaken: (test.duration * 60) - timeRemaining
      });
      
      const { autoGraded, totalMarksObtained } = response.data;
      
      if (autoGraded) {
        alert(`Test submitted and auto-graded successfully!\n\nYour Score: ${totalMarksObtained} / ${test.totalMarks} marks`);
      } else {
        alert('Test submitted successfully! Results will be available after manual evaluation.');
      }
      
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

  const handleDownloadPDF = () => {
    if (!test) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to download the PDF');
      return;
    }

    // Helper function to render question with attachments
    const renderQuestionTextWithAttachments = (questionText: string, attachments?: Array<{
      fileName: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
    }>) => {
      if (!attachments || attachments.length === 0) {
        return questionText;
      }

      // Check if question text contains attachment placeholders
      const placeholderRegex = /\{\{attachment:(\d+)\}\}/g;
      let processedText = questionText;
      
      // Replace placeholders with actual attachment HTML
      processedText = processedText.replace(placeholderRegex, (match, index) => {
        const attachmentIndex = parseInt(index);
        if (attachmentIndex < attachments.length) {
          const attachment = attachments[attachmentIndex];
          const fileUrl = `${FILE_BASE_URL}${attachment.fileUrl}`;
          
          if (attachment.fileType.startsWith('image/')) {
            return `<div style="margin: 12px 0;">
              <img src="${fileUrl}" alt="${attachment.fileName}" style="max-width: 100%; max-height: 400px; border: 1px solid #e5e7eb; border-radius: 8px; display: block;" />
              <p style="font-size: 11px; color: #6b7280; margin-top: 4px; font-style: italic;">${attachment.fileName}</p>
            </div>`;
          } else {
            return `<div style="margin: 8px 0; padding: 8px; background-color: #f3f4f6; border-radius: 6px; border: 1px solid #d1d5db;">
              <span style="font-size: 12px; color: #374151;">📎 Attachment: ${attachment.fileName}</span>
              <br/><span style="font-size: 10px; color: #6b7280;">${fileUrl}</span>
            </div>`;
          }
        }
        return match;
      });

      return processedText;
    };

    // Helper function to render attachments section
    const renderAttachmentsSection = (attachments: Array<{
      fileName: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
    }>) => {
      return attachments.map(attachment => {
        const fileUrl = `${FILE_BASE_URL}${attachment.fileUrl}`;
        
        if (attachment.fileType.startsWith('image/')) {
          return `<div style="margin: 12px 0;">
            <img src="${fileUrl}" alt="${attachment.fileName}" style="max-width: 100%; max-height: 400px; border: 1px solid #e5e7eb; border-radius: 8px; display: block;" />
            <p style="font-size: 11px; color: #6b7280; margin-top: 4px; font-style: italic;">${attachment.fileName}</p>
          </div>`;
        } else {
          return `<div style="margin: 8px 0; padding: 8px; background-color: #f3f4f6; border-radius: 6px; border: 1px solid #d1d5db;">
            <span style="font-size: 12px; color: #374151;">📎 ${attachment.fileName}</span>
            <br/><span style="font-size: 10px; color: #6b7280;">URL: ${fileUrl}</span>
          </div>`;
        }
      }).join('');
    };

    // Generate HTML content for the PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${test.title} - Test Details</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 40px;
            color: #1f2937;
            line-height: 1.6;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #2563eb;
          }
          
          .header h1 {
            font-size: 28px;
            color: #1e40af;
            margin-bottom: 8px;
          }
          
          .header p {
            font-size: 16px;
            color: #6b7280;
          }
          
          .status-badge {
            display: inline-block;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            margin-top: 10px;
          }
          
          .status-published {
            background-color: #d1fae5;
            color: #065f46;
          }
          
          .status-draft {
            background-color: #fef3c7;
            color: #92400e;
          }
          
          .description {
            background-color: #f3f4f6;
            padding: 16px;
            border-radius: 8px;
            margin: 20px 0;
            font-style: italic;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin: 30px 0;
            padding: 20px;
            background-color: #f9fafb;
            border-radius: 8px;
          }
          
          .info-item {
            display: flex;
            flex-direction: column;
          }
          
          .info-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          
          .info-value {
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
          }
          
          .section {
            margin: 30px 0;
            page-break-inside: avoid;
          }
          
          .section-title {
            font-size: 20px;
            font-weight: 700;
            color: #1e40af;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid #dbeafe;
          }
          
          .question-card {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
            background-color: #ffffff;
            page-break-inside: avoid;
          }
          
          .question-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
          }
          
          .question-number {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background-color: #dbeafe;
            color: #1e40af;
            border-radius: 50%;
            font-weight: 700;
            font-size: 14px;
            flex-shrink: 0;
          }
          
          .question-content {
            flex: 1;
            margin-left: 16px;
          }
          
          .question-id {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 4px;
          }
          
          .question-text {
            font-size: 15px;
            font-weight: 500;
            color: #1f2937;
            margin-bottom: 8px;
          }
          
          .question-marks {
            background-color: #dbeafe;
            color: #1e40af;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 600;
            white-space: nowrap;
          }
          
          .question-meta {
            display: flex;
            gap: 16px;
            margin-top: 8px;
            font-size: 13px;
            color: #6b7280;
          }
          
          .difficulty-badge {
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 600;
            text-transform: capitalize;
          }
          
          .difficulty-easy {
            background-color: #d1fae5;
            color: #065f46;
          }
          
          .difficulty-medium {
            background-color: #fef3c7;
            color: #92400e;
          }
          
          .difficulty-hard {
            background-color: #fee2e2;
            color: #991b1b;
          }
          
          .student-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          
          .student-card {
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 12px;
            background-color: #f9fafb;
          }
          
          .student-name {
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 2px;
          }
          
          .student-email {
            font-size: 13px;
            color: #6b7280;
          }
          
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            font-size: 12px;
            color: #9ca3af;
          }
          
          .no-data {
            text-align: center;
            color: #9ca3af;
            padding: 20px;
            font-style: italic;
          }
          
          @media print {
            body {
              padding: 20px;
            }
            
            .question-card, .section {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${test.title}</h1>
          <p>${test.subject?.name || 'N/A'}</p>
          <span class="status-badge ${test.isPublished ? 'status-published' : 'status-draft'}">
            ${test.isPublished ? 'Published' : 'Draft'}
          </span>
        </div>

        ${test.description ? `
          <div class="description">
            ${test.description}
          </div>
        ` : ''}

        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Duration</span>
            <span class="info-value">${test.duration} minutes</span>
          </div>
          <div class="info-item">
            <span class="info-label">Total Questions</span>
            <span class="info-value">${test.questions.length}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Total Marks</span>
            <span class="info-value">${test.totalMarks}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Assigned Students</span>
            <span class="info-value">${test.assignedTo.length}</span>
          </div>
          ${test.scheduledDate ? `
            <div class="info-item">
              <span class="info-label">Scheduled Date</span>
              <span class="info-value">${formatDate(test.scheduledDate)}</span>
            </div>
          ` : ''}
          ${test.deadline ? `
            <div class="info-item">
              <span class="info-label">Deadline</span>
              <span class="info-value">${formatDate(test.deadline)}</span>
            </div>
          ` : ''}
        </div>

        <div class="section">
          <h2 class="section-title">Questions (${test.questions.length})</h2>
          ${test.questions
            .sort((a, b) => a.order - b.order)
            .map((item, index) => {
              const hasAttachments = item.question.attachments && item.question.attachments.length > 0;
              const hasCustomPositioning = hasAttachments && item.question.questionText.includes('{{attachment:');
              
              // Render attachments before question if position is 'before'
              const beforeAttachments = hasAttachments && item.question.attachmentPosition === 'before' 
                ? renderAttachmentsSection(item.question.attachments!) 
                : '';
              
              // Render question text with inline attachments if custom positioning
              const questionTextHtml = hasCustomPositioning
                ? renderQuestionTextWithAttachments(item.question.questionText, item.question.attachments!)
                : item.question.questionText;
              
              // Render attachments after question if position is 'after' or undefined
              const afterAttachments = hasAttachments && (!item.question.attachmentPosition || item.question.attachmentPosition === 'after')
                ? renderAttachmentsSection(item.question.attachments!)
                : '';
              
              return `
                <div class="question-card">
                  <div class="question-header">
                    <div style="display: flex; align-items: flex-start; flex: 1;">
                      <div class="question-number">${index + 1}</div>
                      <div class="question-content">
                        <div class="question-id">Q${index + 1}</div>
                        ${beforeAttachments}
                        <div class="question-text">${questionTextHtml}</div>
                        ${afterAttachments}
                        <div class="question-meta">
                          <span>Chapter: ${item.question.chapter}</span>
                          ${item.question.topic ? `<span>Topic: ${item.question.topic}</span>` : ''}
                          <span class="difficulty-badge difficulty-${item.question.difficultyLevel}">
                            ${item.question.difficultyLevel}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div class="question-marks">${item.marks} marks</div>
                  </div>
                </div>
              `;
            }).join('')}
        </div>

        <div class="section">
          <h2 class="section-title">Assigned Students (${test.assignedTo.length})</h2>
          ${test.assignedTo.length === 0 ? `
            <div class="no-data">No students assigned to this test</div>
          ` : `
            <div class="student-grid">
              ${test.assignedTo.map(student => `
                <div class="student-card">
                  <div class="student-name">${student.name}</div>
                  <div class="student-email">${student.email}</div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <div class="footer">
          <p>Created by ${test.createdBy.name} on ${formatDate(test.createdAt)}</p>
          <p style="margin-top: 8px;">Generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content to load, then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        // Close the window after printing (user can cancel this)
        printWindow.onafterprint = () => {
          printWindow.close();
        };
      }, 250);
    };
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
                        </div>
                        <span className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium shrink-0">
                          {item.marks} marks
                        </span>
                      </div>

                      <div>
                        {/* Multiple Choice Questions */}
                        {item.question.questionType === 'multiple-choice' && item.question.options && item.question.options.length > 0 ? (
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Select your answer:
                            </label>
                            {item.question.options.map((option, optIndex) => (
                              <label
                                key={optIndex}
                                className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition"
                              >
                                <input
                                  type="radio"
                                  name={`question-${item.question._id}`}
                                  value={option}
                                  checked={answer?.answer === option}
                                  onChange={(e) => handleAnswerChange(item.question._id, e.target.value)}
                                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-3 text-gray-700">{option}</span>
                              </label>
                            ))}
                          </div>
                        ) : item.question.questionType === 'true-false' ? (
                          /* True/False Questions */
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Select your answer:
                            </label>
                            {['True', 'False'].map((option) => (
                              <label
                                key={option}
                                className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition"
                              >
                                <input
                                  type="radio"
                                  name={`question-${item.question._id}`}
                                  value={option}
                                  checked={answer?.answer === option}
                                  onChange={(e) => handleAnswerChange(item.question._id, e.target.value)}
                                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-3 text-gray-700">{option}</span>
                              </label>
                            ))}
                          </div>
                        ) : item.question.questionType === 'short-answer' ? (
                          /* Short Answer Questions */
                          <>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Your Answer:
                            </label>
                            <Textarea
                              value={answer?.answer || ''}
                              onChange={(e) => handleAnswerChange(item.question._id, e.target.value)}
                              placeholder="Type your answer here..."
                              className="min-h-24"
                              rows={3}
                            />
                          </>
                        ) : (
                          /* Long Answer Questions or Default */
                          <>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Your Answer:
                            </label>
                            <Textarea
                              value={answer?.answer || ''}
                              onChange={(e) => handleAnswerChange(item.question._id, e.target.value)}
                              placeholder="Type your answer here..."
                              className="min-h-32"
                            />
                          </>
                        )}
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
            onClick={handleDownloadPDF}
            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          
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
                          Q{index + 1}
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
