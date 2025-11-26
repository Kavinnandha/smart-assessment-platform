import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Search, Plus, Trash2, Wand2, Eye, X, Calendar as CalendarIcon, GripVertical, Filter, Layers, Pencil, Check, ChevronsUpDown } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { TimePicker } from "@/components/ui/time-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { DateRange } from "react-day-picker";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Interfaces
interface Question {
  _id: string;
  questionText: string;
  questionType: string;
  marks: number;
  difficultyLevel: 'easy' | 'medium' | 'hard';
  chapter: string;
  topic?: string;
  options?: string[];
  correctAnswer?: string;
  attachments?: any[];
  correctAnswerAttachments?: any[];
}

interface Student {
  _id: string;
  name: string;
  email: string;
}
interface Group {
  _id: string;
  name: string;
  students: string[];
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

// MultiSelect Checkbox Component
function MultiSelectCheckbox({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  className,
}: {
  options: { label: string; value: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between text-xs h-8 px-3", className)}
        >
          <span className="truncate">
            {selected.length === 0
              ? placeholder
              : `${selected.length} selected`}
          </span>
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty>No item found.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-y-auto dark:scrollbar-default dark:scrollbar-thin dark:scrollbar-thumb-slate-700 dark:scrollbar-track-transparent">
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    handleSelect(option.value);
                  }}
                  className="text-xs flex items-center gap-2 cursor-pointer"
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      selected.includes(option.value)
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50 [&_svg]:invisible"
                    )}
                  >
                    <Check className={cn("h-3 w-3")} />
                  </div>
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Sortable Item Component
function SortableQuestionItem({
  id,
  question,
  index,
  onRemove,
  onUpdateMarks,
  onMoveToSection,
  sections,
  sectionId
}: {
  id: string;
  question: Question;
  index: number;
  onRemove: (id: string) => void;
  onUpdateMarks: (id: string, marks: number) => void;
  onMoveToSection: (id: string, sectionId: string) => void;
  sections: TestSection[];
  sectionId: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="p-3 border rounded-lg bg-card text-sm group relative hover:shadow-sm transition-all">
      <div className="flex justify-between gap-3 mb-2">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] h-5 px-1.5">Q{index + 1}</Badge>
              <Badge variant={question.difficultyLevel === 'easy' ? 'secondary' : question.difficultyLevel === 'medium' ? 'default' : 'destructive'} className="text-[10px] h-5 px-1.5 capitalize">
                {question.difficultyLevel}
              </Badge>
              <span className="text-xs text-muted-foreground truncate">{question.chapter}</span>
            </div>
            <p className="font-medium truncate text-sm">{question.questionText}</p>
          </div>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => onRemove(question._id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center justify-between gap-2 pl-7 mt-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Marks:</Label>
          <Input
            type="number"
            value={question.marks}
            onChange={(e) => onUpdateMarks(question._id, Number(e.target.value))}
            className="h-7 w-16 text-xs"
          />
        </div>
        {sections.length > 1 && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Section:</Label>
            <Select
              value={sectionId}
              onValueChange={(val) => onMoveToSection(question._id, val)}
            >
              <SelectTrigger className="h-7 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sections.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}

const CreateTestPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const { setLabel } = useBreadcrumb();

  const [currentTab, setCurrentTab] = useState<string>('details');
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

  // Section Renaming State
  const [renamingSectionId, setRenamingSectionId] = useState<string | null>(null);
  const [renamingSectionName, setRenamingSectionName] = useState('');

  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [assignmentType, setAssignmentType] = useState<'individual' | 'group'>('group');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [initialPublishedStatus, setInitialPublishedStatus] = useState(false);

  // Alert Dialog States
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    description: string;
    action: () => void;
    actionLabel?: string;
    cancelLabel?: string;
  }>({ title: '', description: '', action: () => { } });

  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    description: '',
    duration: '60',
    scheduledTime: '09:00',
    deadlineTime: '12:00',
    showResultsImmediately: false,
    attempts: '1'
  });

  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const [commonFilters, setCommonFilters] = useState({
    chapters: [] as string[],
    topics: [] as string[],
    difficulty: [] as string[],
    marks: [] as string[],
  });

  const [autoGenSettings, setAutoGenSettings] = useState({
    totalMarks: '100',
    easyPercentage: '40',
    mediumPercentage: '40',
    hardPercentage: '20',
    questionTypes: [] as string[],
  });

  const [showFilters, setShowFilters] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
    setCommonFilters(prev => ({
      ...prev,
      topics: []
    }));
  }, [commonFilters.chapters]);

  useEffect(() => {
    if (formData.subject) {
      fetchQuestions();
    }
  }, [formData.subject, commonFilters]);

  const fetchSubjects = async () => {
    try {
      const response = await api.get('/subjects');
      setSubjects(response.data);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get('/users?role=student');
      setStudents(response.data.users);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await api.get('/groups');
      setGroups(response.data);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  };

  const fetchQuestions = async () => {
    try {
      const params: any = { subject: formData.subject };
      if (commonFilters.chapters.length) params.chapter = commonFilters.chapters.join(',');
      if (commonFilters.topics.length) params.topic = commonFilters.topics.join(',');
      if (commonFilters.difficulty.length) params.difficultyLevel = commonFilters.difficulty.join(',');
      if (commonFilters.marks.length) params.marks = commonFilters.marks.join(',');

      const response = await api.get('/questions', { params });
      setQuestions(response.data.questions);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    }
  };

  const fetchTest = async () => {
    if (!id) return;
    try {
      setInitialLoading(true);
      const response = await api.get(`/tests/${id}`);
      const test = response.data.test;

      setLabel(test._id, test.title);

      setFormData({
        title: test.title,
        subject: typeof test.subject === 'object' ? test.subject._id : test.subject,
        description: test.description || '',
        duration: test.duration.toString(),
        scheduledTime: test.scheduledDate ? new Date(test.scheduledDate).toTimeString().slice(0, 5) : '09:00',
        deadlineTime: test.deadline ? new Date(test.deadline).toTimeString().slice(0, 5) : '12:00',
        showResultsImmediately: test.showResultsImmediately || false,
        attempts: test.attempts ? test.attempts.toString() : '1'
      });

      setInitialPublishedStatus(test.isPublished);

      if (test.scheduledDate && test.deadline) {
        setDateRange({
          from: new Date(test.scheduledDate),
          to: new Date(test.deadline)
        });
      }

      if (test.sections && test.sections.length > 0) {
        setSections(test.sections.map((s: any) => ({
          id: s.id || s.name.toLowerCase().replace(/\s+/g, '-'),
          name: s.name,
          description: s.description,
          order: s.order || 1
        })));
      }

      // Map questions
      const mappedQuestions = test.questions.map((q: any, idx: number) => ({
        question: q.question._id || q.question, // Handle populated or unpopulated
        marks: q.marks,
        order: q.order || idx,
        section: q.section || 'default'
      }));
      setSelectedQuestions(mappedQuestions);

      // Handle assignments
      if (test.assignedGroups && test.assignedGroups.length > 0) {
        setAssignmentType('group');
        setSelectedGroup(test.assignedGroups[0]._id || test.assignedGroups[0]);
      } else if (test.assignedTo && test.assignedTo.length > 0) {
        setAssignmentType('individual');
        setSelectedStudents(test.assignedTo.map((s: any) => s._id || s));
      }

    } catch (error) {
      console.error('Failed to fetch test:', error);
      showAlert('Error', 'Failed to load test details');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleAddQuestion = (question: Question) => {
    if (selectedQuestions.some(sq => sq.question === question._id)) return;

    setSelectedQuestions([...selectedQuestions, {
      question: question._id,
      marks: question.marks,
      order: selectedQuestions.length,
      section: selectedSectionForQuestion
    }]);
  };

  const handleRemoveQuestion = (questionId: string) => {
    setSelectedQuestions(selectedQuestions.filter(sq => sq.question !== questionId));
  };

  const handleUpdateMarks = (questionId: string, marks: number) => {
    setSelectedQuestions(selectedQuestions.map(sq =>
      sq.question === questionId ? { ...sq, marks } : sq
    ));
  };

  const handleMoveQuestionToSection = (questionId: string, sectionId: string) => {
    setSelectedQuestions(selectedQuestions.map(sq =>
      sq.question === questionId ? { ...sq, section: sectionId } : sq
    ));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = selectedQuestions.findIndex((q) => q.question === active.id);
      const newIndex = selectedQuestions.findIndex((q) => q.question === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        setSelectedQuestions((items) => {
          return arrayMove(items, oldIndex, newIndex).map((item, index) => ({ ...item, order: index }));
        });
      }
    }
  };

  const handleAddSection = () => {
    if (!newSectionName.trim()) return;
    const id = newSectionName.toLowerCase().replace(/\s+/g, '-');
    if (sections.some(s => s.id === id)) {
      showAlert('Error', 'Section name already exists');
      return;
    }

    setSections([...sections, {
      id,
      name: newSectionName,
      order: sections.length + 1
    }]);
    setNewSectionName('');
    setIsAddingSectionMode(false);
    setSelectedSectionForQuestion(id);
  };

  const handleRemoveSection = (sectionId: string) => {
    if (sectionId === 'default') return;

    // Move questions to default section
    setSelectedQuestions(selectedQuestions.map(sq =>
      sq.section === sectionId ? { ...sq, section: 'default' } : sq
    ));

    setSections(sections.filter(s => s.id !== sectionId));
    if (selectedSectionForQuestion === sectionId) {
      setSelectedSectionForQuestion('default');
    }
  };

  const handleStartRenamingSection = (section: TestSection) => {
    setRenamingSectionId(section.id);
    setRenamingSectionName(section.name);
  };

  const handleSaveRenamedSection = () => {
    if (!renamingSectionId || !renamingSectionName.trim()) {
      setRenamingSectionId(null);
      return;
    }

    setSections(sections.map(s =>
      s.id === renamingSectionId ? { ...s, name: renamingSectionName } : s
    ));
    setRenamingSectionId(null);
    setRenamingSectionName('');
  };

  const handleAutoGenerate = () => {
    // Logic to auto-select questions based on settings
    // This is a simplified client-side implementation
    // In a real app, this might be an API call
    const { totalMarks, easyPercentage, mediumPercentage, hardPercentage } = autoGenSettings;
    const targetMarks = parseInt(totalMarks);

    // Filter available questions based on common filters first
    let availableQuestions = [...questions];
    // (Assuming questions are already filtered by the API call based on commonFilters)

    // Sort by difficulty
    const easyQuestions = availableQuestions.filter(q => q.difficultyLevel === 'easy');
    const mediumQuestions = availableQuestions.filter(q => q.difficultyLevel === 'medium');
    const hardQuestions = availableQuestions.filter(q => q.difficultyLevel === 'hard');

    let selected: SelectedQuestion[] = [];
    let currentMarks = 0;

    // Helper to add questions
    const addQuestions = (pool: Question[], percentage: number) => {
      const target = targetMarks * (percentage / 100);
      let marks = 0;
      for (const q of pool) {
        if (marks + q.marks <= target && !selected.some(sq => sq.question === q._id)) {
          selected.push({
            question: q._id,
            marks: q.marks,
            order: selected.length,
            section: selectedSectionForQuestion
          });
          marks += q.marks;
        }
      }
      return marks;
    };

    currentMarks += addQuestions(easyQuestions, parseInt(easyPercentage));
    currentMarks += addQuestions(mediumQuestions, parseInt(mediumPercentage));
    currentMarks += addQuestions(hardQuestions, parseInt(hardPercentage));

    // Fill remaining marks with any available questions if needed
    if (currentMarks < targetMarks) {
      const remaining = availableQuestions.filter(q => !selected.some(sq => sq.question === q._id));
      for (const q of remaining) {
        if (currentMarks + q.marks <= targetMarks) {
          selected.push({
            question: q._id,
            marks: q.marks,
            order: selected.length,
            section: selectedSectionForQuestion
          });
          currentMarks += q.marks;
        }
      }
    }

    setSelectedQuestions(selected);
    setMode('manual'); // Switch back to view results
    showAlert('Success', `Auto-generated ${selected.length} questions totaling ${currentMarks} marks.`);
  };

  const selectAllStudents = () => {
    setSelectedStudents(students.map(s => s._id));
  };

  const deselectAllStudents = () => {
    setSelectedStudents([]);
  };

  const toggleStudent = (studentId: string) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
    } else {
      setSelectedStudents([...selectedStudents, studentId]);
    }
  };

  // Filter Helper Functions
  const selectAllChapters = () => {
    setCommonFilters(prev => ({
      ...prev,
      chapters: chapterOptions.map(c => c.value)
    }));
  };

  const deselectAllChapters = () => {
    setCommonFilters(prev => ({
      ...prev,
      chapters: []
    }));
  };

  const selectAllTopics = () => {
    setCommonFilters(prev => ({
      ...prev,
      topics: topicOptions.map(t => t.value)
    }));
  };

  const deselectAllTopics = () => {
    setCommonFilters(prev => ({
      ...prev,
      topics: []
    }));
  };

  const selectAllDifficulty = () => {
    setCommonFilters(prev => ({
      ...prev,
      difficulty: ['easy', 'medium', 'hard']
    }));
  };

  const deselectAllDifficulty = () => {
    setCommonFilters(prev => ({
      ...prev,
      difficulty: []
    }));
  };

  const selectAllMarks = () => {
    setCommonFilters(prev => ({
      ...prev,
      marks: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '15', '20']
    }));
  };

  const deselectAllMarks = () => {
    setCommonFilters(prev => ({
      ...prev,
      marks: []
    }));
  };

  const handlePreviewQuestion = (question: Question) => {
    setPreviewQuestion(question);
    setIsPreviewOpen(true);
  };

  const renderQuestionTextWithAttachments = (text: string, attachments: any[]) => {
    const backendBaseUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace('/api', '')
      : 'http://localhost:5000';

    return (
      <div>
        <p className="whitespace-pre-wrap">{text}</p>
        {attachments && attachments.length > 0 && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {attachments.map((att, idx) => (
              <div key={idx} className="border rounded-lg overflow-hidden bg-background">
                {att.fileType?.startsWith('image/') ? (
                  <div className="relative aspect-video bg-muted">
                    <img
                      src={`${backendBaseUrl}${att.fileUrl}`}
                      alt={att.fileName}
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="p-3 flex items-center gap-2">
                    <div className="h-8 w-8 bg-muted rounded flex items-center justify-center">
                      <span className="text-xs font-bold uppercase">{att.fileType?.split('/')[1] || 'FILE'}</span>
                    </div>
                    <span className="text-xs font-medium truncate flex-1">{att.fileName}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const showAlert = (title: string, description: string, action?: () => void, actionLabel = "OK", cancelLabel?: string) => {
    setAlertConfig({
      title,
      description,
      action: action || (() => setAlertOpen(false)),
      actionLabel,
      cancelLabel
    });
    setAlertOpen(true);
  };

  const getAssignedStudents = () => {
    if (assignmentType === 'individual') return selectedStudents;
    const group = groups.find(g => g._id === selectedGroup);
    return group ? group.students : [];
  };

  const getAssignedGroups = () => {
    if (assignmentType === 'group') return [selectedGroup];
    return [];
  };

  const validateForm = () => {
    if (!formData.title || !formData.subject || !formData.duration) {
      showAlert('Error', 'Please fill in all required fields (Title, Subject, Duration)');
      return false;
    }

    if (selectedQuestions.length === 0) {
      showAlert('Error', 'Please add at least one question');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (isEditMode) {
      // In edit mode, preserve the existing published status
      await createTest(initialPublishedStatus);
    } else {
      // In create mode, publish immediately
      await createTest(true);
    }
  };

  const handleSaveAsDraft = async () => {
    if (!validateForm()) return;

    await createTest(false);
  };

  const createTest = async (publish: boolean) => {
    try {
      setLoading(true);
      const totalMarks = selectedQuestions.reduce((sum, q) => sum + q.marks, 0);
      const assignedStudents = getAssignedStudents();
      const assignedGroups = getAssignedGroups();

      let scheduledDateISO = undefined;
      if (dateRange?.from && formData.scheduledTime) {
        const [hours, minutes] = formData.scheduledTime.split(':').map(Number);
        const d = new Date(dateRange.from);
        d.setHours(hours, minutes);
        scheduledDateISO = d.toISOString();
      }

      let deadlineDateISO = undefined;
      if (dateRange?.to && formData.deadlineTime) {
        const [hours, minutes] = formData.deadlineTime.split(':').map(Number);
        const d = new Date(dateRange.to);
        d.setHours(hours, minutes);
        deadlineDateISO = d.toISOString();
      } else if (dateRange?.from && formData.deadlineTime) {
        // Single day test
        const [hours, minutes] = formData.deadlineTime.split(':').map(Number);
        const d = new Date(dateRange.from);
        d.setHours(hours, minutes);
        deadlineDateISO = d.toISOString();
      }

      const payload = {
        title: formData.title,
        subject: formData.subject,
        description: formData.description,
        duration: parseInt(formData.duration),
        totalMarks,
        passingMarks: Math.ceil(totalMarks * 0.4), // Default 40%
        scheduledDate: scheduledDateISO,
        deadline: deadlineDateISO,
        questions: selectedQuestions.map(sq => ({
          question: sq.question,
          marks: sq.marks,
          order: sq.order,
          section: sq.section
        })),
        sections: sections.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          order: s.order
        })),
        assignedTo: assignmentType === 'individual' ? assignedStudents : [],
        assignedGroups: assignmentType === 'group' ? assignedGroups : [],
        isPublished: publish,
        showResultsImmediately: formData.showResultsImmediately,
        attempts: parseInt(formData.attempts)
      };

      if (isEditMode) {
        await api.put(`/tests/${id}`, payload);
        showAlert('Success', 'Test updated successfully', () => navigate('/tests'));
      } else {
        await api.post('/tests', payload);
        showAlert('Success', 'Test created successfully', () => navigate('/tests'));
      }
    } catch (error) {
      console.error('Failed to save test:', error);
      showAlert('Error', 'Failed to save test');
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
        <div className="bg-card p-6 rounded-lg shadow text-center">
          <p className="text-muted-foreground">Loading test details...</p>
        </div>
      </div>
    );
  }

  const currentSubject = subjects.find(s => s._id === formData.subject);
  const chapterOptions = currentSubject?.chapters.map(c => ({ label: c.name, value: c.name })) || [];

  // Derive topic options based on selected chapters
  const topicOptions = currentSubject?.chapters
    .filter(c => commonFilters.chapters.length === 0 || commonFilters.chapters.includes(c.name))
    .flatMap(c => c.topics.map(t => ({ label: t, value: t }))) || [];

  return (
    <div className="w-full pb-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {isEditMode ? 'Edit Test' : 'Create Test'}
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/tests')}>Cancel</Button>
            {!isEditMode && (
              <Button variant="outline" onClick={handleSaveAsDraft} disabled={loading}>
                {loading ? 'Saving...' : 'Save as Draft'}
              </Button>
            )}
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Saving...' : (isEditMode ? 'Update' : 'Create & Publish')}
            </Button>
          </div>
        </div>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="details">Test Details</TabsTrigger>
            <TabsTrigger value="questions" disabled={!formData.title || !formData.subject}>Questions</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 mt-6">
            <form onSubmit={(e) => { e.preventDefault(); setCurrentTab('questions'); }} className="space-y-6">
              {/* Test Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="title">Test Title <span className="text-red-500">*</span></Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        placeholder="e.g., Midterm Exam - Mathematics"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject <span className="text-red-500">*</span></Label>
                      <Select
                        value={formData.subject}
                        onValueChange={(value) => {
                          setFormData({ ...formData, subject: value });
                          setCommonFilters({ ...commonFilters, chapters: [], topics: [] });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a subject" />
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Test Period <span className="text-red-500">*</span></Label>
                      <div className="flex flex-col gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              id="date"
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !dateRange && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dateRange?.from ? (
                                dateRange.to ? (
                                  <>
                                    {format(dateRange.from, "LLL dd, y")} -{" "}
                                    {format(dateRange.to, "LLL dd, y")}
                                  </>
                                ) : (
                                  format(dateRange.from, "LLL dd, y")
                                )
                              ) : (
                                <span>Pick a date range</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              initialFocus
                              mode="range"
                              defaultMonth={dateRange?.from}
                              selected={dateRange}
                              onSelect={setDateRange}
                              numberOfMonths={2}
                              className="rounded-lg border shadow-sm"
                            />
                          </PopoverContent>
                        </Popover>
                        <div className="flex gap-4">
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs text-muted-foreground">Start Time</Label>
                            <div className="relative">
                              <TimePicker
                                value={formData.scheduledTime}
                                onChange={(val) => setFormData({ ...formData, scheduledTime: val })}
                              />
                            </div>
                          </div>
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs text-muted-foreground">End Time</Label>
                            <div className="relative">
                              <TimePicker
                                value={formData.deadlineTime}
                                onChange={(val) => setFormData({ ...formData, deadlineTime: val })}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration (minutes) <span className="text-red-500">*</span></Label>
                      <Input
                        id="duration"
                        type="number"
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                        required
                        min="1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="attempts">Number of Attempts <span className="text-red-500">*</span></Label>
                      <Input
                        id="attempts"
                        type="number"
                        value={formData.attempts}
                        onChange={(e) => setFormData({ ...formData, attempts: e.target.value })}
                        required
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex items-center space-x-2">
                    <Checkbox
                      id="showResults"
                      checked={formData.showResultsImmediately}
                      onCheckedChange={(checked) => setFormData({ ...formData, showResultsImmediately: checked as boolean })}
                    />
                    <Label
                      htmlFor="showResults"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Show results immediately after submission
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Enter test instructions or description..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Student Assignment */}
              <Card>
                <CardHeader>
                  <CardTitle>Student Assignment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <RadioGroup
                    value={assignmentType}
                    onValueChange={(value) => setAssignmentType(value as 'individual' | 'group')}
                    className="flex flex-col sm:flex-row gap-6"
                  >
                    <div className="flex items-center space-x-2 border p-4 rounded-lg flex-1 cursor-pointer hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="group" id="group" />
                      <Label htmlFor="group" className="cursor-pointer flex-1">Assign to Group</Label>
                    </div>
                    <div className="flex items-center space-x-2 border p-4 rounded-lg flex-1 cursor-pointer hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="individual" id="individual" />
                      <Label htmlFor="individual" className="cursor-pointer flex-1">Assign to Individual Students</Label>
                    </div>
                  </RadioGroup>

                  {assignmentType === 'group' ? (
                    <div className="space-y-2 max-w-md">
                      <Label htmlFor="group-select">Select Group</Label>
                      <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a student group" />
                        </SelectTrigger>
                        <SelectContent>
                          {groups.map((group) => (
                            <SelectItem key={group._id} value={group._id}>
                              {group.name} ({group.students.length} students)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label>Select Students</Label>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={selectAllStudents}>
                            Select All
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={deselectAllStudents}>
                            Deselect All
                          </Button>
                        </div>
                      </div>
                      <div className="border rounded-md max-h-60 overflow-y-auto p-2 space-y-1 bg-muted/10">
                        {students.map((student) => (
                          <div
                            key={student._id}
                            className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer"
                            onClick={() => toggleStudent(student._id)}
                          >
                            <div onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedStudents.includes(student._id)}
                                onCheckedChange={() => toggleStudent(student._id)}
                              />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{student.name}</p>
                              <p className="text-xs text-muted-foreground">{student.email}</p>
                            </div>
                          </div>
                        ))}
                        {students.length === 0 && (
                          <p className="text-sm text-muted-foreground p-4 text-center">No students found.</p>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''} selected
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" size="lg">
                  Next: Add Questions
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="questions" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
              {/* Left Column: Filters & Selection */}
              <div className="lg:col-span-6 flex flex-col gap-4 h-full overflow-hidden">
                <Card className="flex-1 flex flex-col overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Questions</CardTitle>
                      <div className="flex gap-2 items-center">
                        {(commonFilters.chapters.length > 0 || commonFilters.topics.length > 0 || commonFilters.difficulty.length > 0 || commonFilters.marks.length > 0) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCommonFilters({ chapters: [], topics: [], difficulty: [], marks: [] })}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3 w-3 mr-1" /> Clear Filters
                          </Button>
                        )}
                        <div className="flex bg-muted rounded-lg p-1">
                          <button
                            onClick={() => setMode('manual')}
                            className={cn("px-3 py-1 text-xs font-medium rounded-md transition-all", mode === 'manual' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                          >
                            Manual
                          </button>
                          <button
                            onClick={() => setMode('auto')}
                            className={cn("px-3 py-1 text-xs font-medium rounded-md transition-all", mode === 'auto' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                          >
                            Auto
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <div className="px-6 pb-4 border-b flex items-center gap-2">
                    <Button
                      variant={showFilters ? "secondary" : "outline"}
                      className="w-full justify-between"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <span className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        {showFilters ? "Hide Filters" : "Filter Questions"}
                      </span>
                      {(commonFilters.chapters.length > 0 || commonFilters.topics.length > 0 || commonFilters.difficulty.length > 0 || commonFilters.marks.length > 0) && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                          {commonFilters.chapters.length + commonFilters.topics.length + commonFilters.difficulty.length + commonFilters.marks.length}
                        </Badge>
                      )}
                    </Button>
                  </div>

                  <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
                    {mode === 'manual' ? (
                      <>
                        <div className="p-4 border-b">
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search question text..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-8"
                            />
                          </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                          {questions.map((q) => {
                            const isSelected = selectedQuestions.some(sq => sq.question === q._id);
                            return (
                              <div
                                key={q._id}
                                className={cn(
                                  "p-3 border rounded-lg flex flex-col gap-2 transition-colors",
                                  isSelected ? "bg-muted/50 border-primary/30" : "bg-card hover:border-primary/50"
                                )}
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex-1">
                                    <div className="flex flex-wrap gap-1 mb-1">
                                      <Badge variant="outline" className="text-[10px] h-5 px-1">{q.marks}m</Badge>
                                      <Badge variant={q.difficultyLevel === 'easy' ? 'secondary' : 'default'} className="text-[10px] h-5 px-1 capitalize">{q.difficultyLevel}</Badge>
                                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded truncate max-w-[100px]">{q.chapter}</span>
                                    </div>
                                    <p className="text-sm line-clamp-2 font-medium">{q.questionText}</p>
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => handlePreviewQuestion(q)}
                                  >
                                    <Eye className="h-3 w-3 mr-1" /> Preview
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={isSelected ? "secondary" : "default"}
                                    className="h-7 px-3 text-xs"
                                    onClick={() => isSelected ? handleRemoveQuestion(q._id) : handleAddQuestion(q)}
                                    disabled={isSelected}
                                  >
                                    {isSelected ? 'Added' : 'Add'}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                          {questions.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              <Filter className="h-8 w-8 mx-auto mb-2 opacity-20" />
                              <p>No questions found.</p>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="p-6 space-y-6 overflow-y-auto">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Total Marks Target</Label>
                            <Input
                              type="number"
                              value={autoGenSettings.totalMarks}
                              onChange={(e) => setAutoGenSettings({ ...autoGenSettings, totalMarks: e.target.value })}
                            />
                          </div>

                          <div className="space-y-3">
                            <Label>Difficulty Distribution (%)</Label>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Easy</Label>
                                <Input
                                  type="number"
                                  value={autoGenSettings.easyPercentage}
                                  onChange={(e) => setAutoGenSettings({ ...autoGenSettings, easyPercentage: e.target.value })}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Medium</Label>
                                <Input
                                  type="number"
                                  value={autoGenSettings.mediumPercentage}
                                  onChange={(e) => setAutoGenSettings({ ...autoGenSettings, mediumPercentage: e.target.value })}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Hard</Label>
                                <Input
                                  type="number"
                                  value={autoGenSettings.hardPercentage}
                                  onChange={(e) => setAutoGenSettings({ ...autoGenSettings, hardPercentage: e.target.value })}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <Button onClick={handleAutoGenerate} disabled={loading} className="w-full">
                          {loading ? (
                            <>
                              <Wand2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
                            </>
                          ) : (
                            <>
                              <Wand2 className="mr-2 h-4 w-4" /> Generate Questions
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Selected Questions & Sections */}
              <div className="lg:col-span-6 h-full overflow-hidden flex flex-col">
                {showFilters ? (
                  <Card className="h-full flex flex-col overflow-hidden border-2 border-primary/10">
                    <CardHeader className="pb-3 bg-muted/20">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">Filter Questions</CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                          <X className="h-4 w-4 mr-2" /> Close
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                        {/* Left Side: Chapters & Topics */}
                        <div className="flex flex-col gap-4 h-full overflow-hidden">
                          {/* Chapters */}
                          <div className="flex flex-col gap-2 flex-1 overflow-hidden">
                            <div className="flex items-center justify-between px-1">
                              <div className="flex items-center gap-2">
                                <Label className="font-semibold">Chapters</Label>
                                <Badge variant="secondary" className="text-[10px] h-4 px-1">{commonFilters.chapters.length}</Badge>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={selectAllChapters} className="text-[10px] text-primary hover:underline font-medium">Select All</button>
                                <button onClick={deselectAllChapters} className="text-[10px] text-muted-foreground hover:underline">Clear</button>
                              </div>
                            </div>
                            <div className="flex-1 border rounded-md p-3 overflow-y-auto bg-muted/5 space-y-3 dark:scrollbar-default dark:scrollbar-thin dark:scrollbar-thumb-slate-700 dark:scrollbar-track-transparent">
                              {chapterOptions.map((option) => (
                                <div key={option.value} className="flex items-start space-x-2">
                                  <Checkbox
                                    id={`chapter-${option.value}`}
                                    checked={commonFilters.chapters.includes(option.value)}
                                    onCheckedChange={(checked) => {
                                      const newChapters = checked
                                        ? [...commonFilters.chapters, option.value]
                                        : commonFilters.chapters.filter((c) => c !== option.value);
                                      setCommonFilters({ ...commonFilters, chapters: newChapters });
                                    }}
                                  />
                                  <Label htmlFor={`chapter-${option.value}`} className="text-sm font-normal leading-tight cursor-pointer pt-0.5">
                                    {option.label}
                                  </Label>
                                </div>
                              ))}
                              {chapterOptions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No chapters available.</p>}
                            </div>
                          </div>

                          {/* Topics */}
                          <div className="flex flex-col gap-2 flex-1 overflow-hidden">
                            <div className="flex items-center justify-between px-1">
                              <div className="flex items-center gap-2">
                                <Label className="font-semibold">Topics</Label>
                                <Badge variant="secondary" className="text-[10px] h-4 px-1">{commonFilters.topics.length}</Badge>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={selectAllTopics} className="text-[10px] text-primary hover:underline font-medium">Select All</button>
                                <button onClick={deselectAllTopics} className="text-[10px] text-muted-foreground hover:underline">Clear</button>
                              </div>
                            </div>
                            <div className="flex-1 border rounded-md p-3 overflow-y-auto bg-muted/5 space-y-3 dark:scrollbar-default dark:scrollbar-thin dark:scrollbar-thumb-slate-700 dark:scrollbar-track-transparent">
                              {topicOptions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                                  <p className="text-sm">No topics available.</p>
                                  <p className="text-xs mt-1">Select a chapter to view its topics.</p>
                                </div>
                              ) : (
                                topicOptions.map((option) => (
                                  <div key={option.value} className="flex items-start space-x-2">
                                    <Checkbox
                                      id={`topic-${option.value}`}
                                      checked={commonFilters.topics.includes(option.value)}
                                      onCheckedChange={(checked) => {
                                        const newTopics = checked
                                          ? [...commonFilters.topics, option.value]
                                          : commonFilters.topics.filter((t) => t !== option.value);
                                        setCommonFilters({ ...commonFilters, topics: newTopics });
                                      }}
                                    />
                                    <Label htmlFor={`topic-${option.value}`} className="text-sm font-normal leading-tight cursor-pointer pt-0.5">
                                      {option.label}
                                    </Label>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Side: Difficulty & Marks */}
                        <div className="flex flex-col gap-4 h-full overflow-hidden">
                          {/* Difficulty */}
                          <div className="flex flex-col gap-2 flex-1 overflow-hidden">
                            <div className="flex items-center justify-between px-1">
                              <div className="flex items-center gap-2">
                                <Label className="font-semibold">Difficulty</Label>
                                <Badge variant="secondary" className="text-[10px] h-4 px-1">{commonFilters.difficulty.length}</Badge>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={selectAllDifficulty} className="text-[10px] text-primary hover:underline font-medium">Select All</button>
                                <button onClick={deselectAllDifficulty} className="text-[10px] text-muted-foreground hover:underline">Clear</button>
                              </div>
                            </div>
                            <div className="flex-1 border rounded-md p-3 overflow-y-auto bg-muted/5 space-y-3 dark:scrollbar-default dark:scrollbar-thin dark:scrollbar-thumb-slate-700 dark:scrollbar-track-transparent">
                              {[
                                { label: 'Easy', value: 'easy' },
                                { label: 'Medium', value: 'medium' },
                                { label: 'Hard', value: 'hard' },
                              ].map((option) => (
                                <div key={option.value} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`diff-${option.value}`}
                                    checked={commonFilters.difficulty.includes(option.value)}
                                    onCheckedChange={(checked) => {
                                      const newDiff = checked
                                        ? [...commonFilters.difficulty, option.value]
                                        : commonFilters.difficulty.filter((d) => d !== option.value);
                                      setCommonFilters({ ...commonFilters, difficulty: newDiff });
                                    }}
                                  />
                                  <Label htmlFor={`diff-${option.value}`} className="text-sm font-normal cursor-pointer capitalize">
                                    {option.label}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Marks */}
                          <div className="flex flex-col gap-2 flex-1 overflow-hidden">
                            <div className="flex items-center justify-between px-1">
                              <div className="flex items-center gap-2">
                                <Label className="font-semibold">Marks</Label>
                                <Badge variant="secondary" className="text-[10px] h-4 px-1">{commonFilters.marks.length}</Badge>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={selectAllMarks} className="text-[10px] text-primary hover:underline font-medium">Select All</button>
                                <button onClick={deselectAllMarks} className="text-[10px] text-muted-foreground hover:underline">Clear</button>
                              </div>
                            </div>
                            <div className="flex-1 border rounded-md p-3 overflow-y-auto bg-muted/5 space-y-3 dark:scrollbar-default dark:scrollbar-thin dark:scrollbar-thumb-slate-700 dark:scrollbar-track-transparent">
                              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '15', '20'].map((mark) => (
                                <div key={mark} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`mark-${mark}`}
                                    checked={commonFilters.marks.includes(mark)}
                                    onCheckedChange={(checked) => {
                                      const newMarks = checked
                                        ? [...commonFilters.marks, mark]
                                        : commonFilters.marks.filter((m) => m !== mark);
                                      setCommonFilters({ ...commonFilters, marks: newMarks });
                                    }}
                                  />
                                  <Label htmlFor={`mark-${mark}`} className="text-sm font-normal cursor-pointer">
                                    {mark} Marks
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="h-full flex flex-col overflow-hidden border-2 border-primary/10">
                    <CardHeader className="pb-3 bg-muted/20">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">Test Structure</CardTitle>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="font-mono">
                              Total Marks: {getTotalMarks()}
                            </Badge>
                            <Badge variant="outline" className="font-mono">
                              {selectedQuestions.length} Questions
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
                      {/* Section Tabs */}
                      <div className="px-4 pt-4 pb-2 border-b bg-background sticky top-0 z-10">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sections</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsAddingSectionMode(true)}
                            className="h-6 text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" /> Add Section
                          </Button>
                        </div>

                        {isAddingSectionMode && (
                          <div className="flex gap-2 mb-3 items-center bg-muted p-2 rounded-md">
                            <Input
                              value={newSectionName}
                              onChange={(e) => setNewSectionName(e.target.value)}
                              placeholder="Section Name"
                              className="h-8 text-sm w-48"
                              autoFocus
                            />
                            <Button size="sm" onClick={handleAddSection} className="h-8">Add</Button>
                            <Button size="sm" variant="ghost" onClick={() => setIsAddingSectionMode(false)} className="h-8">Cancel</Button>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          {sections.map(section => (
                            <div
                              key={section.id}
                              className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border transition-all cursor-pointer select-none group",
                                selectedSectionForQuestion === section.id
                                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                  : "bg-background hover:bg-accent hover:text-accent-foreground"
                              )}
                              onClick={() => setSelectedSectionForQuestion(section.id)}
                            >
                              <Layers className="h-3 w-3" />
                              {renamingSectionId === section.id ? (
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  <Input
                                    value={renamingSectionName}
                                    onChange={(e) => setRenamingSectionName(e.target.value)}
                                    className="h-6 w-24 text-xs px-1 py-0 bg-background text-foreground"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveRenamedSection();
                                      if (e.key === 'Escape') setRenamingSectionId(null);
                                    }}
                                  />
                                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={handleSaveRenamedSection}>
                                    <Check className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <span>{section.name}</span>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div
                                      className="hover:bg-primary-foreground/20 rounded-full p-0.5"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStartRenamingSection(section);
                                      }}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </div>
                                    {section.id !== 'default' && (
                                      <div
                                        className="hover:bg-primary-foreground/20 rounded-full p-0.5"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveSection(section.id);
                                        }}
                                      >
                                        <X className="h-3 w-3" />
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2">
                          Select a section above to view and manage its questions.
                        </p>
                      </div>

                      {/* Questions List */}
                      <div className="flex-1 overflow-y-auto p-4 bg-muted/10">
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleDragEnd}
                        >
                          {sections.map(section => {
                            const sectionQuestions = selectedQuestions.filter(q => q.section === section.id);
                            // Only show the selected section
                            if (section.id !== selectedSectionForQuestion) return null;

                            return (
                              <div key={section.id} className="mb-6 last:mb-0">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="h-px flex-1 bg-border" />
                                  <span className="text-sm font-medium text-muted-foreground px-2 bg-background border rounded-full">
                                    {section.name} <span className="text-xs opacity-70">({sectionQuestions.length})</span>
                                  </span>
                                  <div className="h-px flex-1 bg-border" />
                                </div>

                                <div className="space-y-2 min-h-[50px]">
                                  <SortableContext
                                    items={sectionQuestions.map(q => q.question)}
                                    strategy={verticalListSortingStrategy}
                                  >
                                    {sectionQuestions.map((sq, idx) => {
                                      const q = getQuestionDetails(sq.question);
                                      if (!q) return null;

                                      return (
                                        <SortableQuestionItem
                                          key={sq.question}
                                          id={sq.question}
                                          question={q}
                                          index={idx}
                                          onRemove={handleRemoveQuestion}
                                          onUpdateMarks={handleUpdateMarks}
                                          onMoveToSection={handleMoveQuestionToSection}
                                          sections={sections}
                                          sectionId={sq.section || 'default'}
                                        />
                                      );
                                    })}
                                  </SortableContext>
                                  {sectionQuestions.length === 0 && (
                                    <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
                                      <p className="text-sm">No questions in this section.</p>
                                      <p className="text-xs mt-1">Select questions from the left panel to add them here.</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </DndContext>

                        {selectedQuestions.length === 0 && (
                          <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                            <Layers className="h-12 w-12 mb-4" />
                            <p>No questions added yet.</p>
                            <p className="text-sm">Select questions from the left panel to build your test.</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Question Preview Sheet */}
      <Sheet open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Question Details</SheetTitle>
          </SheetHeader>
          {previewQuestion && (
            <div className="space-y-6 mt-6 px-4">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{previewQuestion.questionType}</Badge>
                  <Badge variant="outline">{previewQuestion.marks} Marks</Badge>
                  <Badge className="capitalize" variant={previewQuestion.difficultyLevel === 'easy' ? 'secondary' : previewQuestion.difficultyLevel === 'medium' ? 'default' : 'destructive'}>
                    {previewQuestion.difficultyLevel}
                  </Badge>
                  <Badge variant="outline">{previewQuestion.chapter}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Question</h4>
                <div className="text-base p-4 bg-muted/30 rounded-lg border">
                  {renderQuestionTextWithAttachments(previewQuestion.questionText, previewQuestion.attachments || [])}
                </div>
              </div>

              {previewQuestion.options && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Options</h4>
                  <div className="space-y-2">
                    {previewQuestion.options.map((option, idx) => (
                      <div key={idx} className="p-3 border rounded-lg flex gap-3 items-center">
                        <span className="font-medium bg-muted w-6 h-6 flex items-center justify-center rounded-full text-xs shrink-0">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{option}</span>
                        {option === previewQuestion.correctAnswer && (
                          <Badge variant="default" className="ml-auto bg-green-600 hover:bg-green-700">Correct</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!previewQuestion.options && previewQuestion.correctAnswer && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Correct Answer</h4>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-900">
                    <p className="text-green-900 dark:text-green-300 font-medium whitespace-pre-wrap">{previewQuestion.correctAnswer}</p>

                    {previewQuestion.correctAnswerAttachments && previewQuestion.correctAnswerAttachments.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
                        <p className="text-xs font-medium text-green-800 dark:text-green-400 mb-2">Answer Attachments:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {previewQuestion.correctAnswerAttachments.map((att, idx) => {
                            const backendBaseUrl = import.meta.env.VITE_API_URL
                              ? import.meta.env.VITE_API_URL.replace('/api', '')
                              : 'http://localhost:5000';

                            return (
                              <div key={idx} className="border border-green-200 dark:border-green-800 rounded-lg overflow-hidden bg-background/50">
                                {att.fileType?.startsWith('image/') ? (
                                  <div className="relative aspect-video bg-muted/50">
                                    <img
                                      src={`${backendBaseUrl}${att.fileUrl}`}
                                      alt={att.fileName}
                                      className="absolute inset-0 w-full h-full object-contain"
                                    />
                                  </div>
                                ) : (
                                  <div className="p-3 flex items-center gap-2">
                                    <div className="h-8 w-8 bg-muted/50 rounded flex items-center justify-center">
                                      <span className="text-xs font-bold uppercase">{att.fileType?.split('/')[1] || 'FILE'}</span>
                                    </div>
                                    <span className="text-xs font-medium truncate flex-1">{att.fileName}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Alert Dialog */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertConfig.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {alertConfig.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {alertConfig.cancelLabel && (
              <AlertDialogCancel>{alertConfig.cancelLabel}</AlertDialogCancel>
            )}
            <AlertDialogAction onClick={alertConfig.action}>
              {alertConfig.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CreateTestPage;
