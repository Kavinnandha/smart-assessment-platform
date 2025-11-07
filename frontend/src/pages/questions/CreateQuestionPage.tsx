import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, FileText } from 'lucide-react';

interface Chapter {
  name: string;
  topics: string[];
}

interface Subject {
  _id: string;
  name: string;
  chapters: Chapter[];
}

interface Attachment {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

const CreateQuestionPage = () => {
  const navigate = useNavigate();
  const { id, subjectId } = useParams();
  const isEditMode = !!id;
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [correctAnswerAttachments, setCorrectAnswerAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingAnswer, setUploadingAnswer] = useState(false);
  const [showAttachmentHelper, setShowAttachmentHelper] = useState(false);
  const [showAnswerAttachmentHelper, setShowAnswerAttachmentHelper] = useState(false);
  const [formData, setFormData] = useState({
    chapter: '',
    topic: '',
    marks: '',
    difficultyLevel: 'easy',
    questionText: '',
    subject: '',
    questionType: 'short-answer',
    correctAnswer: '',
    attachmentPosition: 'after',
    correctAnswerAttachmentPosition: 'after'
  });
  const [options, setOptions] = useState<string[]>(['', '', '', '']); // For MCQ and True/False

  useEffect(() => {
    fetchSubjects();
    if (isEditMode) {
      fetchQuestion();
    }
  }, []);

  useEffect(() => {
    // Auto-select subject if subjectId is provided in URL (both create and edit modes)
    if (subjectId && subjects.length > 0) {
      console.log('Auto-selecting subject from URL:', subjectId);
      const subject = subjects.find(s => s._id === subjectId);
      console.log('Found subject:', subject);
      if (subject) {
        setSelectedSubject(subject);
        // Set formData.subject for both create and edit when subjectId is in URL
        setFormData(prev => ({ ...prev, subject: subjectId }));
      }
    }
  }, [subjectId, subjects]);

  // Additional effect to set selected subject from loaded question data (when NO subjectId in URL)
  useEffect(() => {
    if (isEditMode && formData.subject && subjects.length > 0 && !subjectId) {
      console.log('Setting subject from question data:', formData.subject);
      const subject = subjects.find(s => s._id === formData.subject);
      console.log('Found subject from question:', subject);
      if (subject) {
        setSelectedSubject(subject);
      }
    }
  }, [formData.subject, subjects, isEditMode, subjectId]);

  const fetchQuestion = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/questions/${id}`);
      const question = response.data.question;
      
      setFormData({
        chapter: question.chapter || '',
        topic: question.topic || '',
        marks: question.marks?.toString() || '',
        difficultyLevel: question.difficultyLevel || 'easy',
        questionText: question.questionText || '',
        subject: question.subject?._id || '',
        questionType: question.questionType || 'short-answer',
        correctAnswer: question.correctAnswer || '',
        attachmentPosition: question.attachmentPosition || 'after',
        correctAnswerAttachmentPosition: question.correctAnswerAttachmentPosition || 'after'
      });

      // Load options for MCQ/True-False
      if (question.options && question.options.length > 0) {
        setOptions(question.options);
      }

      // Load attachments if they exist
      if (question.attachments && question.attachments.length > 0) {
        setAttachments(question.attachments);
      }

      // Load correct answer attachments if they exist
      if (question.correctAnswerAttachments && question.correctAnswerAttachments.length > 0) {
        setCorrectAnswerAttachments(question.correctAnswerAttachments);
      }

      // The selectedSubject will be set by the useEffect when subjects are loaded
    } catch (error) {
      console.error('Failed to fetch question:', error);
      alert('Failed to load question details');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await api.get('/subjects');
      console.log('Fetched subjects:', response.data);
      setSubjects(response.data);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const handleSubjectChange = (subjectId: string) => {
    const subject = subjects.find(s => s._id === subjectId);
    console.log('Selected subject:', subject);
    console.log('Chapters:', subject?.chapters);
    setSelectedSubject(subject || null);
    setFormData({ 
      ...formData, 
      subject: subjectId,
      chapter: '', // Reset chapter when subject changes
      topic: '' // Reset topic when subject changes
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Reset topic when chapter changes
    if (name === 'chapter') {
      setFormData(prev => ({ ...prev, chapter: value, topic: '' }));
    }

    // Update options based on question type
    if (name === 'questionType') {
      if (value === 'true-false') {
        setOptions(['True', 'False']);
      } else if (value === 'multiple-choice') {
        setOptions(['', '', '', '']);
      } else {
        setOptions([]);
      }
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    setOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadedFiles: Attachment[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        // Upload to backend (you'll need to create this endpoint)
        const response = await api.post('/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        uploadedFiles.push({
          fileName: file.name,
          fileUrl: response.data.fileUrl,
          fileType: file.type,
          fileSize: file.size,
        });
      }

      setAttachments([...attachments, ...uploadedFiles]);
      alert(`${uploadedFiles.length} file(s) uploaded successfully!`);
    } catch (error) {
      console.error('Failed to upload files:', error);
      alert('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleAnswerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingAnswer(true);
    try {
      const uploadedFiles: Attachment[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post('/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        uploadedFiles.push({
          fileName: file.name,
          fileUrl: response.data.fileUrl,
          fileType: file.type,
          fileSize: file.size,
        });
      }

      setCorrectAnswerAttachments([...correctAnswerAttachments, ...uploadedFiles]);
      alert(`${uploadedFiles.length} answer attachment(s) uploaded successfully!`);
    } catch (error) {
      console.error('Failed to upload answer files:', error);
      alert('Failed to upload answer files');
    } finally {
      setUploadingAnswer(false);
    }
  };

  const handleRemoveAnswerAttachment = (index: number) => {
    setCorrectAnswerAttachments(correctAnswerAttachments.filter((_, i) => i !== index));
  };

  const insertAttachmentPlaceholder = (attachmentIndex: number) => {
    const placeholder = `{{attachment:${attachmentIndex}}}`;
    const textarea = document.getElementById('questionText') as HTMLTextAreaElement;
    
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.questionText;
      const newText = text.substring(0, start) + placeholder + text.substring(end);
      
      setFormData({ ...formData, questionText: newText });
      
      // Set cursor position after the inserted placeholder
      setTimeout(() => {
        textarea.focus();
        const newPosition = start + placeholder.length;
        textarea.setSelectionRange(newPosition, newPosition);
      }, 0);
    }
  };

  const getAttachmentPlaceholderPreview = () => {
    const placeholderRegex = /\{\{attachment:(\d+)\}\}/g;
    return formData.questionText.match(placeholderRegex) || [];
  };

  const insertAnswerAttachmentPlaceholder = (attachmentIndex: number) => {
    const placeholder = `{{answerAttachment:${attachmentIndex}}}`;
    const textarea = document.getElementById('correctAnswer') as HTMLTextAreaElement;
    
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.correctAnswer;
      const newText = text.substring(0, start) + placeholder + text.substring(end);
      
      setFormData({ ...formData, correctAnswer: newText });
      
      // Set cursor position after the inserted placeholder
      setTimeout(() => {
        textarea.focus();
        const newPosition = start + placeholder.length;
        textarea.setSelectionRange(newPosition, newPosition);
      }, 0);
    }
  };

  const getAnswerAttachmentPlaceholderPreview = () => {
    const placeholderRegex = /\{\{answerAttachment:(\d+)\}\}/g;
    return formData.correctAnswer.match(placeholderRegex) || [];
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation for question types
    if ((formData.questionType === 'multiple-choice' || formData.questionType === 'true-false') && options.some(opt => opt.trim() === '')) {
      alert('Please fill all options');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        marks: Number(formData.marks),
        attachments: attachments,
        correctAnswerAttachments: correctAnswerAttachments,
        options: (formData.questionType === 'multiple-choice' || formData.questionType === 'true-false') ? options : undefined,
        questionType: formData.questionType,
        correctAnswer: formData.correctAnswer,
        attachmentPosition: formData.attachmentPosition,
        correctAnswerAttachmentPosition: formData.correctAnswerAttachmentPosition
      };

      if (isEditMode) {
        await api.put(`/questions/${id}`, payload);
        alert('Question updated successfully!');
      } else {
        await api.post('/questions', payload);
        alert('Question created successfully!');
      }
      
      // Navigate back to the subject questions page if subjectId exists, otherwise to main questions page
      if (subjectId) {
        navigate(`/questions/subject/${subjectId}`);
      } else {
        navigate('/questions');
      }
    } catch (error) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} question:`, error);
      alert(`Failed to ${isEditMode ? 'update' : 'create'} question`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        {isEditMode 
          ? selectedSubject
            ? `Edit Question - ${selectedSubject.name}`
            : 'Edit Question'
          : selectedSubject 
            ? `Create Question - ${selectedSubject.name}`
            : 'Create Question'}
      </h1>

      {loading && isEditMode ? (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p>Loading question...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
        {/* Show subject and chapter fields only when no subjectId in URL (both create and edit) */}
        {!subjectId && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="subject">Subject *</Label>
              <select
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                required
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" className="text-gray-900">Select Subject</option>
                {subjects.map((subject) => (
                  <option key={subject._id} value={subject._id} className="text-gray-900 py-2">
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="chapter">Chapter *</Label>
              <select
                id="chapter"
                name="chapter"
                value={formData.chapter}
                onChange={handleChange}
                required
                disabled={!formData.subject}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" className="text-gray-900">Select Chapter</option>
                {selectedSubject?.chapters && selectedSubject.chapters.length > 0 ? (
                  selectedSubject.chapters.map((chapter, index) => (
                    <option key={index} value={chapter.name} className="text-gray-900 py-2">
                      {chapter.name}
                    </option>
                  ))
                ) : null}
              </select>
              {!formData.subject && (
                <p className="text-sm text-gray-500 mt-1">Select a subject first</p>
              )}
              {formData.subject && selectedSubject && selectedSubject.chapters.length === 0 && (
                <p className="text-sm text-amber-600 mt-1">⚠️ No chapters available for this subject. Please add chapters in Subject Management.</p>
              )}
              {formData.subject && selectedSubject && selectedSubject.chapters.length > 0 && (
                <p className="text-sm text-green-600 mt-1">
                  ✓ {selectedSubject.chapters.length} chapter(s) available
                </p>
              )}
            </div>
          </div>
        )}

        {/* Show only chapter field when subjectId is provided - NO subject field (both create and edit) */}
        {subjectId && (
          <div>
            <Label htmlFor="chapter">Chapter *</Label>
            <select
              id="chapter"
              name="chapter"
              value={formData.chapter}
              onChange={handleChange}
              required
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" className="text-gray-900">Select Chapter</option>
              {selectedSubject?.chapters && selectedSubject.chapters.length > 0 ? (
                selectedSubject.chapters.map((chapter, index) => (
                  <option key={index} value={chapter.name} className="text-gray-900 py-2">
                    {chapter.name}
                  </option>
                ))
              ) : null}
            </select>
            {selectedSubject && selectedSubject.chapters.length === 0 && (
              <p className="text-sm text-amber-600 mt-1">⚠️ No chapters available for this subject. Please add chapters in Subject Management.</p>
            )}
            {selectedSubject && selectedSubject.chapters.length > 0 && (
              <p className="text-sm text-green-600 mt-1">
                ✓ {selectedSubject.chapters.length} chapter(s) available
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="topic">Topic *</Label>
            <select
              id="topic"
              name="topic"
              value={formData.topic}
              onChange={handleChange}
              required
              disabled={!formData.chapter}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Topic</option>
              {selectedSubject?.chapters
                .find(ch => ch.name === formData.chapter)
                ?.topics.map((topic, index) => (
                  <option key={index} value={topic}>
                    {topic}
                  </option>
                ))}
            </select>
            {!formData.chapter && (
              <p className="text-sm text-gray-500 mt-1">Select a chapter first</p>
            )}
            {formData.chapter && selectedSubject?.chapters.find(ch => ch.name === formData.chapter)?.topics.length === 0 && (
              <p className="text-sm text-amber-600 mt-1">⚠️ No topics available for this chapter. Please add topics in Subject Management.</p>
            )}
          </div>
          
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="marks">Marks *</Label>
            <Input
              id="marks"
              name="marks"
              type="number"
              value={formData.marks}
              onChange={handleChange}
              required
              min="1"
            />
          </div>
          <div>
            <Label htmlFor="difficultyLevel">Difficulty Level *</Label>
            <select
              id="difficultyLevel"
              name="difficultyLevel"
              value={formData.difficultyLevel}
              onChange={handleChange}
              required
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        <div>
          <Label htmlFor="questionType">Question Type *</Label>
          <select
            id="questionType"
            name="questionType"
            value={formData.questionType}
            onChange={handleChange}
            required
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="multiple-choice">Multiple Choice</option>
            <option value="true-false">True or False</option>
            <option value="short-answer">Short Answer</option>
            <option value="long-answer">Long Answer</option>
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="questionText">Question Text *</Label>
            {attachments.length > 0 && formData.attachmentPosition === 'custom' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAttachmentHelper(!showAttachmentHelper)}
                className="text-xs"
              >
                {showAttachmentHelper ? 'Hide' : 'Show'} Attachment Inserter
              </Button>
            )}
          </div>
          <textarea
            id="questionText"
            name="questionText"
            value={formData.questionText}
            onChange={handleChange}
            required
            rows={6}
            className="flex w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={
              attachments.length > 0 && formData.attachmentPosition === 'custom'
                ? "Enter your question here... Use {{attachment:0}}, {{attachment:1}}, etc. to place attachments at specific positions."
                : "Enter your question here..."
            }
          />
          {attachments.length > 0 && formData.attachmentPosition === 'custom' && (
            <div className="mt-2 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="font-semibold mb-1">💡 Custom Positioning Active:</p>
              <p className="mb-2">
                Type <code className="bg-white px-1 py-0.5 rounded border">{'{{attachment:0}}'}</code>, 
                <code className="bg-white px-1 py-0.5 rounded border ml-1">{'{{attachment:1}}'}</code>, etc. 
                in your question text to place attachments at custom positions, or use the "Show Attachment Inserter" button.
              </p>
              {getAttachmentPlaceholderPreview().length > 0 && (
                <p className="text-green-700">
                  ✓ Found {getAttachmentPlaceholderPreview().length} placeholder(s) in your question
                </p>
              )}
            </div>
          )}
        </div>

        {/* Attachment Inserter Helper - Only show when custom position is selected */}
        {showAttachmentHelper && attachments.length > 0 && formData.attachmentPosition === 'custom' && (
          <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
            <Label className="text-sm font-semibold mb-3 block">Quick Insert Attachment</Label>
            <p className="text-xs text-gray-600 mb-3">
              Click the cursor in the question text where you want to insert an attachment, then click a button below:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {attachments.map((attachment, index) => (
                <Button
                  key={index}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => insertAttachmentPlaceholder(index)}
                  className="text-xs flex items-center gap-2 justify-start"
                >
                  <span className="font-mono bg-white px-1.5 py-0.5 rounded border">
                    {index}
                  </span>
                  <span className="truncate">{attachment.fileName}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Options for Multiple Choice and True/False */}
        {(formData.questionType === 'multiple-choice' || formData.questionType === 'true-false') && (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <Label className="text-base font-semibold mb-3 block">
              Options * {formData.questionType === 'true-false' ? '(True/False)' : ''}
            </Label>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600 w-8">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <Input
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    required
                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    disabled={formData.questionType === 'true-false'}
                    className="flex-1"
                  />
                  {formData.questionType === 'multiple-choice' && options.length > 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeOption(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {formData.questionType === 'multiple-choice' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                className="mt-2"
              >
                + Add Option
              </Button>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="correctAnswer">Correct Answer *</Label>
          {formData.questionType === 'multiple-choice' ? (
            <select
              id="correctAnswer"
              name="correctAnswer"
              value={formData.correctAnswer}
              onChange={handleChange}
              required
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Correct Answer</option>
              {options.map((option, index) => (
                <option key={index} value={option}>
                  {String.fromCharCode(65 + index)}. {option}
                </option>
              ))}
            </select>
          ) : formData.questionType === 'true-false' ? (
            <select
              id="correctAnswer"
              name="correctAnswer"
              value={formData.correctAnswer}
              onChange={handleChange}
              required
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Correct Answer</option>
              <option value="True">True</option>
              <option value="False">False</option>
            </select>
          ) : (
            <textarea
              id="correctAnswer"
              name="correctAnswer"
              value={formData.correctAnswer}
              onChange={handleChange}
              required
              rows={formData.questionType === 'long-answer' ? 6 : 3}
              className="flex w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter the correct answer or model answer..."
            />
          )}
        </div>

        {/* Correct Answer Attachments Section - Only for subjective questions */}
        {(formData.questionType === 'short-answer' || formData.questionType === 'long-answer') && (
          <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold text-blue-900">
                Correct Answer Attachments (Optional)
              </Label>
              {correctAnswerAttachments.length > 0 && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="correctAnswerAttachmentPosition" className="text-xs text-blue-900">Position:</Label>
                  <select
                    id="correctAnswerAttachmentPosition"
                    name="correctAnswerAttachmentPosition"
                    value={formData.correctAnswerAttachmentPosition}
                    onChange={handleChange}
                    className="text-xs rounded-md border border-blue-300 bg-white px-2 py-1 text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="before">Before Answer</option>
                    <option value="after">After Answer (Default)</option>
                    <option value="custom">Custom (use placeholders)</option>
                  </select>
                </div>
              )}
            </div>
            
            {/* Show helper text based on position */}
            {correctAnswerAttachments.length > 0 && (
              <div className="mb-3 text-xs bg-white border border-blue-300 rounded-md p-3">
                {formData.correctAnswerAttachmentPosition === 'before' && (
                  <div>
                    <p className="font-semibold text-blue-900 mb-1">📍 Before Answer</p>
                    <p className="text-blue-700">Attachments will appear before the correct answer text.</p>
                  </div>
                )}
                {formData.correctAnswerAttachmentPosition === 'after' && (
                  <div>
                    <p className="font-semibold text-blue-900 mb-1">📍 After Answer (Default)</p>
                    <p className="text-blue-700">Attachments will appear after the correct answer text.</p>
                  </div>
                )}
                {formData.correctAnswerAttachmentPosition === 'custom' && (
                  <div>
                    <p className="font-semibold text-blue-900 mb-1">📍 Custom Position</p>
                    <p className="text-blue-700 mb-2">
                      Place attachments anywhere in your answer text using placeholders:
                    </p>
                    <div className="space-y-1">
                      {correctAnswerAttachments.map((_, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <code className="bg-blue-100 px-2 py-1 rounded border border-blue-400 font-mono text-xs">
                            {'{{answerAttachment:' + index + '}}'}
                          </code>
                          <span className="text-blue-600 text-xs">→ {correctAnswerAttachments[index].fileName}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-blue-700 mt-2">
                      Type these placeholders in your answer text or use the "Show Attachment Inserter" button below.
                    </p>
                    <div className="mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAnswerAttachmentHelper(!showAnswerAttachmentHelper)}
                        className="text-xs border-blue-300 text-blue-900 hover:bg-blue-100"
                      >
                        {showAnswerAttachmentHelper ? 'Hide' : 'Show'} Attachment Inserter
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Attachment Inserter Helper for Answer - Only show when custom position is selected */}
            {showAnswerAttachmentHelper && correctAnswerAttachments.length > 0 && formData.correctAnswerAttachmentPosition === 'custom' && (
              <div className="border border-blue-300 bg-white rounded-lg p-3 mb-3">
                <Label className="text-xs font-semibold mb-2 block text-blue-900">Quick Insert Answer Attachment</Label>
                <p className="text-xs text-blue-700 mb-2">
                  Click the cursor in the answer text where you want to insert an attachment, then click a button below:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {correctAnswerAttachments.map((attachment, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertAnswerAttachmentPlaceholder(index)}
                      className="text-xs flex items-center gap-2 justify-start border-blue-300 hover:bg-blue-50"
                    >
                      <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded border border-blue-400 text-xs">
                        {index}
                      </span>
                      <span className="truncate text-blue-900">{attachment.fileName}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-blue-700 mb-3">
              Upload reference images, diagrams, or documents that show the model/correct answer
            </p>

            {/* File Upload Button for Answer */}
            <div className="mb-4">
              <label className="flex items-center justify-center w-full h-24 px-4 transition bg-white border-2 border-blue-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-blue-400 focus:outline-none">
                <div className="flex flex-col items-center space-y-2">
                  <Upload className="w-6 h-6 text-blue-500" />
                  <span className="font-medium text-blue-700 text-sm">
                    {uploadingAnswer ? 'Uploading...' : 'Click to upload answer attachments'}
                  </span>
                  <span className="text-xs text-blue-600">
                    Images, PDFs (Max 10MB per file)
                  </span>
                </div>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                  onChange={handleAnswerFileUpload}
                  disabled={uploadingAnswer}
                />
              </label>
            </div>

            {/* Uploaded Answer Attachments List */}
            {correctAnswerAttachments.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-blue-900">
                  Uploaded Answer Attachments ({correctAnswerAttachments.length})
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {correctAnswerAttachments.map((attachment, index) => {
                    const backendBaseUrl = import.meta.env.VITE_API_URL 
                      ? import.meta.env.VITE_API_URL.replace('/api', '') 
                      : 'http://localhost:5000';
                    const fileUrl = `${backendBaseUrl}${attachment.fileUrl}`;
                    
                    // Check if this attachment is used in answer text
                    const placeholderRegex = new RegExp(`\\{\\{answerAttachment:${index}\\}\\}`, 'g');
                    const isUsedInAnswer = placeholderRegex.test(formData.correctAnswer);

                    return (
                      <div
                        key={index}
                        className={`border rounded-lg overflow-hidden bg-white relative ${
                          isUsedInAnswer ? 'border-green-400 ring-2 ring-green-200' : 'border-blue-300'
                        }`}
                      >
                        {/* Index Badge */}
                        <div className="absolute top-2 left-2 z-10">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shadow-lg ${
                            isUsedInAnswer 
                              ? 'bg-green-500 text-white' 
                              : 'bg-blue-500 text-white'
                          }`}>
                            {index}
                          </span>
                        </div>

                        {/* Preview Section */}
                        {attachment.fileType.startsWith('image/') ? (
                          <div className="relative h-32 bg-gray-100 flex items-center justify-center">
                            <img
                              src={fileUrl}
                              alt={attachment.fileName}
                              className="max-w-full max-h-full object-contain"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-32 bg-gray-50">
                            <FileText className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                        
                        {/* File Info Section */}
                        <div className={`p-2 border-t ${
                          isUsedInAnswer ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'
                        }`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 truncate">
                                {attachment.fileName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(attachment.fileSize)}
                              </p>
                              {isUsedInAnswer && (
                                <p className="text-xs text-green-700 font-medium mt-1">
                                  ✓ Used in answer
                                </p>
                              )}
                              <p className="text-xs text-gray-600 font-mono mt-1 bg-white px-1.5 py-0.5 rounded border inline-block">
                                {'{{answerAttachment:' + index + '}}'}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveAnswerAttachment(index)}
                              className="shrink-0 h-7 w-7 p-0"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Attachments Section */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-base font-semibold">Attachments (Optional)</Label>
            {attachments.length > 0 && (
              <div className="flex items-center gap-2">
                <Label htmlFor="attachmentPosition" className="text-sm">Position:</Label>
                <select
                  id="attachmentPosition"
                  name="attachmentPosition"
                  value={formData.attachmentPosition}
                  onChange={handleChange}
                  className="text-sm rounded-md border border-gray-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="before">Before Question</option>
                  <option value="after">After Question (Default)</option>
                  <option value="custom">Custom (use placeholders)</option>
                </select>
              </div>
            )}
          </div>

          {/* Show helper text based on position */}
          {attachments.length > 0 && (
            <div className="mb-3 text-xs bg-blue-50 border border-blue-200 rounded-md p-3">
              {formData.attachmentPosition === 'before' && (
                <div>
                  <p className="font-semibold text-blue-900 mb-1">📍 Before Question</p>
                  <p className="text-blue-700">Attachments will appear before the question text.</p>
                </div>
              )}
              {formData.attachmentPosition === 'after' && (
                <div>
                  <p className="font-semibold text-blue-900 mb-1">📍 After Question (Default)</p>
                  <p className="text-blue-700">Attachments will appear after the question text.</p>
                </div>
              )}
              {formData.attachmentPosition === 'custom' && (
                <div>
                  <p className="font-semibold text-blue-900 mb-1">📍 Custom Position</p>
                  <p className="text-blue-700 mb-2">
                    Place attachments anywhere in your question text using placeholders:
                  </p>
                  <div className="space-y-1">
                    {attachments.map((_, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <code className="bg-white px-2 py-1 rounded border border-blue-300 font-mono">
                          {'{{attachment:' + index + '}}'}
                        </code>
                        <span className="text-blue-600">→ {attachments[index].fileName}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-blue-700 mt-2">
                    Type these placeholders in your question text or use the "Show Attachment Inserter" button above.
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* File Upload Button */}
          <div className="mb-4">
            <label className="flex items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none">
              <div className="flex flex-col items-center space-y-2">
                <Upload className="w-8 h-8 text-gray-400" />
                <span className="font-medium text-gray-600">
                  {uploading ? 'Uploading...' : 'Click to upload files'}
                </span>
                <span className="text-xs text-gray-500">
                  PDF, Images, Documents (Max 10MB per file)
                </span>
              </div>
              <input
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          </div>

          {/* Uploaded Files List with Preview */}
          {attachments.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">
                Uploaded Files ({attachments.length})
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {attachments.map((attachment, index) => {
                  // Construct the correct file URL
                  // The attachment.fileUrl is like "/uploads/filename.jpg"
                  // We need to prepend the backend base URL
                  const backendBaseUrl = import.meta.env.VITE_API_URL 
                    ? import.meta.env.VITE_API_URL.replace('/api', '') 
                    : 'http://localhost:5000';
                  
                  const fileUrl = `${backendBaseUrl}${attachment.fileUrl}`;
                  
                  // Debug: Log the constructed URL
                  console.log('Attachment fileUrl from backend:', attachment.fileUrl);
                  console.log('Backend base URL:', backendBaseUrl);
                  console.log('Final constructed URL:', fileUrl);
                  console.log('Attachment type:', attachment.fileType);
                  
                  // Check if this attachment is used in question text
                  const placeholderRegex = new RegExp(`\\{\\{attachment:${index}\\}\\}`, 'g');
                  const isUsedInQuestion = placeholderRegex.test(formData.questionText);
                  
                  return (
                    <div
                      key={index}
                      className={`border rounded-lg overflow-hidden bg-white relative ${
                        isUsedInQuestion ? 'border-green-400 ring-2 ring-green-200' : 'border-gray-200'
                      }`}
                    >
                      {/* Index Badge */}
                      <div className="absolute top-2 left-2 z-10">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shadow-lg ${
                          isUsedInQuestion 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-700 text-white'
                        }`}>
                          {index}
                        </span>
                      </div>
                      
                      {/* Preview Section */}
                      {attachment.fileType.startsWith('image/') ? (
                        <div className="relative h-48 bg-gray-100 flex items-center justify-center">
                          {/* Debug URL Display - Remove after testing */}
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-1 truncate z-20">
                            {fileUrl}
                          </div>
                          <img
                            src={fileUrl}
                            alt={attachment.fileName}
                            className="max-w-full max-h-full object-contain"
                            loading="lazy"
                            onLoad={() => {
                              console.log('✓ Image loaded successfully:', fileUrl);
                            }}
                            onError={(e) => {
                              console.error('✗ Image failed to load:', fileUrl);
                              console.error('Check if backend is running and serving files at /uploads');
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `<div class="flex flex-col items-center justify-center h-48 bg-red-50 text-red-600 px-4"><svg class="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg><span class="text-xs text-center">Failed to load image</span><span class="text-xs mt-1 font-mono truncate w-full text-center" title="${fileUrl}">${attachment.fileName}</span></div>`;
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-48 bg-gray-50">
                          <FileText className="w-16 h-16 text-gray-400" />
                        </div>
                      )}
                      
                      {/* File Info Section */}
                      <div className={`p-3 border-t ${
                        isUsedInQuestion ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {attachment.fileName}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatFileSize(attachment.fileSize)}
                            </p>
                            {isUsedInQuestion && (
                              <p className="text-xs text-green-700 font-medium mt-1">
                                ✓ Used in question
                              </p>
                            )}
                            <p className="text-xs text-gray-600 font-mono mt-1 bg-white px-1.5 py-0.5 rounded border inline-block">
                              {'{{attachment:' + index + '}}'}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveAttachment(index)}
                            className="shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : (isEditMode ? 'Update Question' : 'Create Question')}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => subjectId ? navigate(`/questions/subject/${subjectId}`) : navigate('/questions')}
          >
            Cancel
          </Button>
        </div>
      </form>
      )}
    </div>
  );
};

export default CreateQuestionPage;
