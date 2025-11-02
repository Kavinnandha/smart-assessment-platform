import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Plus, Trash2, Wand2 } from 'lucide-react';

interface Question {
  _id: string;
  questionNumber: string;
  questionText: string;
  chapter: string;
  topic: string;
  marks: number;
  difficultyLevel: 'easy' | 'medium' | 'hard';
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

interface Subject {
  _id: string;
  name: string;
  chapters: string[];
}

interface SelectedQuestion {
  question: string;
  marks: number;
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
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [assignmentType, setAssignmentType] = useState<'individual' | 'group'>('group');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    description: '',
    duration: '60',
    scheduledDate: '',
    deadline: ''
  });

  const [autoGenSettings, setAutoGenSettings] = useState({
    totalMarks: '100',
    easyPercentage: '40',
    mediumPercentage: '40',
    hardPercentage: '20',
    chapters: [] as string[]
  });

  const [filters, setFilters] = useState({
    subject: '',
    chapter: '',
    difficulty: ''
  });

  useEffect(() => {
    fetchSubjects();
    fetchStudents();
    fetchGroups();
    if (isEditMode) {
      fetchTest();
    }
  }, []);

  useEffect(() => {
    if (mode === 'manual' && filters.subject) {
      fetchQuestions();
    }
  }, [filters, mode]);

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
        deadline: test.deadline ? new Date(test.deadline).toISOString().slice(0, 16) : ''
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
          order: q.order
        }));
        setSelectedQuestions(selectedQs);
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
      order: selectedQuestions.length + 1
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
    if (assignmentType === 'group' && selectedGroup) {
      const group = groups.find(g => g._id === selectedGroup);
      return group ? group.students.map(s => s._id) : [];
    }
    return selectedStudents;
  };

  const handleAutoGenerate = async () => {
    try {
      setLoading(true);
      const response = await api.post('/tests/auto-generate', {
        subject: formData.subject,
        title: formData.title,
        duration: Number(formData.duration),
        totalMarks: Number(autoGenSettings.totalMarks),
        easyPercentage: Number(autoGenSettings.easyPercentage),
        mediumPercentage: Number(autoGenSettings.mediumPercentage),
        hardPercentage: Number(autoGenSettings.hardPercentage),
        chapters: autoGenSettings.chapters.length > 0 ? autoGenSettings.chapters : undefined
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
      setSelectedQuestions(generatedQuestions.map((q: any) => ({
        question: q.question._id,
        marks: q.marks,
        order: q.order
      })));
      
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

      const payload = {
        title: formData.title,
        subject: formData.subject,
        description: formData.description,
        duration: Number(formData.duration),
        totalMarks,
        questions: selectedQuestions,
        assignedTo: assignedStudents,
        scheduledDate: formData.scheduledDate || undefined,
        deadline: formData.deadline || undefined,
        isPublished: publish
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
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        {isEditMode ? 'Edit Test' : 'Create Test'}
      </h1>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-6">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
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
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
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
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Test Information */}
        {currentStep === 1 && (
          <>
            {/* Basic Information */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Test Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="title">Test Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="e.g., Midterm Exam - Mathematics"
                  />
                </div>

                <div>
                  <Label htmlFor="subject">Subject *</Label>
                  <select
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => {
                      setFormData({ ...formData, subject: e.target.value });
                      setFilters({ ...filters, subject: e.target.value, chapter: '' });
                    }}
                    required
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((subject) => (
                      <option key={subject._id} value={subject._id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="duration">Duration (minutes) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    required
                    min="1"
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
                                    checked={autoGenSettings.chapters.includes(chapter)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setAutoGenSettings({
                                          ...autoGenSettings,
                                          chapters: [...autoGenSettings.chapters, chapter]
                                        });
                                      } else {
                                        setAutoGenSettings({
                                          ...autoGenSettings,
                                          chapters: autoGenSettings.chapters.filter(c => c !== chapter)
                                        });
                                      }
                                    }}
                                    className="h-4 w-4 rounded border-gray-300"
                                  />
                                  <span className="text-sm">{chapter}</span>
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
                  <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Input
                        placeholder="Search questions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div>
                      <select
                        value={filters.chapter}
                        onChange={(e) => setFilters({ ...filters, chapter: e.target.value })}
                        className="flex h-10 w-full rounded-md border px-3 py-2"
                        disabled={!formData.subject}
                      >
                        <option value="">All Chapters</option>
                        {subjects
                          .find(s => s._id === formData.subject)
                          ?.chapters.map((chapter, index) => (
                            <option key={index} value={chapter}>
                              {chapter}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <select
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
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </Button>
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
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Action</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {questions.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                                No questions available. Please adjust filters or add questions to the bank.
                              </td>
                            </tr>
                          ) : (
                            questions.map((q) => (
                              <tr key={q._id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">{q.questionNumber}</td>
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
                                <td className="px-4 py-3">
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
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">
                    Selected Questions ({selectedQuestions.length})
                  </h3>
                  <div className="text-sm">
                    Total Marks: <span className="font-bold text-blue-600">{getTotalMarks()}</span>
                  </div>
                </div>

                {selectedQuestions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                    No questions selected yet
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedQuestions.map((sq) => {
                      const question = getQuestionDetails(sq.question);
                      return (
                        <div
                          key={sq.question}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <span className="font-medium text-gray-700">#{sq.order}</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {question?.questionNumber || 'Question'}
                            </p>
                            <p className="text-xs text-gray-600 truncate">
                              {question?.questionText || sq.question}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Marks:</Label>
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
                            onClick={() => handleRemoveQuestion(sq.question)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
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
    </div>
  );
};

export default CreateTestPage;
