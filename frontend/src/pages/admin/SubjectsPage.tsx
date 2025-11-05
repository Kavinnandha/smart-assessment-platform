import { useEffect, useState } from 'react';
import { BookOpen, Plus, Edit, Trash2, FolderOpen, X, Check, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import api from '@/lib/api';

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

interface SubjectFormData {
  name: string;
  chapters: Chapter[];
}

// Separate component for chapter form item to avoid hook issues
function ChapterFormItem({ 
  chapter, 
  chapterIndex, 
  onRemoveChapter, 
  onAddTopic, 
  onRemoveTopic 
}: {
  chapter: Chapter;
  chapterIndex: number;
  onRemoveChapter: (index: number) => void;
  onAddTopic: (chapterIndex: number, topicName: string) => void;
  onRemoveTopic: (chapterIndex: number, topicIndex: number) => void;
}) {
  const [newTopicInput, setNewTopicInput] = useState('');

  return (
    <div className="border rounded-md p-3 bg-gray-50">
      {/* Chapter header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="flex-1 font-medium text-sm">{chapter.name}</span>
        <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded">
          {chapter.topics.length} topics
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onRemoveChapter(chapterIndex)}
          className="text-red-600 h-7 px-2"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Topics list */}
      {chapter.topics.length > 0 && (
        <div className="space-y-1 mb-2">
          {chapter.topics.map((topic, topicIndex) => (
            <div key={topicIndex} className="flex items-center gap-2 bg-white p-1.5 rounded text-sm">
              <span className="flex-1">{topic}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onRemoveTopic(chapterIndex, topicIndex)}
                className="h-6 w-6 p-0 text-red-600"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add topic to chapter */}
      <div className="flex gap-2">
        <Input
          value={newTopicInput}
          onChange={(e) => setNewTopicInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (newTopicInput.trim()) {
                onAddTopic(chapterIndex, newTopicInput);
                setNewTopicInput('');
              }
            }
          }}
          placeholder="Add topic..."
          className="h-7 text-sm"
        />
        <Button
          type="button"
          size="sm"
          onClick={() => {
            if (newTopicInput.trim()) {
              onAddTopic(chapterIndex, newTopicInput);
              setNewTopicInput('');
            }
          }}
          disabled={!newTopicInput.trim()}
          className="h-7 px-2"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [expandedChapter, setExpandedChapter] = useState<{subjectId: string, chapterIndex: number} | null>(null);
  
  const [formData, setFormData] = useState<SubjectFormData>({
    name: '',
    chapters: [],
  });
  
  // Chapter management
  const [newChapterName, setNewChapterName] = useState('');
  const [editingChapterIndex, setEditingChapterIndex] = useState<number | null>(null);
  const [editingChapterValue, setEditingChapterValue] = useState('');
  
  // Topic management
  const [newTopic, setNewTopic] = useState('');
  const [editingTopic, setEditingTopic] = useState<{chapterIndex: number, topicIndex: number} | null>(null);
  const [editingTopicValue, setEditingTopicValue] = useState('');
  
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const response = await api.get('/subjects');
      setSubjects(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch subjects');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSubjectDialog = (subject?: Subject) => {
    if (subject) {
      setEditingSubject(subject);
      setFormData({
        name: subject.name,
        chapters: JSON.parse(JSON.stringify(subject.chapters)), // Deep copy
      });
    } else {
      setEditingSubject(null);
      setFormData({
        name: '',
        chapters: [],
      });
    }
    setNewChapterName('');
    setError('');
    setIsSubjectDialogOpen(true);
  };

  const handleCloseSubjectDialog = () => {
    setIsSubjectDialogOpen(false);
    setEditingSubject(null);
    setNewChapterName('');
    setError('');
  };

  // Chapter management in form
  const handleAddChapterToForm = () => {
    if (!newChapterName.trim()) return;
    
    if (formData.chapters.some(ch => ch.name === newChapterName.trim())) {
      setError('Chapter already exists');
      return;
    }

    setFormData({
      ...formData,
      chapters: [...formData.chapters, { name: newChapterName.trim(), topics: [] }],
    });
    setNewChapterName('');
    setError('');
  };

  const handleRemoveChapterFromForm = (index: number) => {
    setFormData({
      ...formData,
      chapters: formData.chapters.filter((_, i) => i !== index),
    });
  };

  // Topic management in form
  const handleAddTopicToChapterInForm = (chapterIndex: number, topicName: string) => {
    if (!topicName.trim()) return;

    const updatedChapters = [...formData.chapters];
    if (updatedChapters[chapterIndex].topics.includes(topicName.trim())) {
      setError('Topic already exists in this chapter');
      return;
    }

    updatedChapters[chapterIndex].topics.push(topicName.trim());
    setFormData({ ...formData, chapters: updatedChapters });
    setError('');
  };

  const handleRemoveTopicFromChapterInForm = (chapterIndex: number, topicIndex: number) => {
    const updatedChapters = [...formData.chapters];
    updatedChapters[chapterIndex].topics.splice(topicIndex, 1);
    setFormData({ ...formData, chapters: updatedChapters });
  };

  const handleSubmitSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (editingSubject) {
        await api.put(`/subjects/${editingSubject._id}`, formData);
      } else {
        await api.post('/subjects', formData);
      }

      await fetchSubjects();
      handleCloseSubjectDialog();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save subject');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDeleteDialog = (subject: Subject) => {
    setDeletingSubject(subject);
    setIsDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setDeletingSubject(null);
  };

  const handleDeleteSubject = async () => {
    if (!deletingSubject) return;

    try {
      setSubmitting(true);
      await api.delete(`/subjects/${deletingSubject._id}`);
      await fetchSubjects();
      handleCloseDeleteDialog();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete subject');
    } finally {
      setSubmitting(false);
    }
  };

  // Inline chapter operations
  const handleAddChapter = async (subjectId: string) => {
    if (!newChapterName.trim()) return;

    try {
      await api.post(`/subjects/${subjectId}/chapters`, { name: newChapterName.trim(), topics: [] });
      setNewChapterName('');
      await fetchSubjects();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add chapter');
    }
  };

  const handleStartEditChapter = (index: number, currentValue: string) => {
    setEditingChapterIndex(index);
    setEditingChapterValue(currentValue);
  };

  const handleSaveChapter = async (subjectId: string, chapterIndex: number, topics: string[]) => {
    if (editingChapterIndex === null || !editingChapterValue.trim()) return;

    try {
      await api.put(`/subjects/${subjectId}/chapters/${chapterIndex}`, {
        name: editingChapterValue.trim(),
        topics: topics
      });
      setEditingChapterIndex(null);
      setEditingChapterValue('');
      await fetchSubjects();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update chapter');
    }
  };

  const handleDeleteChapter = async (subjectId: string, chapterIndex: number) => {
    if (!window.confirm('Are you sure you want to delete this chapter and all its topics?')) return;

    try {
      await api.delete(`/subjects/${subjectId}/chapters/${chapterIndex}`);
      await fetchSubjects();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete chapter');
    }
  };

  // Inline topic operations
  const handleAddTopic = async (subjectId: string, chapterIndex: number) => {
    if (!newTopic.trim()) return;

    try {
      await api.post(`/subjects/${subjectId}/chapters/${chapterIndex}/topics`, { topic: newTopic.trim() });
      setNewTopic('');
      await fetchSubjects();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add topic');
    }
  };

  const handleStartEditTopic = (chapterIndex: number, topicIndex: number, currentValue: string) => {
    setEditingTopic({ chapterIndex, topicIndex });
    setEditingTopicValue(currentValue);
  };

  const handleSaveTopic = async (subjectId: string, chapterIndex: number, topicIndex: number) => {
    if (!editingTopic || !editingTopicValue.trim()) return;

    try {
      await api.put(`/subjects/${subjectId}/chapters/${chapterIndex}/topics/${topicIndex}`, {
        topic: editingTopicValue.trim()
      });
      setEditingTopic(null);
      setEditingTopicValue('');
      await fetchSubjects();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update topic');
    }
  };

  const handleDeleteTopic = async (subjectId: string, chapterIndex: number, topicIndex: number) => {
    try {
      await api.delete(`/subjects/${subjectId}/chapters/${chapterIndex}/topics/${topicIndex}`);
      await fetchSubjects();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete topic');
    }
  };

  const toggleExpandSubject = (subjectId: string) => {
    setExpandedSubject(expandedSubject === subjectId ? null : subjectId);
    setEditingChapterIndex(null);
    setNewChapterName('');
    setExpandedChapter(null);
  };

  const toggleExpandChapter = (subjectId: string, chapterIndex: number) => {
    const key = { subjectId, chapterIndex };
    if (expandedChapter?.subjectId === subjectId && expandedChapter?.chapterIndex === chapterIndex) {
      setExpandedChapter(null);
    } else {
      setExpandedChapter(key);
    }
    setNewTopic('');
    setEditingTopic(null);
  };

  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Loading subjects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subjects, Chapters & Topics</h1>
          <p className="text-gray-600 mt-1">Manage subjects, chapters, and their topics</p>
        </div>
        <Button onClick={() => handleOpenSubjectDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Subject
        </Button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
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
          <div className="col-span-full bg-white p-8 rounded-lg shadow-sm border text-center text-gray-500">
            No subjects found
          </div>
        ) : (
          filteredSubjects.map((subject) => (
            <div key={subject._id} className="bg-white rounded-lg shadow-md border hover:shadow-lg transition-shadow">
              {/* Subject Card Header */}
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <BookOpen className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenSubjectDialog(subject)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4 text-gray-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDeleteDialog(subject)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <h3 className="font-bold text-xl mb-2">{subject.name}</h3>
                <div className="flex gap-3 text-sm text-gray-600 mb-4">
                  <span>{subject.chapters.length} chapter{subject.chapters.length !== 1 ? 's' : ''}</span>
                  <span>•</span>
                  <span>
                    {subject.chapters.reduce((sum, ch) => sum + ch.topics.length, 0)} topic{subject.chapters.reduce((sum, ch) => sum + ch.topics.length, 0) !== 1 ? 's' : ''}
                  </span>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleExpandSubject(subject._id)}
                  className="w-full gap-2"
                >
                  <FolderOpen className="h-4 w-4" />
                  {expandedSubject === subject._id ? 'Hide Chapters' : 'View Chapters'}
                </Button>
              </div>

              {/* Chapters List (Expandable) */}
              {expandedSubject === subject._id && (
                <div className="border-t px-5 py-4 bg-gray-50">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm text-gray-700">
                    <FolderOpen className="h-4 w-4" />
                    Chapters
                  </h4>
                  
                  {/* Existing Chapters */}
                  <div className="space-y-2 mb-3 max-h-96 overflow-y-auto">
                    {subject.chapters.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No chapters yet</p>
                    ) : (
                      subject.chapters.map((chapter, chapterIndex) => (
                        <div key={chapterIndex} className="border rounded-md bg-white">
                          <div className="flex items-center gap-2 p-2.5">
                            {editingChapterIndex === chapterIndex ? (
                              <>
                                <Input
                                  value={editingChapterValue}
                                  onChange={(e) => setEditingChapterValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveChapter(subject._id, chapterIndex, chapter.topics);
                                    if (e.key === 'Escape') setEditingChapterIndex(null);
                                  }}
                                  className="flex-1 h-8"
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveChapter(subject._id, chapterIndex, chapter.topics)}
                                  className="h-8 px-2"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingChapterIndex(null)}
                                  className="h-8 px-2"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{chapter.name}</span>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                      {chapter.topics.length} topic{chapter.topics.length !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggleExpandChapter(subject._id, chapterIndex)}
                                  className="h-7 w-7 p-0"
                                  title="View topics"
                                >
                                  <List className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleStartEditChapter(chapterIndex, chapter.name)}
                                  className="h-7 w-7 p-0"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteChapter(subject._id, chapterIndex)}
                                  className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>

                          {/* Topics List (Nested Expandable) */}
                          {expandedChapter?.subjectId === subject._id && 
                           expandedChapter?.chapterIndex === chapterIndex && (
                            <div className="border-t bg-gray-50 p-3">
                              <h5 className="font-medium mb-2 text-xs text-gray-700 flex items-center gap-1">
                                <List className="h-3 w-3" />
                                Topics
                              </h5>
                              
                              <div className="space-y-1.5 mb-2 max-h-40 overflow-y-auto">
                                {chapter.topics.length === 0 ? (
                                  <p className="text-xs text-gray-500 italic">No topics yet</p>
                                ) : (
                                  chapter.topics.map((topic, topicIndex) => (
                                    <div key={topicIndex} className="flex items-center gap-1.5 bg-white p-1.5 rounded text-xs border">
                                      {editingTopic?.chapterIndex === chapterIndex && 
                                       editingTopic?.topicIndex === topicIndex ? (
                                        <>
                                          <Input
                                            value={editingTopicValue}
                                            onChange={(e) => setEditingTopicValue(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') handleSaveTopic(subject._id, chapterIndex, topicIndex);
                                              if (e.key === 'Escape') setEditingTopic(null);
                                            }}
                                            className="flex-1 h-6 text-xs"
                                            autoFocus
                                          />
                                          <Button
                                            size="sm"
                                            onClick={() => handleSaveTopic(subject._id, chapterIndex, topicIndex)}
                                            className="h-6 px-1.5"
                                          >
                                            <Check className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setEditingTopic(null)}
                                            className="h-6 px-1.5"
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <span className="flex-1">{topic}</span>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleStartEditTopic(chapterIndex, topicIndex, topic)}
                                            className="h-6 w-6 p-0"
                                          >
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDeleteTopic(subject._id, chapterIndex, topicIndex)}
                                            className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>

                              {/* Add Topic Input */}
                              <div className="flex gap-1.5">
                                <Input
                                  placeholder="Add topic..."
                                  value={newTopic}
                                  onChange={(e) => setNewTopic(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddTopic(subject._id, chapterIndex);
                                  }}
                                  className="flex-1 h-7 text-xs"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleAddTopic(subject._id, chapterIndex)}
                                  disabled={!newTopic.trim()}
                                  className="gap-1 h-7 text-xs"
                                >
                                  <Plus className="h-3 w-3" />
                                  Add
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add New Chapter */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add new chapter..."
                      value={newChapterName}
                      onChange={(e) => setNewChapterName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddChapter(subject._id);
                      }}
                      className="flex-1 h-9"
                    />
                    <Button
                      onClick={() => handleAddChapter(subject._id)}
                      disabled={!newChapterName.trim()}
                      size="sm"
                      className="gap-1.5 h-9"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Subject Dialog */}
      <Dialog open={isSubjectDialogOpen} onOpenChange={setIsSubjectDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSubject ? 'Edit Subject' : 'Add New Subject'}</DialogTitle>
            <DialogDescription>
              {editingSubject ? 'Update subject information with chapters and topics.' : 'Create a new subject with chapters and topics.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitSubject} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
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
              <label className="block text-sm font-medium mb-2">Chapters & Topics</label>
              
              {/* Existing chapters in form */}
              <div className="space-y-3 mb-3 max-h-96 overflow-y-auto">
                {formData.chapters.map((chapter, chapterIndex) => (
                  <ChapterFormItem
                    key={chapterIndex}
                    chapter={chapter}
                    chapterIndex={chapterIndex}
                    onRemoveChapter={handleRemoveChapterFromForm}
                    onAddTopic={handleAddTopicToChapterInForm}
                    onRemoveTopic={handleRemoveTopicFromChapterInForm}
                  />
                ))}
                {formData.chapters.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No chapters added yet</p>
                )}
              </div>
              
              {/* Add new chapter */}
              <div className="flex gap-2">
                <Input
                  value={newChapterName}
                  onChange={(e) => setNewChapterName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddChapterToForm();
                    }
                  }}
                  placeholder="Add chapter name..."
                />
                <Button
                  type="button"
                  onClick={handleAddChapterToForm}
                  disabled={!newChapterName.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseSubjectDialog}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editingSubject ? 'Update Subject' : 'Create Subject'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Subject</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this subject? This will also delete all its chapters and topics. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deletingSubject && (
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="font-medium">{deletingSubject.name}</p>
              <p className="text-sm text-gray-600">
                {deletingSubject.chapters.length} chapter{deletingSubject.chapters.length !== 1 ? 's' : ''} • {' '}
                {deletingSubject.chapters.reduce((sum, ch) => sum + ch.topics.length, 0)} topic{deletingSubject.chapters.reduce((sum, ch) => sum + ch.topics.length, 0) !== 1 ? 's' : ''}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseDeleteDialog}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteSubject}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? 'Deleting...' : 'Delete Subject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
