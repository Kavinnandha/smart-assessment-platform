import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, X, FileText, Save, ArrowLeft } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';

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
    correctAnswerAttachmentPosition: 'after',
    answerLines: '3',
    tags: ''
  });
  const [tagsList, setTagsList] = useState<string[]>([]);
  const [options, setOptions] = useState<string[]>(['', '', '', '']); // For MCQ and True/False

  // Common tags for quick selection
  const commonTags = [
    'algebra', 'geometry', 'calculus', 'statistics', 'probability',
    'physics', 'chemistry', 'biology', 'history', 'literature',
    'grammar', 'vocabulary', 'essay', 'comprehension', 'analysis',
    'problem-solving', 'critical-thinking', 'basic', 'intermediate', 'advanced',
    'formula', 'theorem', 'definition', 'example', 'application'
  ];

  useEffect(() => {
    fetchSubjects();
    if (isEditMode) {
      fetchQuestion();
    }
  }, []);

  useEffect(() => {
    // Auto-select subject if subjectId is provided in URL (both create and edit modes)
    if (subjectId && subjects.length > 0) {
      const subject = subjects.find(s => s._id === subjectId);
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
      const subject = subjects.find(s => s._id === formData.subject);
      if (subject) {
        setSelectedSubject(subject);
      }
    }
  }, [formData.subject, subjects, isEditMode, subjectId]);

  const { setLabel } = useBreadcrumb();

  useEffect(() => {
    if (isEditMode && id) {
      setLabel(id, 'Edit Question');
    }
  }, [isEditMode, id, setLabel]);

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
        correctAnswerAttachmentPosition: question.correctAnswerAttachmentPosition || 'after',
        answerLines: question.answerLines?.toString() || '3',
        tags: question.tags ? question.tags.join(', ') : ''
      });

      // Set tags list
      if (question.tags && question.tags.length > 0) {
        setTagsList(question.tags);
      }

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
      toast.error('Failed to load question details');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await api.get('/subjects');
      setSubjects(response.data);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const handleSubjectChange = (subjectId: string) => {
    const subject = subjects.find(s => s._id === subjectId);
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

    // Update tags list when tags field changes
    if (name === 'tags') {
      const tagsArray = value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
      setTagsList(tagsArray);
    }

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

  const handleAddTag = (tag: string) => {
    if (tag && !tagsList.includes(tag)) {
      const newTagsList = [...tagsList, tag];
      setTagsList(newTagsList);
      setFormData({ ...formData, tags: newTagsList.join(', ') });
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
    } catch (error) {
      console.error('Failed to upload files:', error);
      toast.error('Failed to upload files');
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
    } catch (error) {
      console.error('Failed to upload answer files:', error);
      toast.error('Failed to upload answer files');
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


  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation for question types
    if ((formData.questionType === 'multiple-choice' || formData.questionType === 'true-false') && options.some(opt => opt.trim() === '')) {
      toast.error('Please fill all options');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        marks: Number(formData.marks),
        answerLines: Number(formData.answerLines),
        tags: tagsList,
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
        toast.success('Question updated successfully!');
      } else {
        await api.post('/questions', payload);
        toast.success('Question created successfully!');
      }

      // Navigate back to the subject questions page if subjectId exists, otherwise to main questions page
      if (subjectId) {
        navigate(`/questions/subject/${subjectId}`);
      } else {
        navigate('/questions');
      }
    } catch (error) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} question:`, error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} question`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditMode ? 'Edit Question' : 'Create Question'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {selectedSubject ? `Adding to ${selectedSubject.name}` : 'Fill in the details below'}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => subjectId ? navigate(`/questions/subject/${subjectId}`) : navigate('/questions')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      {loading && isEditMode ? (
        <div className="bg-card p-6 rounded-lg shadow text-center">
          <p>Loading question...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* LEFT COLUMN - Main Form (Span 8) */}
            <div className="lg:col-span-8 space-y-6">

              {/* 1. Classification Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Classification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Show subject and chapter fields only when no subjectId in URL */}
                  {!subjectId && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="subject">Subject *</Label>
                        <Select
                          value={formData.subject}
                          onValueChange={(value) => handleSubjectChange(value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {subjects.map((subject) => (
                              <SelectItem key={subject._id} value={subject._id}>
                                {subject.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="chapter">Chapter *</Label>
                        <Select
                          value={formData.chapter}
                          onValueChange={(value) => handleChange({ target: { name: 'chapter', value } } as any)}
                          disabled={!formData.subject}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Chapter" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedSubject?.chapters?.map((chapter, index) => (
                              <SelectItem key={index} value={chapter.name}>
                                {chapter.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Show only chapter field when subjectId is provided */}
                  {subjectId && (
                    <div>
                      <Label htmlFor="chapter">Chapter *</Label>
                      <Select
                        value={formData.chapter}
                        onValueChange={(value) => handleChange({ target: { name: 'chapter', value } } as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Chapter" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedSubject?.chapters?.map((chapter, index) => (
                            <SelectItem key={index} value={chapter.name}>
                              {chapter.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedSubject && selectedSubject.chapters.length === 0 && (
                        <p className="text-sm text-amber-600 mt-1">⚠️ No chapters available.</p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="topic">Topic *</Label>
                      <Select
                        value={formData.topic}
                        onValueChange={(value) => handleChange({ target: { name: 'topic', value } } as any)}
                        disabled={!formData.chapter}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Topic" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedSubject?.chapters
                            .find(ch => ch.name === formData.chapter)
                            ?.topics.map((topic, index) => (
                              <SelectItem key={index} value={topic}>
                                {topic}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="tags">Tags</Label>
                      <Input
                        id="tags"
                        name="tags"
                        value={formData.tags}
                        onChange={handleChange}
                        placeholder="e.g., algebra, equations"
                      />

                      {/* Common Tags Quick Selection */}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {commonTags.slice(0, 8).map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleAddTag(tag)}
                            disabled={tagsList.includes(tag)}
                            className={`px-2 py-0.5 text-xs rounded border ${tagsList.includes(tag)
                              ? 'bg-muted text-muted-foreground cursor-not-allowed'
                              : 'bg-muted/50 hover:bg-muted border-border'
                              }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 2. Question Details Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Question Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
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
                      <Label htmlFor="difficultyLevel">Difficulty *</Label>
                      <Select
                        value={formData.difficultyLevel}
                        onValueChange={(value) => handleChange({ target: { name: 'difficultyLevel', value } } as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="questionType">Type *</Label>
                      <Select
                        value={formData.questionType}
                        onValueChange={(value) => handleChange({ target: { name: 'questionType', value } } as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                          <SelectItem value="true-false">True or False</SelectItem>
                          <SelectItem value="short-answer">Short Answer</SelectItem>
                          <SelectItem value="long-answer">Long Answer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="questionText">Question Text *</Label>
                      {attachments.length > 0 && formData.attachmentPosition === 'custom' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAttachmentHelper(!showAttachmentHelper)}
                          className="text-xs h-6"
                        >
                          {showAttachmentHelper ? 'Hide' : 'Show'} Helper
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
                      className="flex w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your question here..."
                    />
                  </div>

                  {/* Options for MCQ/True-False */}
                  {(formData.questionType === 'multiple-choice' || formData.questionType === 'true-false') && (
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <Label className="text-base font-semibold mb-3 block">
                        Options {formData.questionType === 'true-false' ? '(True/False)' : ''}
                      </Label>
                      <div className="space-y-2">
                        {options.map((option, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground w-8">
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
                                variant="ghost"
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
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="correctAnswer">Correct Answer *</Label>
                      {correctAnswerAttachments.length > 0 && formData.correctAnswerAttachmentPosition === 'custom' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAnswerAttachmentHelper(!showAnswerAttachmentHelper)}
                          className="text-xs h-6"
                        >
                          {showAnswerAttachmentHelper ? 'Hide' : 'Show'} Helper
                        </Button>
                      )}
                    </div>
                    {formData.questionType === 'multiple-choice' ? (
                      <Select
                        value={formData.correctAnswer}
                        onValueChange={(value) => handleChange({ target: { name: 'correctAnswer', value } } as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Correct Answer" />
                        </SelectTrigger>
                        <SelectContent>
                          {options.map((option, index) => (
                            <SelectItem key={index} value={option || `__empty__${index}`}>
                              {String.fromCharCode(65 + index)}. {option || '(Empty)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : formData.questionType === 'true-false' ? (
                      <Select
                        value={formData.correctAnswer}
                        onValueChange={(value) => handleChange({ target: { name: 'correctAnswer', value } } as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Correct Answer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="True">True</SelectItem>
                          <SelectItem value="False">False</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <textarea
                        id="correctAnswer"
                        name="correctAnswer"
                        value={formData.correctAnswer}
                        onChange={handleChange}
                        required
                        rows={4}
                        className="flex w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter the correct answer or model answer..."
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN - Sidebar (Span 4) */}
            <div className="lg:col-span-4 space-y-6">

              {/* 1. Actions Card */}
              <Card className="border-blue-200 dark:border-blue-800 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button type="submit" disabled={loading} className="w-full gap-2">
                    <Save className="h-4 w-4" />
                    {loading ? 'Saving...' : (isEditMode ? 'Update Question' : 'Create Question')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => subjectId ? navigate(`/questions/subject/${subjectId}`) : navigate('/questions')}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </CardContent>
              </Card>

              {/* 2. Attachments Card */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Question Attachments</CardTitle>
                    {attachments.length > 0 && (
                      <Select
                        value={formData.attachmentPosition}
                        onValueChange={(value) => setFormData({ ...formData, attachmentPosition: value })}
                      >
                        <SelectTrigger className="w-[100px] h-8 text-xs">
                          <SelectValue placeholder="Position" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="before">Before</SelectItem>
                          <SelectItem value="after">After</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Upload Area */}
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition">
                    <div className="flex flex-col items-center pt-5 pb-6">
                      <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                      <p className="text-xs text-muted-foreground">Click to upload</p>
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

                  {/* File List */}
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {attachments.map((attachment, index) => {
                      const backendBaseUrl = import.meta.env.VITE_API_URL
                        ? import.meta.env.VITE_API_URL.replace('/api', '')
                        : 'http://localhost:5000';
                      const fileUrl = `${backendBaseUrl}${attachment.fileUrl}`;

                      return (
                        <div key={index} className="flex items-center gap-2 p-2 border rounded bg-muted/20">
                          <div className="h-10 w-10 bg-muted flex items-center justify-center rounded overflow-hidden shrink-0">
                            {attachment.fileType.startsWith('image/') ? (
                              <img src={fileUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <FileText className="h-5 w-5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate" title={attachment.fileName}>{attachment.fileName}</p>
                            <p className="text-[10px] text-muted-foreground">{formatFileSize(attachment.fileSize)}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAttachment(index)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Attachment Helper (Conditional) */}
                  {showAttachmentHelper && attachments.length > 0 && formData.attachmentPosition === 'custom' && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-xs border border-blue-100 dark:border-blue-800">
                      <p className="font-medium mb-2">Click to insert:</p>
                      <div className="flex flex-wrap gap-2">
                        {attachments.map((_, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => insertAttachmentPlaceholder(index)}
                            className="bg-background border px-2 py-1 rounded hover:bg-muted transition"
                          >
                            {`{{attachment:${index}}}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 3. Answer Attachments Card */}
              {(formData.questionType === 'short-answer' || formData.questionType === 'long-answer') && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Answer Attachments</CardTitle>
                      {correctAnswerAttachments.length > 0 && (
                        <Select
                          value={formData.correctAnswerAttachmentPosition}
                          onValueChange={(value) => setFormData({ ...formData, correctAnswerAttachmentPosition: value })}
                        >
                          <SelectTrigger className="w-[100px] h-8 text-xs">
                            <SelectValue placeholder="Position" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="before">Before</SelectItem>
                            <SelectItem value="after">After</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition">
                      <div className="flex flex-col items-center pt-5 pb-6">
                        <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                        <p className="text-xs text-muted-foreground">Click to upload answer ref</p>
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

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {correctAnswerAttachments.map((attachment, index) => {
                        const backendBaseUrl = import.meta.env.VITE_API_URL
                          ? import.meta.env.VITE_API_URL.replace('/api', '')
                          : 'http://localhost:5000';
                        const fileUrl = `${backendBaseUrl}${attachment.fileUrl}`;

                        return (
                          <div key={index} className="flex items-center gap-2 p-2 border rounded bg-muted/20">
                            <div className="h-10 w-10 bg-muted flex items-center justify-center rounded overflow-hidden shrink-0">
                              {attachment.fileType.startsWith('image/') ? (
                                <img src={fileUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <FileText className="h-5 w-5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate" title={attachment.fileName}>{attachment.fileName}</p>
                              <p className="text-[10px] text-muted-foreground">{formatFileSize(attachment.fileSize)}</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAnswerAttachment(index)}
                              className="h-6 w-6 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>

                    {showAnswerAttachmentHelper && correctAnswerAttachments.length > 0 && formData.correctAnswerAttachmentPosition === 'custom' && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-xs border border-blue-100 dark:border-blue-800">
                        <p className="font-medium mb-2">Click to insert:</p>
                        <div className="flex flex-wrap gap-2">
                          {correctAnswerAttachments.map((_, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => insertAnswerAttachmentPlaceholder(index)}
                              className="bg-background border px-2 py-1 rounded hover:bg-muted transition"
                            >
                              {`{{answerAttachment:${index}}}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default CreateQuestionPage;
