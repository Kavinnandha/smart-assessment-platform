import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar, Clock, Users, FileText, ArrowLeft, Eye, EyeOff, Edit, PlayCircle, Send, AlertCircle, CheckCircle, Download, File, ChevronDown } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
    answerLines?: number;
    tags?: string[];
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

  // Export option: Questions Only
  const handleExportQuestionsOnly = () => {
    if (!test) return;
    generatePDF('questions-only');
  };

  // Export option: Questions with Answers Next to Each Question
  const handleExportQuestionsWithAnswers = () => {
    if (!test) return;
    generatePDF('questions-with-answers');
  };

  // Export option: Questions with Answers at the End
  const handleExportQuestionsAnswersAtEnd = () => {
    if (!test) return;
    generatePDF('questions-answers-end');
  };

  // Export option: Questions with Space for Answers
  const handleExportQuestionsWithSpace = () => {
    if (!test) return;
    generatePDF('questions-with-space');
  };

  // Export option: Download Only Answers
  const handleExportAnswersOnly = () => {
    if (!test) return;
    generatePDF('answers-only');
  };

  const generatePDF = async (exportType: 'questions-only' | 'questions-with-answers' | 'questions-answers-end' | 'questions-with-space' | 'answers-only') => {
    if (!test) return;

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // Helper function to decode HTML entities and strip HTML tags
      const decodeHTML = (html: string): string => {
        if (!html || typeof html !== 'string') return '';

        // Create a temporary div element for decoding
        const tempDiv = document.createElement('div');

        // First pass: decode HTML entities
        tempDiv.innerHTML = html;
        let decoded = tempDiv.textContent || tempDiv.innerText || '';

        // Clean up the div
        tempDiv.remove();

        // Additional cleanup for common encoding issues
        decoded = decoded
          // Remove attachment placeholders first
          .replace(/\{\{attachment:\d+\}\}/g, '')
          // Fix double-encoded ampersands
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&apos;/g, "'")
          .replace(/&nbsp;/g, ' ')
          // Fix any remaining HTML entities
          .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
          .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
          // Remove any stray HTML tags that might remain
          .replace(/<[^>]*>/g, '')
          // Replace multiple spaces with single space (but preserve single line breaks)
          .replace(/ +/g, ' ')
          // Clean up line breaks
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n')
          // Remove empty lines created by placeholder removal
          .replace(/\n\s*\n/g, '\n')
          .trim();

        return decoded;
      };

      // Helper function to check if we need a new page
      const checkPageBreak = (requiredHeight: number) => {
        if (yPosition + requiredHeight > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // Helper function to convert image URL to data URL
      const getImageDataUrl = async (url: string): Promise<string | null> => {
        try {
          const fullUrl = url.startsWith('http') ? url : `${FILE_BASE_URL}${url}`;
          const response = await fetch(fullUrl);
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.error('Failed to load image:', error);
          return null;
        }
      };

      // Helper function to add image to PDF
      const addImageToPDF = async (imageUrl: string, maxWidth: number = contentWidth - 40) => {
        const dataUrl = await getImageDataUrl(imageUrl);
        if (dataUrl) {
          try {
            // Create temporary image to get dimensions
            const img = new Image();
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = dataUrl;
            });

            // Calculate dimensions to fit within page
            let imgWidth = img.width * 0.264583; // Convert px to mm
            let imgHeight = img.height * 0.264583;

            // Scale down if too wide
            if (imgWidth > maxWidth) {
              const ratio = maxWidth / imgWidth;
              imgWidth = maxWidth;
              imgHeight = imgHeight * ratio;
            }

            // Scale down if too tall
            const maxHeight = pageHeight - margin - yPosition - 20;
            if (imgHeight > maxHeight) {
              const ratio = maxHeight / imgHeight;
              imgHeight = maxHeight;
              imgWidth = imgWidth * ratio;
            }

            checkPageBreak(imgHeight + 10);

            doc.addImage(dataUrl, 'JPEG', margin + 20, yPosition, imgWidth, imgHeight);
            yPosition += imgHeight + 5;
            return true;
          } catch (error) {
            console.error('Failed to add image to PDF:', error);
            return false;
          }
        }
        return false;
      };

      // Helper function to add attachments to PDF
      const addAttachmentsToPDF = async (attachments: Array<{
        fileName: string;
        fileUrl: string;
        fileType: string;
        fileSize: number;
      }>) => {
        if (!attachments || attachments.length === 0) return;

        // No label text - just add attachments directly
        for (const attachment of attachments) {
          if (attachment.fileType.startsWith('image/')) {
            // Embed image without filename
            await addImageToPDF(attachment.fileUrl);
          } else {
            // Non-image file - add as link without label
            checkPageBreak(8);
            doc.setFontSize(9);
            doc.setTextColor(37, 99, 235);
            doc.textWithLink(`${attachment.fileName}`, margin + 22, yPosition, {
              url: `${FILE_BASE_URL}${attachment.fileUrl}`
            });
            yPosition += 6;
          }
        }
        yPosition += 3;
      };

      // Helper function to add wrapped text with HTML entity decoding
      const addWrappedText = (text: string, x: number, fontSize: number, maxWidth: number, fontStyle: string = 'normal') => {
        // Pre-process to remove attachment placeholders before any other processing
        const preprocessedText = text.replace(/\{\{attachment:\d+\}\}/g, '');

        // Decode HTML entities and strip tags before rendering
        const decodedText = decodeHTML(preprocessedText);

        // Additional safety check to remove any problematic characters
        const cleanText = decodedText
          .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
          .replace(/[^\x00-\x7F]/g, (char) => {
            // Replace non-ASCII characters with ASCII equivalents where possible
            const charCode = char.charCodeAt(0);
            if (charCode > 127) {
              // Common replacements for special characters
              const replacements: Record<string, string> = {
                '\u2713': 'v', // ✓
                '\u2717': 'x', // ✗
                '\u{1F4CE}': '', // 📎
                '\u{1F517}': '', // 🔗
                '\u201C': '"', // "
                '\u201D': '"', // "
                '\u2018': "'", // '
                '\u2019': "'", // '
                '\u2013': '-', // –
                '\u2014': '-', // —
                '\u2026': '...' // …
              };
              return replacements[char] || '';
            }
            return char;
          });

        doc.setFontSize(fontSize);
        doc.setFont('helvetica', fontStyle);
        const lines = doc.splitTextToSize(cleanText, maxWidth);

        for (let i = 0; i < lines.length; i++) {
          checkPageBreak(7);
          doc.text(lines[i], x, yPosition);
          yPosition += 7;
        }
        return lines.length;
      };

      // Only render header for non-answers-only exports
      if (exportType !== 'answers-only') {
        // Header
        doc.setFillColor(37, 99, 235); // Blue
        doc.rect(0, 0, pageWidth, 30, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(test.title, pageWidth / 2, 15, { align: 'center' });

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(test.subject?.name || 'N/A', pageWidth / 2, 23, { align: 'center' });

        yPosition = 40;

        // Test Info
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');

        const infoItems = [
          `Duration: ${test.duration} minutes`,
          `Questions: ${test.questions.length}`,
          `Total Marks: ${test.totalMarks}`,
          `Status: ${test.isPublished ? 'Published' : 'Draft'}`
        ];

        const infoWidth = contentWidth / 4;
        infoItems.forEach((item, index) => {
          doc.text(item, margin + (index * infoWidth), yPosition);
        });

        yPosition += 10;

        // Line separator
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 10;
      } else {
        // For answers-only, simpler header
        doc.setFillColor(16, 185, 129); // Green
        doc.rect(0, 0, pageWidth, 25, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(`${test.title} - Answer Key`, pageWidth / 2, 15, { align: 'center' });

        yPosition = 35;
      }

      const sortedQuestions = [...test.questions].sort((a, b) => a.order - b.order);

      // Render based on export type
      if (exportType === 'answers-only') {
        // Render only answers
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Answer Key', margin, yPosition);
        yPosition += 10;

        for (let index = 0; index < sortedQuestions.length; index++) {
          const item = sortedQuestions[index];
          checkPageBreak(20);

          // Question number circle
          doc.setFillColor(220, 252, 231); // Light green
          doc.circle(margin + 5, yPosition, 5, 'F');
          doc.setTextColor(6, 95, 70); // Dark green
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(`${index + 1}`, margin + 5, yPosition + 1.5, { align: 'center' });

          yPosition += 8;

          // Answer box
          checkPageBreak(15);
          const answerBoxHeight = Math.max(15, Math.ceil((item.question.correctAnswer?.length || 20) / 50) * 5);
          doc.setFillColor(209, 250, 229); // Light green
          doc.roundedRect(margin + 10, yPosition, contentWidth - 10, answerBoxHeight, 3, 3, 'F');
          doc.setDrawColor(16, 185, 129); // Green border
          doc.setLineWidth(0.5);
          doc.roundedRect(margin + 10, yPosition, contentWidth - 10, answerBoxHeight, 3, 3, 'S');

          yPosition += 5;

          doc.setTextColor(6, 78, 59);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          const answer = item.question.correctAnswer || 'Not provided';
          addWrappedText(answer, margin + 12, 10, contentWidth - 14, 'normal');

          yPosition += 5;

          // Add answer attachments if they exist
          if (item.question.correctAnswerAttachments && item.question.correctAnswerAttachments.length > 0) {
            await addAttachmentsToPDF(item.question.correctAnswerAttachments);
          }

          yPosition += 5;
        }
      } else if (exportType === 'questions-only') {
        // Questions section title
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`Questions (${test.questions.length})`, margin, yPosition);
        yPosition += 10;

        // Render each question
        for (let index = 0; index < sortedQuestions.length; index++) {
          const item = sortedQuestions[index];
          checkPageBreak(25);

          // Question card background
          doc.setFillColor(249, 250, 251);
          doc.setDrawColor(229, 231, 235);
          doc.setLineWidth(0.5);

          // Question number circle
          doc.setFillColor(219, 234, 254);
          doc.circle(margin + 8, yPosition + 3, 5, 'F');
          doc.setTextColor(30, 64, 175);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(`${index + 1}`, margin + 8, yPosition + 4.5, { align: 'center' });

          // Marks badge
          doc.setFillColor(219, 234, 254);
          doc.roundedRect(pageWidth - margin - 30, yPosition - 2, 28, 8, 2, 2, 'F');
          doc.setTextColor(30, 64, 175);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text(`${item.marks} marks`, pageWidth - margin - 16, yPosition + 3.5, { align: 'center' });

          // Question text
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(11);
          doc.setFont('helvetica', 'normal');
          yPosition += 5;
          addWrappedText(item.question.questionText, margin + 20, 11, contentWidth - 50, 'normal');

          // Add question attachments if they exist
          if (item.question.attachments && item.question.attachments.length > 0) {
            await addAttachmentsToPDF(item.question.attachments);
          }

          yPosition += 8;
        }
      } else if (exportType === 'questions-with-answers') {
        // Questions with inline answers
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Questions (${test.questions.length})`, margin, yPosition);
        yPosition += 10;

        for (let index = 0; index < sortedQuestions.length; index++) {
          const item = sortedQuestions[index];
          checkPageBreak(30);

          // Question section (background will auto-expand with content)
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(11);

          doc.setFillColor(219, 234, 254);
          doc.circle(margin + 8, yPosition + 3, 5, 'F');
          doc.setTextColor(30, 64, 175);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(`${index + 1}`, margin + 8, yPosition + 4.5, { align: 'center' });

          doc.setFillColor(219, 234, 254);
          doc.roundedRect(pageWidth - margin - 30, yPosition - 2, 28, 8, 2, 2, 'F');
          doc.setTextColor(30, 64, 175);
          doc.text(`${item.marks} marks`, pageWidth - margin - 16, yPosition + 3.5, { align: 'center' });

          doc.setTextColor(0, 0, 0);
          doc.setFontSize(11);
          yPosition += 5;
          addWrappedText(item.question.questionText, margin + 20, 11, contentWidth - 50, 'normal');

          // Add question attachments if they exist
          if (item.question.attachments && item.question.attachments.length > 0) {
            await addAttachmentsToPDF(item.question.attachments);
          }

          yPosition += 3;

          // Answer box (inline) - adding some padding for the answer
          checkPageBreak(15);

          yPosition += 5;

          doc.setTextColor(6, 78, 59);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          const answer = item.question.correctAnswer || 'Not provided';
          addWrappedText(answer, margin + 22, 10, contentWidth - 29, 'normal');

          // Add answer attachments if they exist
          if (item.question.correctAnswerAttachments && item.question.correctAnswerAttachments.length > 0) {
            await addAttachmentsToPDF(item.question.correctAnswerAttachments);
          }

          yPosition += 8;
        }
      } else if (exportType === 'questions-with-space') {
        // Questions with answer space
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Questions (${test.questions.length})`, margin, yPosition);
        yPosition += 10;

        for (let index = 0; index < sortedQuestions.length; index++) {
          const item = sortedQuestions[index];
          checkPageBreak(40);

          // Question section (no background box for simplicity)
          doc.setFillColor(219, 234, 254);
          doc.circle(margin + 8, yPosition + 3, 5, 'F');
          doc.setTextColor(30, 64, 175);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(`${index + 1}`, margin + 8, yPosition + 4.5, { align: 'center' });

          doc.setFillColor(219, 234, 254);
          doc.roundedRect(pageWidth - margin - 30, yPosition - 2, 28, 8, 2, 2, 'F');
          doc.setTextColor(30, 64, 175);
          doc.text(`${item.marks} marks`, pageWidth - margin - 16, yPosition + 3.5, { align: 'center' });

          doc.setTextColor(0, 0, 0);
          doc.setFontSize(11);
          yPosition += 5;
          addWrappedText(item.question.questionText, margin + 20, 11, contentWidth - 50, 'normal');

          // Add question attachments if they exist
          if (item.question.attachments && item.question.attachments.length > 0) {
            await addAttachmentsToPDF(item.question.attachments);
          }

          yPosition += 3;

          // Answer space (box for writing) - use dynamic height based on answerLines
          const answerLines = item.question.answerLines || 3;
          const lineHeight = 6;
          const answerBoxHeight = answerLines * lineHeight + 4; // +4 for padding

          checkPageBreak(answerBoxHeight + 5);
          doc.setDrawColor(209, 213, 219);
          doc.setLineWidth(0.3);
          // Dashed border effect using multiple short lines
          doc.rect(margin + 20, yPosition, contentWidth - 25, answerBoxHeight, 'S');

          // Draw horizontal lines for each answer line
          doc.setDrawColor(229, 231, 235);
          doc.setLineWidth(0.1);
          for (let line = 1; line < answerLines; line++) {
            const lineY = yPosition + (line * lineHeight) + 2;
            doc.line(margin + 22, lineY, margin + contentWidth - 7, lineY);
          }

          doc.setFontSize(8);
          doc.setTextColor(156, 163, 175);
          doc.text(`Space for answer (${answerLines} lines)`, margin + (contentWidth / 2), yPosition + (answerBoxHeight / 2) + 1, { align: 'center' });

          yPosition += answerBoxHeight + 5;
        }
      } else if (exportType === 'questions-answers-end') {
        // Questions section
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Questions (${test.questions.length})`, margin, yPosition);
        yPosition += 10;

        for (let index = 0; index < sortedQuestions.length; index++) {
          const item = sortedQuestions[index];
          checkPageBreak(25);

          // No background box for simplicity
          doc.setFillColor(219, 234, 254);
          doc.circle(margin + 8, yPosition + 3, 5, 'F');
          doc.setTextColor(30, 64, 175);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(`${index + 1}`, margin + 8, yPosition + 4.5, { align: 'center' });

          doc.setFillColor(219, 234, 254);
          doc.roundedRect(pageWidth - margin - 30, yPosition - 2, 28, 8, 2, 2, 'F');
          doc.setTextColor(30, 64, 175);
          doc.text(`${item.marks} marks`, pageWidth - margin - 16, yPosition + 3.5, { align: 'center' });

          doc.setTextColor(0, 0, 0);
          doc.setFontSize(11);
          yPosition += 5;
          addWrappedText(item.question.questionText, margin + 20, 11, contentWidth - 50, 'normal');

          // Add question attachments if they exist
          if (item.question.attachments && item.question.attachments.length > 0) {
            await addAttachmentsToPDF(item.question.attachments);
          }

          yPosition += 8;
        }

        // New page for answers
        doc.addPage();
        yPosition = margin;

        doc.setFillColor(16, 185, 129);
        doc.rect(0, 0, pageWidth, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Answer Key', pageWidth / 2, 15, { align: 'center' });

        yPosition = 35;

        for (let index = 0; index < sortedQuestions.length; index++) {
          const item = sortedQuestions[index];
          checkPageBreak(20);

          // No background box for simplicity  
          doc.setFillColor(220, 252, 231);
          doc.circle(margin + 8, yPosition + 3, 5, 'F');
          doc.setTextColor(6, 95, 70);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(`${index + 1}`, margin + 8, yPosition + 4.5, { align: 'center' });

          yPosition += 10;

          checkPageBreak(15);

          doc.setTextColor(6, 78, 59);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          const answer = item.question.correctAnswer || 'Not provided';
          addWrappedText(answer, margin + 17, 10, contentWidth - 19, 'normal');

          // Add answer attachments if they exist
          if (item.question.correctAnswerAttachments && item.question.correctAnswerAttachments.length > 0) {
            await addAttachmentsToPDF(item.question.correctAnswerAttachments);
          }

          yPosition += 8;
        }
      }

      // Footer
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text(`Generated on ${currentDate}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
      }

      // Generate filename based on export type
      const exportTypeNames = {
        'questions-only': 'Questions_Only',
        'questions-with-answers': 'Questions_with_Answers_Inline',
        'questions-answers-end': 'Questions_with_Answers_End',
        'questions-with-space': 'Questions_with_Answer_Space',
        'answers-only': 'Answer_Key'
      };

      const fileName = `${test.title.replace(/[^a-z0-9]/gi, '_')}_${exportTypeNames[exportType]}.pdf`;

      // Save the PDF
      doc.save(fileName);

    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
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
      return <p className="text-lg font-medium mb-2">{questionText}</p>;
    }

    // Check if question text contains attachment placeholders
    const placeholderRegex = /\{\{attachment:(\d+)\}\}/g;
    const hasPlaceholders = placeholderRegex.test(questionText);

    if (!hasPlaceholders) {
      // No placeholders found, display attachments at the end (backward compatibility)
      return (
        <>
          <p className="text-lg font-medium mb-2">{questionText}</p>
          <div className="mt-4 space-y-2">
            {attachments.map((attachment, idx) => renderAttachment(attachment, idx))}
          </div>
        </>
      );
    }

    // Split text by placeholders and render inline
    const parts: (string | React.ReactNode)[] = [];
    let lastIndex = 0;

    // First, collect all placeholders and their positions
    const placeholderMatches = Array.from(questionText.matchAll(/\{\{attachment:(\d+)\}\}/g));

    for (const match of placeholderMatches) {
      const matchIndex = match.index!;
      const attachmentIndex = parseInt(match[1]);

      // Add text before placeholder
      if (matchIndex > lastIndex) {
        parts.push(questionText.substring(lastIndex, matchIndex));
      }

      // Add attachment (without placeholder text)
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
      <div className="text-lg font-medium mb-2">
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
          <img
            src={`${FILE_BASE_URL}${attachment.fileUrl}`}
            alt="Question attachment"
            className="max-w-2xl rounded-lg border shadow-sm"
          />
        ) : (
          <div className="flex items-center gap-2 p-3 bg-muted/30 border rounded-lg max-w-md">
            <File className="w-5 h-5 text-muted-foreground shrink-0" />
            <a
              href={`${FILE_BASE_URL}${attachment.fileUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline truncate flex-1"
            >
              {attachment.fileName}
            </a>
            <Download className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-card p-6 rounded-lg shadow text-center">
          <p className="text-muted-foreground">Loading test details...</p>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-card p-6 rounded-lg shadow text-center">
          <p className="text-red-600 dark:text-red-400">Test not found</p>
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
          <div className="bg-card p-8 rounded-lg shadow">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
                <CheckCircle className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Test Already Submitted</h1>
              <p className="text-lg text-muted-foreground mb-6">
                You have already submitted this test. Only one attempt is allowed.
              </p>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg mb-6">
                <h2 className="text-xl font-semibold mb-2">{test?.title}</h2>
                <p className="text-muted-foreground">{test?.subject?.name || 'N/A'}</p>
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
          <div className="bg-card p-8 rounded-lg shadow">
            <h1 className="text-3xl font-bold mb-4">{test.title}</h1>
            <p className="text-lg text-muted-foreground mb-6">{test.subject?.name || 'N/A'}</p>

            {test.description && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
                <p className="text-blue-900 dark:text-blue-300">{test.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-semibold">{test.duration} minutes</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm text-muted-foreground">Questions</p>
                  <p className="font-semibold">{test.questions.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Marks</p>
                  <p className="font-semibold">{test.totalMarks}</p>
                </div>
              </div>
              {test.deadline && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="text-sm text-muted-foreground">Deadline</p>
                    <p className="font-medium text-sm">{formatDate(test.deadline)}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg mb-6">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2">Important Instructions:</h3>
                  <ul className="list-disc list-inside space-y-1 text-yellow-800 dark:text-yellow-400 text-sm">
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
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          onClick={() => navigate('/tests')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tests
        </Button>

        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Test
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuItem onClick={handleExportQuestionsOnly}>
                <FileText className="h-4 w-4 mr-2" />
                Questions Only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportQuestionsWithAnswers}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Questions with Answers (inline)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportQuestionsAnswersAtEnd}>
                <File className="h-4 w-4 mr-2" />
                Questions with Answers (at end)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportQuestionsWithSpace}>
                <Edit className="h-4 w-4 mr-2" />
                Questions with Space for Answers
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportAnswersOnly}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Download Only Answers
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            onClick={() => navigate(`/tests/edit/${test._id}`)}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Test
          </Button>

          {test.isPublished ? (
            <Button
              variant="outline"
              onClick={handleUnpublish}
              className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20"
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN - Test Info (Span 4) */}
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl mb-1">{test.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{test.subject?.name || 'N/A'}</p>
                </div>
                {test.isPublished ? (
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 rounded-full text-xs font-medium">
                    Published
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 rounded-full text-xs font-medium">
                    Draft
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {test.description && (
                <div className="p-3 bg-muted/30 rounded-md text-sm">
                  {test.description}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="font-semibold text-sm">{test.duration} min</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">Questions</p>
                    <p className="font-semibold text-sm">{test.questions.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Marks</p>
                    <p className="font-semibold text-sm">{test.totalMarks}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned</p>
                    <p className="font-semibold text-sm">{test.assignedTo.length}</p>
                  </div>
                </div>
              </div>

              {(test.scheduledDate || test.deadline) && (
                <div className="pt-4 border-t space-y-3">
                  {test.scheduledDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <div>
                        <p className="text-xs text-muted-foreground">Scheduled Date</p>
                        <p className="font-medium text-sm">{formatDate(test.scheduledDate)}</p>
                      </div>
                    </div>
                  )}
                  {test.deadline && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <div>
                        <p className="text-xs text-muted-foreground">Deadline</p>
                        <p className="font-medium text-sm">{formatDate(test.deadline)}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 border-t text-xs text-muted-foreground">
                Created by <span className="font-medium">{test.createdBy.name}</span> on{' '}
                {formatDate(test.createdAt)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assigned Students</CardTitle>
            </CardHeader>
            <CardContent>
              {test.assignedTo.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-2">
                  No students assigned
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {test.assignedTo.map((student) => (
                    <div
                      key={student._id}
                      className="flex items-center gap-3 p-2 border rounded-md hover:bg-muted/30 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-semibold text-xs shrink-0">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {student.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN - Questions List (Span 8) */}
        <div className="lg:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Questions ({test.questions.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {test.questions
                .sort((a, b) => a.order - b.order)
                .map((item, index) => (
                  <div key={item._id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="shrink-0">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-semibold text-sm">
                          {index + 1}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2 gap-4">
                          <div className="flex-1">
                            <div className="mt-1 text-sm">
                              {renderQuestionWithAttachments(item.question.questionText, item.question.attachments)}
                            </div>
                            {item.question.questionImage && (
                              <img
                                src={item.question.questionImage}
                                alt="Question"
                                className="max-w-md rounded-lg border mt-2"
                              />
                            )}
                          </div>
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded text-xs font-medium shrink-0 whitespace-nowrap">
                            {item.marks} marks
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-3 pt-3 border-t border-dashed">
                          <span className="flex items-center gap-1">
                            <span className="font-medium">Chapter:</span> {item.question.chapter}
                          </span>
                          {item.question.topic && (
                            <span className="flex items-center gap-1">
                              <span className="font-medium">Topic:</span> {item.question.topic}
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-full ${item.question.difficultyLevel === 'easy'
                                ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                                : item.question.difficultyLevel === 'medium'
                                  ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400'
                                  : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400'
                              }`}
                          >
                            {item.question.difficultyLevel}
                          </span>
                          <span className="ml-auto font-medium capitalize text-blue-600 dark:text-blue-400">
                            {item.question.questionType?.replace('-', ' ') || 'Short Answer'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TakeTestPage;
