import { useEffect, useState } from 'react';
import { BookOpen, Plus, Trash2, FolderOpen, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SortableChapterItem, SortableTopicItem } from '@/components/SortableSubjectItems';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Chapter {
  name: string;
  topics: string[];
}

interface Subject {
  _id: string;
  name: string;
  chapters: Chapter[];
  createdAt: string;
  updatedAt: string;
}

// Form interfaces with stable IDs for DnD
interface FormTopic {
  id: string;
  name: string;
}

interface FormChapter {
  id: string;
  name: string;
  topics: FormTopic[];
}

interface SubjectFormData {
  name: string;
  chapters: FormChapter[];
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState<SubjectFormData>({ name: '', chapters: [] });
  const [newChapterName, setNewChapterName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Inline editing state for Sheet
  const [editingChapterIndex, setEditingChapterIndex] = useState<number | null>(null);
  const [editingChapterValue, setEditingChapterValue] = useState('');
  const [editingTopic, setEditingTopic] = useState<{ chapterIndex: number, topicIndex: number } | null>(null);
  const [editingTopicValue, setEditingTopicValue] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [expandedChapterIndex, setExpandedChapterIndex] = useState<number | null>(null);

  // Delete Confirmation State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    type: 'subject' | 'chapter' | 'topic';
    data: any;
  }>({ isOpen: false, type: 'subject', data: null });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const response = await api.get('/subjects');
      setSubjects(response.data);
    } catch (err: any) {
      console.error('Failed to fetch subjects:', err);
      toast.error(err.response?.data?.message || 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSheet = (subject?: Subject) => {
    if (subject) {
      setEditingSubject(subject);
      // Map subject data to form data with stable IDs
      setFormData({
        name: subject.name,
        chapters: subject.chapters.map((ch, chIdx) => ({
          id: `chapter-${chIdx}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: ch.name,
          topics: ch.topics.map((t, tIdx) => ({
            id: `topic-${chIdx}-${tIdx}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: t
          }))
        }))
      });
    } else {
      setEditingSubject(null);
      setFormData({ name: '', chapters: [] });
    }
    setNewChapterName('');
    setEditingChapterIndex(null);
    setEditingTopic(null);
    setExpandedChapterIndex(null);
    setIsSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setEditingSubject(null);
    setFormData({ name: '', chapters: [] });
  };

  // Form handling functions (Local State in Sheet)
  const handleAddChapterToForm = () => {
    if (!newChapterName.trim()) return;
    if (formData.chapters.some(ch => ch.name === newChapterName.trim())) {
      toast.error('Chapter already exists');
      return;
    }

    const newChapter: FormChapter = {
      id: `new-chapter-${Date.now()}`,
      name: newChapterName.trim(),
      topics: []
    };

    setFormData({
      ...formData,
      chapters: [...formData.chapters, newChapter]
    });
    setNewChapterName('');
  };

  const handleRemoveChapterFromForm = (index: number) => {
    const newChapters = [...formData.chapters];
    newChapters.splice(index, 1);
    setFormData({ ...formData, chapters: newChapters });
  };

  const handleAddTopicToChapterInForm = (chapterIndex: number) => {
    if (!newTopic.trim()) return;
    const newChapters = [...formData.chapters];

    if (newChapters[chapterIndex].topics.some(t => t.name === newTopic.trim())) {
      toast.error('Topic already exists in this chapter');
      return;
    }

    newChapters[chapterIndex].topics.push({
      id: `new-topic-${Date.now()}`,
      name: newTopic.trim()
    });

    setFormData({ ...formData, chapters: newChapters });
    setNewTopic('');
  };

  const handleRemoveTopicFromChapterInForm = (chapterIndex: number, topicIndex: number) => {
    const newChapters = [...formData.chapters];
    newChapters[chapterIndex].topics.splice(topicIndex, 1);
    setFormData({ ...formData, chapters: newChapters });
  };

  const handleUpdateChapterName = (index: number, newName: string) => {
    if (!newName.trim()) return;
    const newChapters = [...formData.chapters];
    newChapters[index].name = newName.trim();
    setFormData({ ...formData, chapters: newChapters });
    setEditingChapterIndex(null);
  };

  const handleUpdateTopicName = (chapterIndex: number, topicIndex: number, newName: string) => {
    if (!newName.trim()) return;
    const newChapters = [...formData.chapters];
    newChapters[chapterIndex].topics[topicIndex].name = newName.trim();
    setFormData({ ...formData, chapters: newChapters });
    setEditingTopic(null);
  };

  const handleSubmitSubject = async () => {
    if (!formData.name.trim()) {
      toast.error('Subject name cannot be empty');
      return;
    }

    // Convert form data back to API format
    const apiData = {
      name: formData.name,
      chapters: formData.chapters.map(ch => ({
        name: ch.name,
        topics: ch.topics.map(t => t.name)
      }))
    };

    try {
      setSubmitting(true);
      if (editingSubject) {
        await api.put(`/subjects/${editingSubject._id}`, apiData);
        toast.success('Subject updated successfully');
      } else {
        await api.post('/subjects', apiData);
        toast.success('Subject created successfully');
      }
      await fetchSubjects();
      handleCloseSheet();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save subject');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete handling
  const handleOpenDeleteDialog = (type: 'subject' | 'chapter' | 'topic', data: any) => {
    setDeleteConfirmation({ isOpen: true, type, data });
  };

  const handleCloseDeleteDialog = () => {
    setDeleteConfirmation({ ...deleteConfirmation, isOpen: false });
  };

  const handleConfirmDelete = async () => {
    const { type, data } = deleteConfirmation;

    if (type === 'subject') {
      try {
        setSubmitting(true);
        await api.delete(`/subjects/${data._id}`);
        await fetchSubjects();
        toast.success('Subject deleted successfully');
        handleCloseDeleteDialog();
      } catch (err: any) {
        toast.error(err.response?.data?.message || `Failed to delete ${type}`);
      } finally {
        setSubmitting(false);
      }
    } else {
      if (isSheetOpen) {
        if (type === 'chapter') {
          handleRemoveChapterFromForm(data.chapterIndex);
        } else if (type === 'topic') {
          handleRemoveTopicFromChapterInForm(data.chapterIndex, data.topicIndex);
        }
        handleCloseDeleteDialog();
      }
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent, type: 'chapter' | 'topic', chapterIndex?: number) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      if (type === 'chapter') {
        const oldIndex = formData.chapters.findIndex((ch) => ch.id === active.id);
        const newIndex = formData.chapters.findIndex((ch) => ch.id === over?.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newChapters = arrayMove(formData.chapters, oldIndex, newIndex);
          setFormData({ ...formData, chapters: newChapters });
        }
      } else if (type === 'topic' && typeof chapterIndex === 'number') {
        const chapter = formData.chapters[chapterIndex];
        const oldIndex = chapter.topics.findIndex((t) => t.id === active.id);
        const newIndex = chapter.topics.findIndex((t) => t.id === over?.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newTopics = arrayMove(chapter.topics, oldIndex, newIndex);
          const newChapters = [...formData.chapters];
          newChapters[chapterIndex].topics = newTopics;
          setFormData({ ...formData, chapters: newChapters });
        }
      }
    }
  };

  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">Loading subjects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subjects, Chapters & Topics</h1>
          <p className="text-muted-foreground mt-1">Manage subjects, chapters, and their topics</p>
        </div>
        <Button onClick={() => handleOpenSheet()} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Subject
        </Button>
      </div>

      {/* Search Bar */}
      <div className="bg-card p-4 rounded-lg shadow-sm border">
        <Input
          placeholder="Search subjects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSubjects.length === 0 ? (
          <div className="col-span-full bg-card p-8 rounded-lg shadow-sm border text-center text-muted-foreground">
            No subjects found
          </div>
        ) : (
          filteredSubjects.map((subject) => (
            <div key={subject._id} className="bg-card rounded-lg shadow-md border hover:shadow-lg transition-shadow">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDeleteDialog('subject', subject)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <h3 className="font-bold text-xl mb-2">{subject.name}</h3>
                <div className="flex gap-3 text-sm text-muted-foreground mb-4">
                  <span>{subject.chapters.length} chapter{subject.chapters.length !== 1 ? 's' : ''}</span>
                  <span>•</span>
                  <span>
                    {subject.chapters.reduce((sum, ch) => sum + ch.topics.length, 0)} topic{subject.chapters.reduce((sum, ch) => sum + ch.topics.length, 0) !== 1 ? 's' : ''}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenSheet(subject)}
                  className="w-full gap-2"
                >
                  <FolderOpen className="h-4 w-4" />
                  View & Edit Chapters
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sheet for Add/Edit/View */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent
          className="w-full sm:max-w-2xl overflow-y-auto"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <SheetHeader>
            <SheetTitle>{editingSubject ? 'Edit Subject' : 'Add New Subject'}</SheetTitle>
            <SheetDescription>
              {editingSubject ? 'Manage chapters and topics for this subject.' : 'Create a new subject and add chapters.'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-6 px-4">
            <div>
              <label className="block text-sm font-medium mb-1">Subject Name</label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Mathematics"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Chapters & Topics</label>
                <span className="text-xs text-muted-foreground">Drag to reorder</span>
              </div>

              <div className="space-y-3 mb-3">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(e) => handleDragEnd(e, 'chapter')}
                >
                  <SortableContext
                    items={formData.chapters.map((ch) => ch.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {formData.chapters.map((chapter, chapterIndex) => (
                      <SortableChapterItem
                        key={chapter.id}
                        id={chapter.id}
                        chapter={chapter}
                        chapterIndex={chapterIndex}
                        subjectId="temp-id" // Not used for local state
                        editingChapterIndex={editingChapterIndex}
                        editingChapterValue={editingChapterValue}
                        setEditingChapterValue={setEditingChapterValue}
                        handleSaveChapter={(_: string, idx: number, __: string[]) => handleUpdateChapterName(idx, editingChapterValue)}
                        setEditingChapterIndex={setEditingChapterIndex}
                        toggleExpandChapter={(_: string, idx: number) => setExpandedChapterIndex(expandedChapterIndex === idx ? null : idx)}
                        handleStartEditChapter={(idx: number, val: string) => {
                          setEditingChapterIndex(idx);
                          setEditingChapterValue(val);
                        }}
                        handleDeleteChapter={(_: string, idx: number) => handleOpenDeleteDialog('chapter', { chapterIndex: idx })}
                        expandedChapter={expandedChapterIndex === chapterIndex ? { subjectId: 'temp-id', chapterIndex } : null}
                      >
                        {/* Topics List */}
                        {expandedChapterIndex === chapterIndex && (
                          <div className="border-t bg-muted/30 p-3">
                            <h5 className="font-medium mb-2 text-xs flex items-center gap-1">
                              <List className="h-3 w-3" />
                              Topics
                            </h5>

                            <div className="space-y-1.5 mb-2">
                              <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={(e) => handleDragEnd(e, 'topic', chapterIndex)}
                              >
                                <SortableContext
                                  items={chapter.topics.map((t) => t.id)}
                                  strategy={verticalListSortingStrategy}
                                >
                                  {chapter.topics.map((topic, topicIndex) => (
                                    <SortableTopicItem
                                      key={topic.id}
                                      id={topic.id}
                                      topic={topic.name}
                                      topicIndex={topicIndex}
                                      chapterIndex={chapterIndex}
                                      subjectId="temp-id"
                                      editingTopic={editingTopic}
                                      editingTopicValue={editingTopicValue}
                                      setEditingTopicValue={setEditingTopicValue}
                                      handleSaveTopic={(_: string, cIdx: number, tIdx: number) => handleUpdateTopicName(cIdx, tIdx, editingTopicValue)}
                                      setEditingTopic={setEditingTopic}
                                      handleStartEditTopic={(cIdx: number, tIdx: number, val: string) => {
                                        setEditingTopic({ chapterIndex: cIdx, topicIndex: tIdx });
                                        setEditingTopicValue(val);
                                      }}
                                      handleDeleteTopic={(_: string, cIdx: number, tIdx: number) => handleOpenDeleteDialog('topic', { chapterIndex: cIdx, topicIndex: tIdx })}
                                    />
                                  ))}
                                </SortableContext>
                              </DndContext>
                            </div>

                            {/* Add Topic Input */}
                            <div className="flex gap-1.5">
                              <Input
                                placeholder="Add topic..."
                                value={newTopic}
                                onChange={(e) => setNewTopic(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddTopicToChapterInForm(chapterIndex);
                                }}
                                className="flex-1 h-7 text-xs"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleAddTopicToChapterInForm(chapterIndex)}
                                disabled={!newTopic.trim()}
                                className="gap-1 h-7 text-xs"
                              >
                                <Plus className="h-3 w-3" />
                                Add
                              </Button>
                            </div>
                          </div>
                        )}
                      </SortableChapterItem>
                    ))}
                  </SortableContext>
                </DndContext>

                {formData.chapters.length === 0 && (
                  <p className="text-sm text-muted-foreground italic text-center py-4">No chapters added yet</p>
                )}
              </div>

              {/* Add New Chapter */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add new chapter..."
                  value={newChapterName}
                  onChange={(e) => setNewChapterName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddChapterToForm();
                  }}
                />
                <Button
                  onClick={handleAddChapterToForm}
                  disabled={!newChapterName.trim()}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Add Chapter
                </Button>
              </div>
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={handleCloseSheet} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmitSubject} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmation.isOpen} onOpenChange={(open) => !open && handleCloseDeleteDialog()}>
        <AlertDialogContent className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmation.type === 'subject' && "This will permanently delete the subject and all its chapters and topics."}
              {deleteConfirmation.type === 'chapter' && "This will remove the chapter and its topics from this subject."}
              {deleteConfirmation.type === 'topic' && "This will remove the topic from the chapter."}
              <br />
              {deleteConfirmation.type === 'subject' && "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
