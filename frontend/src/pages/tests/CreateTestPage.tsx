import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Plus, Trash2, Wand2, ChevronUp, ChevronDown, Eye, X } from 'lucide-react';

interface Question {
  _id: string;
  questionNumber: string;
  questionText: string;
  chapter: string;
  topic: string;
  marks: number;
  difficultyLevel: 'easy' | 'medium' | 'hard';
  questionType?: 'multiple-choice' | 'true-false' | 'short-answer' | 'long-answer';
  questionImage?: string;
  options?: string[];
  correctAnswer?: string;
  answerLines?: number;
  tags?: string[];
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
  subject: {
    _id: string;
    name: string;
  };
}

interface Student {
  _id: string;
  name: string;
  email: string;
}

interface Group {
  _id: string;
  name: string;
  description: string;
  students: Student[];
}

interface Chapter {
  name: string;
  topics: string[];
}

interface Subject {
  _id: string;
  name: string;
  chapters: Chapter[];
}

interface SelectedQuestion {
  question: string;
  marks: number;
  order: number;
  section?: string;
}

interface TestSection {
  id: string;
  name: string;
  description?: string;
  order: number;
}

const CreateTestPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [mode, setMode] = useState<'manual' | 'auto'>('manual');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>([]);
  const [sections, setSections] = useState<TestSection[]>([
    { id: 'default', name: 'Section A', description: 'Main questions', order: 1 }
  ]);
  const [selectedSectionForQuestion, setSelectedSectionForQuestion] = useState<string>('default');
  const [isAddingSectionMode, setIsAddingSectionMode] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [assignmentType, setAssignmentType] = useState<'individual' | 'group'>('group');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    description: '',
    duration: '60',
    scheduledDate: '',
    deadline: '',
    showResultsImmediately: false
  });

  const [autoGenSettings, setAutoGenSettings] = useState({
    totalMarks: '100',
    easyPercentage: '40',
    mediumPercentage: '40',
    hardPercentage: '20',
    chapters: [] as string[],
    topics: [] as string[],
    questionTypes: [] as string[],
    specificMarks: [] as number[]
  });

  const [filters, setFilters] = useState({
    subject: '',
    chapter: '',
    difficulty: '',
    minMarks: '',
    maxMarks: ''
  });

  useEffect(() => {
    fetchSubjects();
    fetchStudents();
    fetchGroups();
    if (isEditMode) {
      fetchTest();
    }
  }, []);

  // Clear topics when chapters change
  useEffect(() => {
    setAutoGenSettings(prev => ({
      ...prev,
      topics: []
    }));
  }, [autoGenSettings.chapters]);

  useEffect(() => {
    if (mode === 'manual') {
      // Debounce the API call for marks filters to avoid too many requests while typing
      const timeoutId = setTimeout(() => {
        if (filters.subject || filters.chapter || filters.difficulty || filters.minMarks || filters.maxMarks || searchQuery) {
          fetchQuestions();
        }
      }, 300); // 300ms delay

      return () => clearTimeout(timeoutId);
    }
  }, [filters, mode, searchQuery]);

  const fetchTest = async () => {
    try {
      setInitialLoading(true);
      const response = await api.get(`/tests/${id}`);
      const test = response.data.test;
      
      // Populate form data
      setFormData({
        title: test.title || '',
        subject: test.subject?._id || '',
        description: test.description || '',
        duration: test.duration?.toString() || '60',
        scheduledDate: test.scheduledDate ? new Date(test.scheduledDate).toISOString().slice(0, 16) : '',
        deadline: test.deadline ? new Date(test.deadline).toISOString().slice(0, 16) : '',
        showResultsImmediately: test.showResultsImmediately || false
      });

      // Set filters for question loading
      if (test.subject?._id) {
        setFilters({ ...filters, subject: test.subject._id });
      }

      // Set selected questions
      if (test.questions && test.questions.length > 0) {
        const selectedQs = test.questions.map((q: any) => ({
          question: q.question._id || q.question,
          marks: q.marks,
          order: q.order,
          section: q.section || 'default'
        }));
        setSelectedQuestions(selectedQs);
      }

      // Set sections
      if (test.sections && test.sections.length > 0) {
        setSections(test.sections);
      }

      // Set selected students
      if (test.assignedTo && test.assignedTo.length > 0) {
        const studentIds = test.assignedTo.map((s: any) => s._id || s);
        setSelectedStudents(studentIds);
      }
    } catch (error) {
      console.error('Failed to fetch test:', error);
      alert('Failed to load test details');
    } finally {
      setInitialLoading(false);
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

  const fetchQuestions = async () => {
    try {
      const params: any = {};
      if (filters.subject) params.subject = filters.subject;
      if (filters.chapter) params.chapter = filters.chapter;
      if (filters.difficulty) params.difficultyLevel = filters.difficulty;
      if (filters.minMarks) params.minMarks = filters.minMarks;
      if (filters.maxMarks) params.maxMarks = filters.maxMarks;
      if (searchQuery) params.search = searchQuery;

      const response = await api.get('/questions', { params });
      setQuestions(response.data.questions);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get('/users?role=student');
      setStudents(response.data.users || []);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await api.get('/groups');
      setGroups(response.data || []);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  };

  const handleAddQuestion = (question: Question) => {
    if (selectedQuestions.find(q => q.question === question._id)) {
      alert('Question already added');
      return;
    }

    const newQuestion: SelectedQuestion = {
      question: question._id,
      marks: question.marks,
      order: selectedQuestions.length + 1,
      section: selectedSectionForQuestion
    };

    setSelectedQuestions([...selectedQuestions, newQuestion]);
  };

  const handleRemoveQuestion = (questionId: string) => {
    const updated = selectedQuestions
      .filter(q => q.question !== questionId)
      .map((q, index) => ({ ...q, order: index + 1 }));
    setSelectedQuestions(updated);
  };

  const handleUpdateMarks = (questionId: string, marks: number) => {
    const updated = selectedQuestions.map(q =>
      q.question === questionId ? { ...q, marks } : q
    );
    setSelectedQuestions(updated);
  };

  const moveQuestionUp = (questionId: string) => {
    const currentIndex = selectedQuestions.findIndex(q => q.question === questionId);
    if (currentIndex <= 0) return; // Already at top or not found

    const newQuestions = [...selectedQuestions];
    const temp = newQuestions[currentIndex];
    newQuestions[currentIndex] = newQuestions[currentIndex - 1];
    newQuestions[currentIndex - 1] = temp;

    // Update order numbers
    const reorderedQuestions = newQuestions.map((q, index) => ({
      ...q,
      order: index + 1
    }));

    setSelectedQuestions(reorderedQuestions);
  };

  const moveQuestionDown = (questionId: string) => {
    const currentIndex = selectedQuestions.findIndex(q => q.question === questionId);
    if (currentIndex >= selectedQuestions.length - 1 || currentIndex < 0) return; // Already at bottom or not found

    const newQuestions = [...selectedQuestions];
    const temp = newQuestions[currentIndex];
    newQuestions[currentIndex] = newQuestions[currentIndex + 1];
    newQuestions[currentIndex + 1] = temp;

    // Update order numbers
    const reorderedQuestions = newQuestions.map((q, index) => ({
      ...q,
      order: index + 1
    }));

    setSelectedQuestions(reorderedQuestions);
  };

  const handlePreviewQuestion = (question: Question) => {
    setPreviewQuestion(question);
    setIsPreviewOpen(true);
  };

  // Section management functions
  const handleAddSection = () => {
    if (!newSectionName.trim()) {
      alert('Please enter a section name');
      return;
    }

    if (sections.find(s => s.name.toLowerCase() === newSectionName.toLowerCase())) {
      alert('Section with this name already exists');
      return;
    }

    const newSection: TestSection = {
      id: `section_${Date.now()}`,
      name: newSectionName,
      order: sections.length + 1
    };

    setSections([...sections, newSection]);
    setNewSectionName('');
    setIsAddingSectionMode(false);
    setSelectedSectionForQuestion(newSection.id);
  };

  const handleRemoveSection = (sectionId: string) => {
    if (sectionId === 'default') {
      alert('Cannot remove the default section');
      return;
    }

    // Check if section has questions
    const questionsInSection = selectedQuestions.filter(q => q.section === sectionId);
    if (questionsInSection.length > 0) {
      const confirmMove = window.confirm(
        `This section has ${questionsInSection.length} question(s). Move them to default section?`
      );
      
      if (confirmMove) {
        // Move questions to default section
        const updatedQuestions = selectedQuestions.map(q => 
          q.section === sectionId ? { ...q, section: 'default' } : q
        );
        setSelectedQuestions(updatedQuestions);
      } else {
        return;
      }
    }

    setSections(sections.filter(s => s.id !== sectionId));
    
    // If current selected section is being removed, switch to default
    if (selectedSectionForQuestion === sectionId) {
      setSelectedSectionForQuestion('default');
    }
  };

  const handleMoveQuestionToSection = (questionId: string, newSectionId: string) => {
    const updatedQuestions = selectedQuestions.map(q =>
      q.question === questionId ? { ...q, section: newSectionId } : q
    );
    setSelectedQuestions(updatedQuestions);
  };

  // Get API base URL for file uploads
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const FILE_BASE_URL = API_BASE_URL.replace('/api', '');

  // Helper function to render question text with inline attachments for preview
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
    const hasPlaceholders = placeholderRegex.test(questionText);

    if (!hasPlaceholders) {
      return questionText;
    }

    // Split text by placeholders and render inline
    const parts: (string | React.ReactNode)[] = [];
    let lastIndex = 0;
    
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
            {renderAttachmentPreview(attachments[attachmentIndex], attachmentIndex)}
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
      <div>
        {parts.map((part, idx) => 
          typeof part === 'string' ? <span key={idx}>{part}</span> : part
        )}
      </div>
    );
  };

  const renderAttachmentPreview = (attachment: {
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
          <div className="flex items-center gap-2 p-3 bg-gray-50 border rounded-lg max-w-md">
            <span className="text-sm font-medium">{attachment.fileName}</span>
            <span className="text-xs text-gray-600">({(attachment.fileSize / 1024).toFixed(1)} KB)</span>
          </div>
        )}
      </div>
    );
  };

  const toggleStudent = (studentId: string) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
    } else {
      setSelectedStudents([...selectedStudents, studentId]);
    }
  };

  const selectAllStudents = () => {
    setSelectedStudents(students.map(s => s._id));
  };

  const deselectAllStudents = () => {
    setSelectedStudents([]);
  };

  const getAssignedStudents = (): string[] => {
    // Only return individual students when assignment type is 'individual'
    if (assignmentType === 'individual') {
      return selectedStudents;
    }
    return [];
  };

  const getAssignedGroups = (): string[] => {
    // Only return groups when assignment type is 'group'
    if (assignmentType === 'group' && selectedGroup) {
      return [selectedGroup];
    }
    return [];
  };

  // Helper function to get available topics for selected chapters
  const getAvailableTopics = (): string[] => {
    if (!formData.subject) return [];
    
    const selectedSubject = subjects.find(s => s._id === formData.subject);
    if (!selectedSubject || !selectedSubject.chapters) return [];

    const topicsSet = new Set<string>();
    
    // If no chapters selected, get topics from all chapters
    if (autoGenSettings.chapters.length === 0) {
      selectedSubject.chapters.forEach(chapter => {
        if (chapter.topics && Array.isArray(chapter.topics)) {
          chapter.topics.forEach(topic => topicsSet.add(topic));
        }
      });
    } else {
      // Get topics only from selected chapters
      selectedSubject.chapters.forEach(chapter => {
        if (autoGenSettings.chapters.includes(chapter.name) && chapter.topics && Array.isArray(chapter.topics)) {
          chapter.topics.forEach(topic => topicsSet.add(topic));
        }
      });
    }
    
    return Array.from(topicsSet).sort();
  };

  // Helper function to get available question types
  const getAvailableQuestionTypes = (): string[] => {
    return ['multiple-choice', 'true-false', 'short-answer', 'long-answer'];
  };

  // Helper function to get common mark values
  const getCommonMarkValues = (): number[] => {
    return [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25];
  };

  const handleAutoGenerate = async () => {
    try {
      // Validate difficulty percentages
      const totalPercentage = Number(autoGenSettings.easyPercentage) + 
                             Number(autoGenSettings.mediumPercentage) + 
                             Number(autoGenSettings.hardPercentage);
      
      if (totalPercentage !== 100) {
        alert(`Difficulty percentages must add up to 100%. Current total: ${totalPercentage}%`);
        return;
      }

      if (Number(autoGenSettings.totalMarks) <= 0) {
        alert('Total marks must be greater than 0');
        return;
      }

      setLoading(true);
      const response = await api.post('/tests/auto-generate', {
        subject: formData.subject,
        title: formData.title,
        duration: Number(formData.duration),
        totalMarks: Number(autoGenSettings.totalMarks),
        easyPercentage: Number(autoGenSettings.easyPercentage),
        mediumPercentage: Number(autoGenSettings.mediumPercentage),
        hardPercentage: Number(autoGenSettings.hardPercentage),
        chapters: autoGenSettings.chapters.length > 0 ? autoGenSettings.chapters : undefined,
        topics: autoGenSettings.topics.length > 0 ? autoGenSettings.topics : undefined,
        questionTypes: autoGenSettings.questionTypes.length > 0 ? autoGenSettings.questionTypes : undefined,
        specificMarks: autoGenSettings.specificMarks.length > 0 ? autoGenSettings.specificMarks : undefined
      });

      const generatedQuestions = response.data.questions;
      
      // Extract populated questions from the response and update the questions state
      const populatedQuestions = generatedQuestions.map((q: any) => q.question);
      setQuestions((prevQuestions) => {
        // Merge with existing questions, avoiding duplicates
        const questionMap = new Map();
        [...prevQuestions, ...populatedQuestions].forEach(q => {
          if (q && q._id) {
            questionMap.set(q._id, q);
          }
        });
        return Array.from(questionMap.values());
      });
      
      // Set selected questions
      const newSelectedQuestions = generatedQuestions.map((q: any) => ({
        question: q.question._id,
        marks: q.marks,
        order: q.order,
        section: selectedSectionForQuestion
      }));
      
      console.log('Auto-generated questions:', newSelectedQuestions);
      console.log('Current selected section:', selectedSectionForQuestion);
      console.log('Available sections:', sections);
      
      setSelectedQuestions(newSelectedQuestions);
      
      alert(`Questions auto-generated successfully! ${generatedQuestions.length} questions selected.`);
      setMode('manual'); // Switch to manual mode to review
    } catch (error: any) {
      console.error('Failed to auto-generate test:', error);
      const errorMessage = error.response?.data?.message || 'Failed to auto-generate test';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedQuestions.length === 0) {
      alert('Please add at least one question');
      return;
    }

    await createTest(true); // Publish by default
  };

  const handleSaveAsDraft = async () => {
    if (selectedQuestions.length === 0) {
      alert('Please add at least one question');
      return;
    }

    await createTest(false); // Save as draft
  };

  const createTest = async (publish: boolean) => {
    try {
      setLoading(true);
      const totalMarks = selectedQuestions.reduce((sum, q) => sum + q.marks, 0);
      const assignedStudents = getAssignedStudents();
      const assignedGroups = getAssignedGroups();

      const payload = {
        title: formData.title,
        subject: formData.subject,
        description: formData.description,
        duration: Number(formData.duration),
        totalMarks,
        questions: selectedQuestions,
        sections: sections,
        assignedTo: assignedStudents,
        assignedGroups: assignedGroups,
        scheduledDate: formData.scheduledDate || undefined,
        deadline: formData.deadline || undefined,
        isPublished: publish,
        showResultsImmediately: formData.showResultsImmediately,
        resultsPublished: false
      };

      if (isEditMode) {
        await api.put(`/tests/${id}`, payload);
        alert(publish ? 'Test updated and published successfully!' : 'Test updated successfully!');
      } else {
        await api.post('/tests', payload);
        alert(publish ? 'Test created and published successfully!' : 'Test saved as draft successfully!');
      }
      
      navigate('/tests');
    } catch (error) {
      console.error('Failed to create/update test:', error);
      alert(`Failed to ${isEditMode ? 'update' : 'create'} test`);
    } finally {
      setLoading(false);
    }
  };

  const getTotalMarks = () => {
    return selectedQuestions.reduce((sum, q) => sum + q.marks, 0);
  };

  const getQuestionDetails = (questionId: string): Question | undefined => {
    return questions.find(q => q._id === questionId);
  };

  if (initialLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-gray-600">Loading test details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">
        {isEditMode ? 'Edit Test' : 'Create Test'}
      </h1>

      {/* Tab Navigation */}
      <div className="mb-4 sm:mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-3 sm:gap-6 overflow-x-auto">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                currentStep === 1
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Test Information
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                currentStep === 2
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Student Assignment
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                currentStep === 3
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Questions
            </button>
          </nav>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Step 1: Test Information */}
        {currentStep === 1 && (
          <>
            {/* Basic Information */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">Test Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="title">Test Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="e.g., Midterm Exam - Mathematics"
                    className="text-base"
                  />
                </div>

                <div className="sm:col-span-1">
                  <Label htmlFor="subject">Subject *</Label>
                  <select
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => {
                      setFormData({ ...formData, subject: e.target.value });
                      setFilters({ ...filters, subject: e.target.value, chapter: '' });
                    }}
                    required
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((subject) => (
                      <option key={subject._id} value={subject._id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-1">
                  <Label htmlFor="duration">Duration (minutes) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    required
                    min="1"
                    className="text-base"
                  />
                </div>

                <div>
                  <Label htmlFor="scheduledDate">Scheduled Date</Label>
                  <Input
                    id="scheduledDate"
                    type="datetime-local"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input
                    id="deadline"
                    type="datetime-local"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="flex w-full rounded-md border px-3 py-2"
                    rows={3}
                    placeholder="Instructions for students..."
                  />
                </div>

                <div className="col-span-2">
                  <div className="flex items-center space-x-3 p-4 border rounded-lg bg-blue-50 border-blue-200">
                    <input
                      id="showResultsImmediately"
                      type="checkbox"
                      checked={formData.showResultsImmediately}
                      onChange={(e) => setFormData({ ...formData, showResultsImmediately: e.target.checked })}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <Label htmlFor="showResultsImmediately" className="font-medium text-blue-900">
                        Show Results Immediately After Submission
                      </Label>
                      <p className="text-sm text-blue-700 mt-1">
                        When enabled, students can see their results immediately after submitting the test. 
                        When disabled, results will only be visible after you manually publish them.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/tests')}
              >
                Cancel
              </Button>
            </div>
          </>
        )}

        {/* Step 2: Student Assignment */}
        {currentStep === 2 && (
          <>
            {/* Student Assignment */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Assign to Students</h2>
              
              {/* Assignment Type Selector */}
              <div className="mb-4">
                <Label className="mb-2 block">Assignment Type</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="assignmentType"
                      value="group"
                      checked={assignmentType === 'group'}
                      onChange={(e) => setAssignmentType(e.target.value as 'group')}
                      className="h-4 w-4"
                    />
                    <span>Assign to Group</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="assignmentType"
                      value="individual"
                      checked={assignmentType === 'individual'}
                      onChange={(e) => setAssignmentType(e.target.value as 'individual')}
                      className="h-4 w-4"
                    />
                    <span>Assign to Individual Students</span>
                  </label>
                </div>
              </div>

              {/* Group Selection */}
              {assignmentType === 'group' && (
                <div>
                  <Label htmlFor="group">Select Group *</Label>
                  <select
                    id="group"
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm mb-3"
                  >
                    <option value="">Select a Group</option>
                    {groups.map((group) => (
                      <option key={group._id} value={group._id}>
                        {group.name} ({group.students.length} students)
                      </option>
                    ))}
                  </select>

                  {selectedGroup && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm font-semibold mb-2">Selected Group Students:</p>
                      <div className="max-h-48 overflow-y-auto">
                        {groups.find(g => g._id === selectedGroup)?.students.map((student) => (
                          <div key={student._id} className="text-sm py-1 flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                            <span>{student.name}</span>
                            <span className="text-gray-600">({student.email})</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm font-medium mt-2 text-blue-700">
                        Total: {groups.find(g => g._id === selectedGroup)?.students.length} students
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Individual Student Selection */}
              {assignmentType === 'individual' && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={selectAllStudents}
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={deselectAllStudents}
                      >
                        Deselect All
                      </Button>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">
                    Selected: <span className="font-semibold">{selectedStudents.length}</span> / {students.length} students
                  </p>

                  <div className="max-h-64 overflow-y-auto border rounded-lg">
                    {students.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No students found in the system
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {students.map((student) => (
                          <label
                            key={student._id}
                            className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedStudents.includes(student._id)}
                              onChange={() => toggleStudent(student._id)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <div className="flex-1">
                              <p className="font-medium">{student.name}</p>
                              <p className="text-sm text-gray-600">{student.email}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/tests')}
              >
                Cancel
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Question Selection */}
        {currentStep === 3 && (
          <>
            {/* Question Selection Mode */}
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Questions</h2>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={mode === 'manual' ? 'default' : 'outline'}
                    onClick={() => setMode('manual')}
                  >
                    Manual Selection
                  </Button>
                  <Button
                    type="button"
                    variant={mode === 'auto' ? 'default' : 'outline'}
                    onClick={() => setMode('auto')}
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    Auto Generate
                  </Button>
                </div>
              </div>

              {/* Auto Generate Mode */}
              {mode === 'auto' && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    Automatically select questions based on difficulty distribution
                  </p>

                  {/* Chapter Selection */}
                  <div>
                    <Label className="mb-2 block">Select Chapters (Optional)</Label>
                    <p className="text-xs text-gray-600 mb-2">
                      Leave empty to include all chapters, or select specific chapters
                    </p>
                    <div className="max-h-48 overflow-y-auto border rounded-lg bg-white p-3">
                      {formData.subject ? (
                        (() => {
                          const selectedSubject = subjects.find(s => s._id === formData.subject);
                          return selectedSubject && selectedSubject.chapters && selectedSubject.chapters.length > 0 ? (
                            <div className="space-y-2">
                              {selectedSubject.chapters.map((chapter, index) => (
                                <label
                                  key={index}
                                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                                >
                                  <input
                                    type="checkbox"
                                    checked={autoGenSettings.chapters.includes(chapter.name)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setAutoGenSettings({
                                          ...autoGenSettings,
                                          chapters: [...autoGenSettings.chapters, chapter.name]
                                        });
                                      } else {
                                        setAutoGenSettings({
                                          ...autoGenSettings,
                                          chapters: autoGenSettings.chapters.filter(c => c !== chapter.name)
                                        });
                                      }
                                    }}
                                    className="h-4 w-4 rounded border-gray-300"
                                  />
                                  <span className="text-sm">{chapter.name}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-2">
                              No chapters available for this subject
                            </p>
                          );
                        })()
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-2">
                          Please select a subject first
                        </p>
                      )}
                    </div>
                    {autoGenSettings.chapters.length > 0 && (
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-gray-600">
                          {autoGenSettings.chapters.length} chapter(s) selected
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setAutoGenSettings({ ...autoGenSettings, chapters: [] })}
                        >
                          Clear All
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Topic Selection */}
                  <div>
                    <Label className="mb-2 block">Select Topics (Optional)</Label>
                    <p className="text-xs text-gray-600 mb-2">
                      Select specific topics from the chosen chapters
                    </p>
                    <div className="max-h-48 overflow-y-auto border rounded-lg bg-white p-3">
                      {(() => {
                        const availableTopics = getAvailableTopics();
                        return availableTopics.length > 0 ? (
                          <div className="space-y-2">
                            {availableTopics.map((topic, index) => (
                              <label
                                key={index}
                                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={autoGenSettings.topics.includes(topic)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setAutoGenSettings({
                                        ...autoGenSettings,
                                        topics: [...autoGenSettings.topics, topic]
                                      });
                                    } else {
                                      setAutoGenSettings({
                                        ...autoGenSettings,
                                        topics: autoGenSettings.topics.filter(t => t !== topic)
                                      });
                                    }
                                  }}
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                                <span className="text-sm">{topic}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-2">
                            {formData.subject ? 'No topics available for selected chapters' : 'Please select a subject and chapters first'}
                          </p>
                        );
                      })()}
                    </div>
                    {autoGenSettings.topics.length > 0 && (
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-gray-600">
                          {autoGenSettings.topics.length} topic(s) selected
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setAutoGenSettings({ ...autoGenSettings, topics: [] })}
                        >
                          Clear All
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Question Type Selection */}
                  <div>
                    <Label className="mb-2 block">Select Question Types (Optional)</Label>
                    <p className="text-xs text-gray-600 mb-2">
                      Choose specific question types to include
                    </p>
                    <div className="grid grid-cols-2 gap-2 border rounded-lg bg-white p-3">
                      {getAvailableQuestionTypes().map((type, index) => (
                        <label
                          key={index}
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={autoGenSettings.questionTypes.includes(type)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAutoGenSettings({
                                  ...autoGenSettings,
                                  questionTypes: [...autoGenSettings.questionTypes, type]
                                });
                              } else {
                                setAutoGenSettings({
                                  ...autoGenSettings,
                                  questionTypes: autoGenSettings.questionTypes.filter(qt => qt !== type)
                                });
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <span className="text-sm capitalize">{type.replace('-', ' ')}</span>
                        </label>
                      ))}
                    </div>
                    {autoGenSettings.questionTypes.length > 0 && (
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-gray-600">
                          {autoGenSettings.questionTypes.length} question type(s) selected
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setAutoGenSettings({ ...autoGenSettings, questionTypes: [] })}
                        >
                          Clear All
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Specific Marks Selection */}
                  <div>
                    <Label className="mb-2 block">Select Specific Mark Values (Optional)</Label>
                    <p className="text-xs text-gray-600 mb-2">
                      Choose specific mark values for questions (leave empty for any marks)
                    </p>
                    <div className="grid grid-cols-6 gap-2 border rounded-lg bg-white p-3">
                      {getCommonMarkValues().map((marks, index) => (
                        <label
                          key={index}
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={autoGenSettings.specificMarks.includes(marks)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAutoGenSettings({
                                  ...autoGenSettings,
                                  specificMarks: [...autoGenSettings.specificMarks, marks].sort((a, b) => a - b)
                                });
                              } else {
                                setAutoGenSettings({
                                  ...autoGenSettings,
                                  specificMarks: autoGenSettings.specificMarks.filter(m => m !== marks)
                                });
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <span className="text-sm">{marks}</span>
                        </label>
                      ))}
                    </div>
                    {autoGenSettings.specificMarks.length > 0 && (
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-gray-600">
                          {autoGenSettings.specificMarks.length} mark value(s) selected: {autoGenSettings.specificMarks.join(', ')}
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setAutoGenSettings({ ...autoGenSettings, specificMarks: [] })}
                        >
                          Clear All
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Difficulty Distribution */}
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="totalMarks">Total Marks</Label>
                      <Input
                        id="totalMarks"
                        type="number"
                        value={autoGenSettings.totalMarks}
                        onChange={(e) => setAutoGenSettings({ ...autoGenSettings, totalMarks: e.target.value })}
                        min="1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="easyPercentage">Easy %</Label>
                      <Input
                        id="easyPercentage"
                        type="number"
                        value={autoGenSettings.easyPercentage}
                        onChange={(e) => setAutoGenSettings({ ...autoGenSettings, easyPercentage: e.target.value })}
                        min="0"
                        max="100"
                      />
                    </div>
                    <div>
                      <Label htmlFor="mediumPercentage">Medium %</Label>
                      <Input
                        id="mediumPercentage"
                        type="number"
                        value={autoGenSettings.mediumPercentage}
                        onChange={(e) => setAutoGenSettings({ ...autoGenSettings, mediumPercentage: e.target.value })}
                        min="0"
                        max="100"
                      />
                    </div>
                    <div>
                      <Label htmlFor="hardPercentage">Hard %</Label>
                      <Input
                        id="hardPercentage"
                        type="number"
                        value={autoGenSettings.hardPercentage}
                        onChange={(e) => setAutoGenSettings({ ...autoGenSettings, hardPercentage: e.target.value })}
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>

                  {/* Selection Summary */}
                  {(autoGenSettings.chapters.length > 0 || 
                    autoGenSettings.topics.length > 0 || 
                    autoGenSettings.questionTypes.length > 0 || 
                    autoGenSettings.specificMarks.length > 0) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">Selection Summary</h4>
                      <div className="space-y-1 text-xs text-blue-700">
                        {autoGenSettings.chapters.length > 0 && (
                          <p><span className="font-medium">Chapters:</span> {autoGenSettings.chapters.join(', ')}</p>
                        )}
                        {autoGenSettings.topics.length > 0 && (
                          <p><span className="font-medium">Topics:</span> {autoGenSettings.topics.join(', ')}</p>
                        )}
                        {autoGenSettings.questionTypes.length > 0 && (
                          <p><span className="font-medium">Question Types:</span> {autoGenSettings.questionTypes.map(qt => qt.replace('-', ' ')).join(', ')}</p>
                        )}
                        {autoGenSettings.specificMarks.length > 0 && (
                          <p><span className="font-medium">Mark Values:</span> {autoGenSettings.specificMarks.join(', ')}</p>
                        )}
                      </div>
                      <div className="mt-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setAutoGenSettings({
                            ...autoGenSettings,
                            chapters: [],
                            topics: [],
                            questionTypes: [],
                            specificMarks: []
                          })}
                          className="text-blue-700 border-blue-300 hover:bg-blue-100"
                        >
                          Clear All Filters
                        </Button>
                      </div>
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={handleAutoGenerate}
                    disabled={!formData.subject || loading}
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate Test
                  </Button>
                </div>
              )}

              {/* Manual Selection Mode */}
              {mode === 'manual' && (
                <div className="space-y-4">
                  {/* Filters */}
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    {/* Search and basic filters */}
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor="search">Search Questions</Label>
                        <Input
                          id="search"
                          placeholder="Search questions..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="chapter-filter">Chapter</Label>
                        <select
                          id="chapter-filter"
                          value={filters.chapter}
                          onChange={(e) => setFilters({ ...filters, chapter: e.target.value })}
                          className="flex h-10 w-full rounded-md border px-3 py-2"
                          disabled={!formData.subject}
                        >
                          <option value="">All Chapters</option>
                          {subjects
                            .find(s => s._id === formData.subject)
                            ?.chapters.map((chapter, index) => (
                              <option key={index} value={chapter.name}>
                                {chapter.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="difficulty-filter">Difficulty</Label>
                        <select
                          id="difficulty-filter"
                          value={filters.difficulty}
                          onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                          className="flex h-10 w-full rounded-md border px-3 py-2"
                        >
                          <option value="">All Difficulties</option>
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>
                      <Button
                        type="button"
                        onClick={fetchQuestions}
                        disabled={!formData.subject}
                        className="mt-6"
                      >
                        <Search className="h-4 w-4 mr-2" />
                        Search
                      </Button>
                    </div>

                    {/* Marks filter */}
                    <div className="flex items-end gap-4">
                      <div className="flex-1">
                        <Label htmlFor="min-marks">Minimum Marks</Label>
                        <Input
                          id="min-marks"
                          type="number"
                          placeholder="e.g., 1"
                          value={filters.minMarks}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Ensure minimum is not greater than maximum
                            if (filters.maxMarks && value && parseInt(value) > parseInt(filters.maxMarks)) {
                              return;
                            }
                            setFilters({ ...filters, minMarks: value });
                          }}
                          min="1"
                          className={filters.maxMarks && filters.minMarks && parseInt(filters.minMarks) > parseInt(filters.maxMarks) ? 'border-red-500' : ''}
                        />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="max-marks">Maximum Marks</Label>
                        <Input
                          id="max-marks"
                          type="number"
                          placeholder="e.g., 10"
                          value={filters.maxMarks}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Ensure maximum is not less than minimum
                            if (filters.minMarks && value && parseInt(value) < parseInt(filters.minMarks)) {
                              return;
                            }
                            setFilters({ ...filters, maxMarks: value });
                          }}
                          min="1"
                          className={filters.maxMarks && filters.minMarks && parseInt(filters.maxMarks) < parseInt(filters.minMarks) ? 'border-red-500' : ''}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setFilters({ 
                          ...filters, 
                          chapter: '', 
                          difficulty: '', 
                          minMarks: '', 
                          maxMarks: '' 
                        })}
                      >
                        Clear Filters
                      </Button>
                    </div>
                    
                    {/* Filter status message */}
                    {(filters.minMarks || filters.maxMarks) && (
                      <div className="mt-2 text-sm text-blue-600">
                        {filters.minMarks && filters.maxMarks 
                          ? `Showing questions with ${filters.minMarks}-${filters.maxMarks} marks`
                          : filters.minMarks 
                          ? `Showing questions with ${filters.minMarks}+ marks`
                          : `Showing questions with up to ${filters.maxMarks} marks`
                        }
                      </div>
                    )}
                  </div>

                  {/* Available Questions */}
                  {formData.subject && (
                    <div className="max-h-96 overflow-y-auto border rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Q.No</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Question</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Chapter</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Difficulty</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Marks</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">View</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Action</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {questions.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-4 text-center text-gray-500">
                                No questions available. Please adjust filters or add questions to the bank.
                              </td>
                            </tr>
                          ) : (
                            questions.map((q, idx) => (
                              <tr key={q._id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">{`Q${idx + 1}`}</td>
                                <td className="px-4 py-3 max-w-md truncate">{q.questionText}</td>
                                <td className="px-4 py-3">{q.chapter}</td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs ${
                                      q.difficultyLevel === 'easy'
                                        ? 'bg-green-100 text-green-800'
                                        : q.difficultyLevel === 'medium'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    {q.difficultyLevel}
                                  </span>
                                </td>
                                <td className="px-4 py-3">{q.marks}</td>
                                <td className="px-4 py-3 text-center">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handlePreviewQuestion(q)}
                                    className="text-blue-600 hover:bg-blue-50"
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    View
                                  </Button>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleAddQuestion(q)}
                                    disabled={selectedQuestions.some(sq => sq.question === q._id)}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Selected Questions */}
              <div className="mt-6">
                {/* Section Management */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Test Sections</h3>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setIsAddingSectionMode(!isAddingSectionMode)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Section
                    </Button>
                  </div>

                  {/* Add Section Form */}
                  {isAddingSectionMode && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Enter section name (e.g., Section B, Part II)"
                          value={newSectionName}
                          onChange={(e) => setNewSectionName(e.target.value)}
                          className="flex-1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddSection();
                            if (e.key === 'Escape') {
                              setIsAddingSectionMode(false);
                              setNewSectionName('');
                            }
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAddSection}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Add
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsAddingSectionMode(false);
                            setNewSectionName('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Sections List */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {sections.map((section) => (
                      <div key={section.id} className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant={selectedSectionForQuestion === section.id ? 'default' : 'outline'}
                          onClick={() => setSelectedSectionForQuestion(section.id)}
                          className={`${
                            selectedSectionForQuestion === section.id
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'hover:bg-blue-50'
                          }`}
                        >
                          {section.name}
                          {selectedQuestions.filter(q => q.section === section.id).length > 0 && (
                            <span className="ml-2 text-xs bg-white text-blue-600 px-1.5 py-0.5 rounded-full">
                              {selectedQuestions.filter(q => q.section === section.id).length}
                            </span>
                          )}
                        </Button>
                        {section.id !== 'default' && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveSection(section.id)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="text-xs text-gray-600 mb-4">
                    Questions will be added to <strong>{sections.find(s => s.id === selectedSectionForQuestion)?.name}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">
                    Selected Questions ({selectedQuestions.length})
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="text-sm">
                      Total Marks: <span className="font-bold text-blue-600">{getTotalMarks()}</span>
                    </div>
                    {selectedQuestions.length > 0 && (
                      <div className="text-xs text-gray-600">
                        Use ↑↓ buttons to reorder questions
                      </div>
                    )}
                  </div>
                </div>

                {selectedQuestions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                    No questions selected yet
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {sections
                      .filter(section => selectedQuestions.some(q => q.section === section.id))
                      .sort((a, b) => a.order - b.order)
                      .map((section) => {
                        const sectionQuestions = selectedQuestions
                          .filter(q => q.section === section.id)
                          .sort((a, b) => a.order - b.order);

                        return (
                          <div key={section.id} className="border rounded-lg p-3 bg-white">
                            <div className="flex items-center justify-between mb-3 pb-2 border-b">
                              <h4 className="font-medium text-gray-900">{section.name}</h4>
                              <span className="text-sm text-gray-500">
                                {sectionQuestions.length} question{sectionQuestions.length !== 1 ? 's' : ''} • 
                                {sectionQuestions.reduce((sum, q) => sum + q.marks, 0)} marks
                              </span>
                            </div>
                            
                            <div className="space-y-2">
                              {sectionQuestions.map((sq, index) => {
                                const question = getQuestionDetails(sq.question);
                                const isFirst = index === 0;
                                const isLast = index === sectionQuestions.length - 1;
                                
                                return (
                                  <div
                                    key={sq.question}
                                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border hover:border-gray-300 transition-colors"
                                  >
                                    {/* Question Order and Reorder Controls */}
                                    <div className="flex flex-col items-center">
                                      <span className="font-medium text-gray-700 mb-1">#{sq.order}</span>
                                      <div className="flex flex-col gap-1">
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => moveQuestionUp(sq.question)}
                                          disabled={isFirst}
                                          className="h-6 w-6 p-0 hover:bg-blue-100 disabled:opacity-30"
                                          title="Move up"
                                        >
                                          <ChevronUp className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => moveQuestionDown(sq.question)}
                                          disabled={isLast}
                                          className="h-6 w-6 p-0 hover:bg-blue-100 disabled:opacity-30"
                                          title="Move down"
                                        >
                                          <ChevronDown className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                    
                                    {/* Question Content */}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">
                                        {question?.questionText ? (question.questionText.substring(0, 80) + (question.questionText.length > 80 ? '...' : '')) : 'Question'}
                                      </p>
                                      <div className="flex items-center gap-4 mt-1">
                                        <p className="text-xs text-gray-600">
                                          Chapter: {question?.chapter || 'N/A'}
                                        </p>
                                        <p className="text-xs text-gray-600">
                                          Difficulty: <span className={`inline-block px-1 py-0.5 rounded text-xs ${
                                            question?.difficultyLevel === 'easy'
                                              ? 'bg-green-100 text-green-800'
                                              : question?.difficultyLevel === 'medium'
                                              ? 'bg-yellow-100 text-yellow-800'
                                              : 'bg-red-100 text-red-800'
                                          }`}>
                                            {question?.difficultyLevel || 'N/A'}
                                          </span>
                                        </p>
                                      </div>
                                    </div>
                                    
                                    {/* Section Selector and Action Buttons */}
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-1">
                                        <Label className="text-xs whitespace-nowrap">Section:</Label>
                                        <select
                                          value={sq.section || 'default'}
                                          onChange={(e) => handleMoveQuestionToSection(sq.question, e.target.value)}
                                          className="text-xs border rounded px-2 py-1 bg-white"
                                        >
                                          {sections.map((sec) => (
                                            <option key={sec.id} value={sec.id}>
                                              {sec.name}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Label className="text-xs whitespace-nowrap">Marks:</Label>
                                        <Input
                                          type="number"
                                          value={sq.marks}
                                          onChange={(e) =>
                                            handleUpdateMarks(sq.question, Number(e.target.value))
                                          }
                                          className="w-16 h-8"
                                          min="1"
                                        />
                                      </div>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => question && handlePreviewQuestion(question)}
                                        className="text-blue-600 hover:bg-blue-50"
                                        title="View full question"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleRemoveQuestion(sq.question)}
                                        className="text-red-600 hover:bg-red-50"
                                        title="Remove question"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    
                    {/* Display orphaned questions (questions without valid sections) */}
                    {(() => {
                      const orphanedQuestions = selectedQuestions.filter(q => 
                        !sections.some(section => section.id === q.section)
                      );
                      
                      if (orphanedQuestions.length === 0) return null;
                      
                      return (
                        <div className="border rounded-lg p-3 bg-yellow-50 border-yellow-200">
                          <div className="flex items-center justify-between mb-3 pb-2 border-b border-yellow-200">
                            <h4 className="font-medium text-gray-900">
                              ⚠️ Questions without section
                            </h4>
                            <span className="text-sm text-gray-500">
                              {orphanedQuestions.length} question{orphanedQuestions.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="text-xs text-yellow-700 mb-2">
                            These questions need to be assigned to a section
                          </div>
                          
                          <div className="space-y-2">
                            {orphanedQuestions.map((sq) => {
                              const question = getQuestionDetails(sq.question);
                              
                              return (
                                <div
                                  key={sq.question}
                                  className="flex items-center gap-3 p-3 bg-yellow-100 rounded-lg border border-yellow-200"
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {question?.questionText ? (question.questionText.substring(0, 80) + (question.questionText.length > 80 ? '...' : '')) : 'Question'}
                                    </p>
                                    <div className="flex items-center gap-4 mt-1">
                                      <p className="text-xs text-gray-600">
                                        Chapter: {question?.chapter || 'N/A'}
                                      </p>
                                      <p className="text-xs text-gray-600">
                                        Marks: {sq.marks}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                      <Label className="text-xs whitespace-nowrap">Assign to:</Label>
                                      <select
                                        value={sq.section || 'default'}
                                        onChange={(e) => handleMoveQuestionToSection(sq.question, e.target.value)}
                                        className="text-xs border rounded px-2 py-1 bg-white"
                                      >
                                        {sections.map((sec) => (
                                          <option key={sec.id} value={sec.id}>
                                            {sec.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleRemoveQuestion(sq.question)}
                                      className="h-6 w-6 p-0 hover:bg-red-100 text-red-600"
                                      title="Remove question"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/tests')}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveAsDraft}
                disabled={loading}
              >
                {loading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Save as Draft')}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (isEditMode ? 'Updating...' : 'Publishing...') : (isEditMode ? 'Update & Publish' : 'Publish Test')}
              </Button>
            </div>
          </>
        )}
      </form>

      {/* Question Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Question Preview</DialogTitle>
          </DialogHeader>
          
          {previewQuestion && (
            <div className="space-y-4">
              {/* Question Header Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-600">Chapter:</span>
                  <p className="text-sm">{previewQuestion.chapter}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Topic:</span>
                  <p className="text-sm">{previewQuestion.topic || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Marks:</span>
                  <p className="text-sm font-semibold">{previewQuestion.marks}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Difficulty:</span>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                    previewQuestion.difficultyLevel === 'easy'
                      ? 'bg-green-100 text-green-800'
                      : previewQuestion.difficultyLevel === 'medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {previewQuestion.difficultyLevel}
                  </span>
                </div>
              </div>

              {/* Question Text */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Question:</h3>
                <div className="p-4 border rounded-lg bg-white">
                  <div className="text-gray-800 whitespace-pre-wrap">
                    {renderQuestionTextWithAttachments(previewQuestion.questionText, previewQuestion.attachments)}
                  </div>
                  
                  {/* Question Image */}
                  {previewQuestion.questionImage && (
                    <div className="mt-4">
                      <img 
                        src={previewQuestion.questionImage} 
                        alt="Question attachment"
                        className="max-w-full h-auto rounded border"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Options (for multiple choice questions) */}
              {previewQuestion.options && previewQuestion.options.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Options:</h3>
                  <div className="space-y-2">
                    {previewQuestion.options.map((option, index) => (
                      <div 
                        key={index} 
                        className={`p-3 border rounded-lg ${
                          previewQuestion.correctAnswer === option 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-gray-600">
                            {String.fromCharCode(65 + index)}.
                          </span>
                          <div className={previewQuestion.correctAnswer === option ? 'font-medium text-green-800' : ''}>
                            {renderQuestionTextWithAttachments(option, previewQuestion.attachments)}
                          </div>
                          {previewQuestion.correctAnswer === option && (
                            <span className="ml-auto text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                              Correct Answer
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Answer (for non-multiple choice questions) */}
              {previewQuestion.correctAnswer && (!previewQuestion.options || previewQuestion.options.length === 0) && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Answer:</h3>
                  <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                    <div className="text-gray-800 whitespace-pre-wrap">
                      {renderQuestionTextWithAttachments(
                        previewQuestion.correctAnswer, 
                        previewQuestion.correctAnswerAttachments || previewQuestion.attachments
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Question Type */}
              {previewQuestion.questionType && (
                <div className="text-sm text-gray-600 pt-4 border-t">
                  <span className="font-medium">Question Type: </span>
                  <span className="capitalize">{previewQuestion.questionType.replace('-', ' ')}</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateTestPage;
