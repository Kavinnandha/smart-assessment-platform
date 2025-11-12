import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Search, Trash2, BookOpen, Eye, File } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Chapter {
  name: string;
  topics: string[];
}

interface Subject {
  _id: string;
  name: string;
  chapters: Chapter[];
}

const SubjectQuestionsPage = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ chapter: '', topic: '', difficulty: '' });
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);

  // Get API base URL for file attachments
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const FILE_BASE_URL = API_BASE_URL.replace('/api', '');

  useEffect(() => {
    fetchSubjectAndQuestions();
  }, [subjectId, filter]);

  const fetchSubjectAndQuestions = async () => {
    try {
      setLoading(true);
      
      // Fetch subject details
      if (subjectId && subjectId !== 'uncategorized') {
        const subjectResponse = await api.get(`/subjects/${subjectId}`);
        setSubject(subjectResponse.data);
      } else {
        setSubject({ name: 'Uncategorized', _id: 'uncategorized', chapters: [] });
      }

      // Fetch questions for this subject
      const params: any = { ...filter, search };
      if (subjectId !== 'uncategorized') {
        params.subject = subjectId;
      }
      
      const questionsResponse = await api.get('/questions', { params });
      
      // Filter questions by subject
      const filteredQuestions = questionsResponse.data.questions.filter((q: any) => {
        if (subjectId === 'uncategorized') {
          return !q.subject || !q.subject._id;
        }
        return q.subject?._id === subjectId;
      });
      
      setQuestions(filteredQuestions);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchSubjectAndQuestions();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this question?')) {
      return;
    }

    try {
      await api.delete(`/questions/${id}`);
      alert('Question deleted successfully');
      fetchSubjectAndQuestions();
    } catch (error) {
      console.error('Failed to delete question:', error);
      alert('Failed to delete question');
    }
  };

  const handleViewDetails = async (questionId: string) => {
    try {
      const response = await api.get(`/questions/${questionId}`);
      setSelectedQuestion(response.data.question);
      setViewDetailsOpen(true);
    } catch (error) {
      console.error('Failed to fetch question details:', error);
      alert('Failed to load question details');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Helper function to render question text with inline attachments
  const renderQuestionWithAttachments = (questionText: string, attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }>, attachmentPosition?: string) => {
    if (!attachments || attachments.length === 0) {
      return <p className="text-base whitespace-pre-wrap">{questionText}</p>;
    }

    // If position is 'before', show attachments before the text
    if (attachmentPosition === 'before') {
      return (
        <>
          <div className="mb-4 space-y-2">
            {attachments.map((attachment, idx) => renderAttachment(attachment, idx, 'blue'))}
          </div>
          <p className="text-base whitespace-pre-wrap">{questionText}</p>
        </>
      );
    }

    // If position is 'after' or undefined, show attachments after the text
    if (attachmentPosition === 'after' || !attachmentPosition) {
      return (
        <>
          <p className="text-base whitespace-pre-wrap">{questionText}</p>
          <div className="mt-4 space-y-2">
            {attachments.map((attachment, idx) => renderAttachment(attachment, idx, 'blue'))}
          </div>
        </>
      );
    }

    // If position is 'custom', check for placeholders and render inline
    const placeholderRegex = /\{\{attachment:(\d+)\}\}/g;
    const hasPlaceholders = placeholderRegex.test(questionText);

    if (!hasPlaceholders) {
      // No placeholders found, display attachments at the end (backward compatibility)
      return (
        <>
          <p className="text-base whitespace-pre-wrap">{questionText}</p>
          <div className="mt-4 space-y-2">
            {attachments.map((attachment, idx) => renderAttachment(attachment, idx, 'blue'))}
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
            {renderAttachment(attachments[attachmentIndex], attachmentIndex, 'blue')}
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
      <div className="text-base whitespace-pre-wrap">
        {parts.map((part, idx) => 
          typeof part === 'string' ? <span key={idx}>{part}</span> : part
        )}
      </div>
    );
  };

  // Helper function to render correct answer with inline attachments
  const renderAnswerWithAttachments = (answerText: string, attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }>, attachmentPosition?: string) => {
    if (!attachments || attachments.length === 0) {
      return <p className="text-base whitespace-pre-wrap text-green-900 dark:text-green-400">{answerText}</p>;
    }

    // If position is 'before', show attachments before the text
    if (attachmentPosition === 'before') {
      return (
        <>
          <div className="mb-4 space-y-2">
            {attachments.map((attachment, idx) => renderAttachment(attachment, idx, 'green'))}
          </div>
          <p className="text-base whitespace-pre-wrap text-green-900 dark:text-green-400">{answerText}</p>
        </>
      );
    }

    // If position is 'after' or undefined, show attachments after the text
    if (attachmentPosition === 'after' || !attachmentPosition) {
      return (
        <>
          <p className="text-base whitespace-pre-wrap text-green-900 dark:text-green-400">{answerText}</p>
          <div className="mt-4 space-y-2">
            {attachments.map((attachment, idx) => renderAttachment(attachment, idx, 'green'))}
          </div>
        </>
      );
    }

    // If position is 'custom', check for placeholders and render inline
    const placeholderRegex = /\{\{attachment:(\d+)\}\}/g;
    const hasPlaceholders = placeholderRegex.test(answerText);

    if (!hasPlaceholders) {
      // No placeholders found, display attachments at the end
      return (
        <>
          <p className="text-base whitespace-pre-wrap text-green-900 dark:text-green-400">{answerText}</p>
          <div className="mt-4 space-y-2">
            {attachments.map((attachment, idx) => renderAttachment(attachment, idx, 'green'))}
          </div>
        </>
      );
    }

    // Split text by placeholders and render inline
    const parts: (string | React.ReactNode)[] = [];
    let lastIndex = 0;
    const matches = answerText.matchAll(/\{\{attachment:(\d+)\}\}/g);

    for (const match of matches) {
      const matchIndex = match.index!;
      const attachmentIndex = parseInt(match[1]);

      // Add text before placeholder
      if (matchIndex > lastIndex) {
        parts.push(answerText.substring(lastIndex, matchIndex));
      }

      // Add attachment
      if (attachmentIndex < attachments.length) {
        parts.push(
          <div key={`answer-attachment-${attachmentIndex}`} className="my-3">
            {renderAttachment(attachments[attachmentIndex], attachmentIndex, 'green')}
          </div>
        );
      }

      lastIndex = matchIndex + match[0].length;
    }

    // Add remaining text
    if (lastIndex < answerText.length) {
      parts.push(answerText.substring(lastIndex));
    }

    return (
      <div className="text-base whitespace-pre-wrap text-green-900 dark:text-green-400">
        {parts.map((part, idx) => 
          typeof part === 'string' ? <span key={idx}>{part}</span> : part
        )}
      </div>
    );
  };

  // Helper function to render a single attachment
  const renderAttachment = (attachment: {
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }, idx: number, colorTheme: 'blue' | 'green') => {
    const fileUrl = `${FILE_BASE_URL}${attachment.fileUrl}`;
    const borderColor = colorTheme === 'blue' ? 'border-blue-300 dark:border-blue-700' : 'border-green-300 dark:border-green-700';
    const bgColor = colorTheme === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-green-50 dark:bg-green-900/20';
    const textColor = colorTheme === 'blue' ? 'text-blue-900 dark:text-blue-400' : 'text-green-900 dark:text-green-400';
    const hoverColor = colorTheme === 'blue' ? 'hover:text-blue-700 dark:hover:text-blue-300' : 'hover:text-green-700 dark:hover:text-green-300';

    return (
      <div key={idx} className={`border ${borderColor} rounded-lg overflow-hidden bg-card inline-block max-w-full`}>
        {attachment.fileType.startsWith('image/') ? (
          <div className="relative bg-muted/30">
            <img
              src={fileUrl}
              alt={attachment.fileName}
              className="max-w-full max-h-96 object-contain"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-40 bg-muted/30">
            <File className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        <div className={`p-2 border-t ${borderColor} ${bgColor}`}>
          <a 
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-xs font-medium ${textColor} ${hoverColor} truncate block`}
          >
            {attachment.fileName}
          </a>
          <p className={`text-xs ${textColor}`}>
            {formatFileSize(attachment.fileSize)}
          </p>
        </div>
      </div>
    );
  };

  // Group questions by chapter
  const questionsByChapter = questions.reduce((acc: any, question: any) => {
    const chapterName = question.chapter || 'No Chapter';
    
    if (!acc[chapterName]) {
      acc[chapterName] = [];
    }
    
    acc[chapterName].push(question);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/questions')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Subjects
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{subject?.name || 'Loading...'}</h1>
              <p className="text-muted-foreground mt-1">{questions.length} question{questions.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/questions/create/${subjectId}`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Question
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-card p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <Input
              placeholder="Search questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <select
            value={filter.difficulty}
            onChange={(e) => setFilter({ ...filter, difficulty: e.target.value })}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <select
            value={filter.chapter}
            onChange={(e) => setFilter({ ...filter, chapter: e.target.value })}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value="">All Chapters</option>
            {subject?.chapters?.map((chapter: Chapter, idx: number) => (
              <option key={idx} value={chapter.name}>
                {chapter.name}
              </option>
            ))}
          </select>
          <Button onClick={handleSearch}>
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-muted-foreground">Total Questions</p>
          <p className="text-2xl font-bold">{questions.length}</p>
        </div>
        <div className="bg-card p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-muted-foreground">Easy</p>
          <p className="text-2xl font-bold text-green-600">
            {questions.filter((q: any) => q.difficultyLevel === 'easy').length}
          </p>
        </div>
        <div className="bg-card p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-muted-foreground">Medium</p>
          <p className="text-2xl font-bold text-yellow-600">
            {questions.filter((q: any) => q.difficultyLevel === 'medium').length}
          </p>
        </div>
        <div className="bg-card p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-muted-foreground">Hard</p>
          <p className="text-2xl font-bold text-red-600">
            {questions.filter((q: any) => q.difficultyLevel === 'hard').length}
          </p>
        </div>
      </div>

      {/* Questions List - Grouped by Chapter */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-card p-8 rounded-lg shadow text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-muted-foreground">Loading questions...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="bg-card p-8 rounded-lg shadow text-center text-muted-foreground">
            No questions found for this subject
          </div>
        ) : (
          Object.entries(questionsByChapter).map(([chapter, chapterQuestions]: [string, any]) => (
            <div key={chapter} className="bg-card rounded-lg shadow-sm border">
              {/* Chapter Header */}
              <div className="p-4 bg-muted/30 border-b">
                <h3 className="font-semibold text-lg">{chapter}</h3>
                <p className="text-sm text-muted-foreground">
                  {chapterQuestions.length} question{chapterQuestions.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Questions Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Question No</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Topic</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Difficulty</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Marks</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {chapterQuestions.map((q: any) => (
                      <tr key={q._id} className="hover:bg-muted/20">
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{`Q${chapterQuestions.indexOf(q) + 1}`}</td>
                        <td className="px-6 py-4">{q.topic || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            q.difficultyLevel === 'easy' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' :
                            q.difficultyLevel === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400' :
                            'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400'
                          }`}>
                            {q.difficultyLevel}
                          </span>
                        </td>
                        <td className="px-6 py-4">{q.marks}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleViewDetails(q._id)}
                              className="gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                            <Link to={`/questions/edit/${q._id}/${subjectId}`}>
                              <Button size="sm" variant="outline">Edit</Button>
                            </Link>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleDelete(q._id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* View Details Dialog */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Question Details</DialogTitle>
            <DialogDescription>
              Complete information about this question including attachments and answer
            </DialogDescription>
          </DialogHeader>
          
          {selectedQuestion && (
            <div className="space-y-6 mt-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Chapter</p>
                  <p className="text-base font-semibold">{selectedQuestion.chapter}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Topic</p>
                  <p className="text-base font-semibold">{selectedQuestion.topic || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Difficulty</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    selectedQuestion.difficultyLevel === 'easy' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' :
                    selectedQuestion.difficultyLevel === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400' :
                    'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400'
                  }`}>
                    {selectedQuestion.difficultyLevel}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Marks</p>
                  <p className="text-base font-semibold">{selectedQuestion.marks}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Question Type</p>
                  <p className="text-base font-semibold capitalize">{selectedQuestion.questionType?.replace('-', ' ')}</p>
                </div>
              </div>

              {/* Question Text */}
              <div className="p-4 border rounded-lg">
                <p className="text-sm font-medium mb-2">Question</p>
                {renderQuestionWithAttachments(
                  selectedQuestion.questionText,
                  selectedQuestion.attachments,
                  selectedQuestion.attachmentPosition
                )}
              </div>

              {/* Question Attachments - Only show separately if not using custom positioning */}
              {selectedQuestion.attachments && 
               selectedQuestion.attachments.length > 0 && 
               selectedQuestion.attachmentPosition !== 'custom' &&
               selectedQuestion.attachmentPosition !== 'before' &&
               selectedQuestion.attachmentPosition !== 'after' && (
                <div className="p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-400">
                      Question Attachments ({selectedQuestion.attachments.length})
                    </p>
                    {selectedQuestion.attachmentPosition && (
                      <span className="text-xs px-2 py-1 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded">
                        Position: {selectedQuestion.attachmentPosition}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedQuestion.attachments.map((attachment: any, idx: number) => {
                      const fileUrl = `${FILE_BASE_URL}${attachment.fileUrl}`;
                      return (
                        <div key={idx} className="border border-blue-300 dark:border-blue-700 rounded-lg overflow-hidden bg-card">
                          {attachment.fileType.startsWith('image/') ? (
                            <div className="relative h-40 bg-muted/30 flex items-center justify-center">
                              <img
                                src={fileUrl}
                                alt={attachment.fileName}
                                className="max-w-full max-h-full object-contain"
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-40 bg-muted/30">
                              <File className="w-12 h-12 text-muted-foreground" />
                            </div>
                          )}
                          <div className="p-2 border-t border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                            <a 
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-blue-900 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 truncate block"
                            >
                              {attachment.fileName}
                            </a>
                            <p className="text-xs text-blue-700 dark:text-blue-500">
                              {formatFileSize(attachment.fileSize)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Options (for MCQ and True/False) */}
              {selectedQuestion.options && selectedQuestion.options.length > 0 && (
                <div className="p-4 border rounded-lg">
                  <p className="text-sm font-medium mb-3">Options</p>
                  <div className="space-y-2">
                    {selectedQuestion.options.map((option: string, idx: number) => (
                      <div 
                        key={idx} 
                        className={`p-3 rounded-lg ${
                          option === selectedQuestion.correctAnswer 
                            ? 'bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700' 
                            : 'bg-muted/30 border'
                        }`}
                      >
                        <span className="font-medium">{String.fromCharCode(65 + idx)}.</span> {option}
                        {option === selectedQuestion.correctAnswer && (
                          <span className="ml-2 text-xs font-semibold text-green-700 dark:text-green-400">✓ Correct</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Correct Answer */}
              <div className="p-4 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm font-medium text-green-900 dark:text-green-400 mb-2">Correct Answer</p>
                {renderAnswerWithAttachments(
                  selectedQuestion.correctAnswer,
                  selectedQuestion.correctAnswerAttachments,
                  selectedQuestion.correctAnswerAttachmentPosition
                )}
              </div>

              {/* Correct Answer Attachments - Only show separately if not using custom positioning */}
              {selectedQuestion.correctAnswerAttachments && 
               selectedQuestion.correctAnswerAttachments.length > 0 && 
               selectedQuestion.correctAnswerAttachmentPosition !== 'custom' &&
               selectedQuestion.correctAnswerAttachmentPosition !== 'before' &&
               selectedQuestion.correctAnswerAttachmentPosition !== 'after' && (
                <div className="p-4 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-green-900 dark:text-green-400">
                      Answer Attachments ({selectedQuestion.correctAnswerAttachments.length})
                    </p>
                    {selectedQuestion.correctAnswerAttachmentPosition && (
                      <span className="text-xs px-2 py-1 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded">
                        Position: {selectedQuestion.correctAnswerAttachmentPosition}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedQuestion.correctAnswerAttachments.map((attachment: any, idx: number) => {
                      const fileUrl = `${FILE_BASE_URL}${attachment.fileUrl}`;
                      return (
                        <div key={idx} className="border border-green-300 dark:border-green-700 rounded-lg overflow-hidden bg-card">
                          {attachment.fileType.startsWith('image/') ? (
                            <div className="relative h-40 bg-muted/30 flex items-center justify-center">
                              <img
                                src={fileUrl}
                                alt={attachment.fileName}
                                className="max-w-full max-h-full object-contain"
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-40 bg-muted/30">
                              <File className="w-12 h-12 text-muted-foreground" />
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
                              {formatFileSize(attachment.fileSize)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Footer Info */}
              <div className="pt-4 border-t text-sm text-muted-foreground">
                <p>Created by: {selectedQuestion.createdBy?.name || 'Unknown'}</p>
                <p>Created: {new Date(selectedQuestion.createdAt).toLocaleString()}</p>
                {selectedQuestion.updatedAt && selectedQuestion.updatedAt !== selectedQuestion.createdAt && (
                  <p>Last Updated: {new Date(selectedQuestion.updatedAt).toLocaleString()}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubjectQuestionsPage;
