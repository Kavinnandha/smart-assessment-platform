import { useEffect, useState } from 'react';
import { BookOpen, Plus, Edit, Trash2, FolderOpen, X, Check } from 'lucide-react';
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

interface Subject {
  _id: string;
  name: string;
  chapters: string[];
  createdAt: string;
  updatedAt: string;
}

interface SubjectFormData {
  name: string;
  chapters: string[];
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
  const [formData, setFormData] = useState<SubjectFormData>({
    name: '',
    chapters: [],
  });
  const [newChapter, setNewChapter] = useState('');
  const [editingChapterIndex, setEditingChapterIndex] = useState<number | null>(null);
  const [editingChapterValue, setEditingChapterValue] = useState('');
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
        chapters: [...subject.chapters],
      });
    } else {
      setEditingSubject(null);
      setFormData({
        name: '',
        chapters: [],
      });
    }
    setNewChapter('');
    setError('');
    setIsSubjectDialogOpen(true);
  };

  const handleCloseSubjectDialog = () => {
    setIsSubjectDialogOpen(false);
    setEditingSubject(null);
    setNewChapter('');
    setError('');
  };

  const handleAddChapterToForm = () => {
    if (!newChapter.trim()) return;
    
    if (formData.chapters.includes(newChapter.trim())) {
      setError('Chapter already exists');
      return;
    }

    setFormData({
      ...formData,
      chapters: [...formData.chapters, newChapter.trim()],
    });
    setNewChapter('');
    setError('');
  };

  const handleRemoveChapterFromForm = (index: number) => {
    setFormData({
      ...formData,
      chapters: formData.chapters.filter((_, i) => i !== index),
    });
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

  const handleAddChapter = async (subjectId: string) => {
    if (!newChapter.trim()) return;

    try {
      await api.post(`/subjects/${subjectId}/chapters`, { chapter: newChapter.trim() });
      setNewChapter('');
      await fetchSubjects();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add chapter');
    }
  };

  const handleStartEditChapter = (index: number, currentValue: string) => {
    setEditingChapterIndex(index);
    setEditingChapterValue(currentValue);
  };

  const handleSaveChapter = async (subjectId: string) => {
    if (editingChapterIndex === null || !editingChapterValue.trim()) return;

    try {
      await api.put(`/subjects/${subjectId}/chapters/${editingChapterIndex}`, {
        chapter: editingChapterValue.trim(),
      });
      setEditingChapterIndex(null);
      setEditingChapterValue('');
      await fetchSubjects();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update chapter');
    }
  };

  const handleDeleteChapter = async (subjectId: string, chapterIndex: number) => {
    try {
      await api.delete(`/subjects/${subjectId}/chapters/${chapterIndex}`);
      await fetchSubjects();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete chapter');
    }
  };

  const toggleExpandSubject = (subjectId: string) => {
    setExpandedSubject(expandedSubject === subjectId ? null : subjectId);
    setEditingChapterIndex(null);
    setNewChapter('');
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
          <h1 className="text-3xl font-bold">Subjects & Chapters</h1>
          <p className="text-gray-600 mt-1">Manage subjects and their chapters</p>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Subjects</p>
              <p className="text-2xl font-bold">{subjects.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FolderOpen className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Chapters</p>
              <p className="text-2xl font-bold">
                {subjects.reduce((acc, subject) => acc + subject.chapters.length, 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BookOpen className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Chapters/Subject</p>
              <p className="text-2xl font-bold">
                {subjects.length > 0
                  ? (subjects.reduce((acc, subject) => acc + subject.chapters.length, 0) / subjects.length).toFixed(1)
                  : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Subjects List */}
      <div className="space-y-3">
        {filteredSubjects.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-sm border text-center text-gray-500">
            No subjects found
          </div>
        ) : (
          filteredSubjects.map((subject) => (
            <div key={subject._id} className="bg-white rounded-lg shadow-sm border">
              {/* Subject Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <button
                    onClick={() => toggleExpandSubject(subject._id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  </button>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{subject.name}</h3>
                    <p className="text-sm text-gray-500">
                      {subject.chapters.length} chapter{subject.chapters.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleExpandSubject(subject._id)}
                    className="gap-1.5"
                  >
                    {expandedSubject === subject._id ? 'Collapse' : 'Expand'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenSubjectDialog(subject)}
                    className="gap-1.5"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDeleteDialog(subject)}
                    className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </div>

              {/* Chapters List (Expandable) */}
              {expandedSubject === subject._id && (
                <div className="border-t px-4 py-3 bg-gray-50">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" />
                    Chapters
                  </h4>
                  
                  {/* Existing Chapters */}
                  <div className="space-y-2 mb-3">
                    {subject.chapters.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No chapters yet</p>
                    ) : (
                      subject.chapters.map((chapter, index) => (
                        <div key={index} className="flex items-center gap-2 bg-white p-2 rounded border">
                          {editingChapterIndex === index ? (
                            <>
                              <Input
                                value={editingChapterValue}
                                onChange={(e) => setEditingChapterValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveChapter(subject._id);
                                  if (e.key === 'Escape') setEditingChapterIndex(null);
                                }}
                                className="flex-1"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={() => handleSaveChapter(subject._id)}
                                className="gap-1"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingChapterIndex(null)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <span className="flex-1 text-sm">{chapter}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStartEditChapter(index, chapter)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteChapter(subject._id, index)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add New Chapter */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add new chapter..."
                      value={newChapter}
                      onChange={(e) => setNewChapter(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddChapter(subject._id);
                      }}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => handleAddChapter(subject._id)}
                      disabled={!newChapter.trim()}
                      className="gap-1.5"
                    >
                      <Plus className="h-4 w-4" />
                      Add Chapter
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSubject ? 'Edit Subject' : 'Add New Subject'}</DialogTitle>
            <DialogDescription>
              {editingSubject ? 'Update subject information.' : 'Create a new subject with chapters.'}
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
              <label className="block text-sm font-medium mb-1">Chapters</label>
              <div className="space-y-2 mb-2">
                {formData.chapters.map((chapter, index) => (
                  <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                    <span className="flex-1 text-sm">{chapter}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemoveChapterFromForm(index)}
                      className="text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {formData.chapters.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No chapters added yet</p>
                )}
              </div>
              
              <div className="flex gap-2">
                <Input
                  value={newChapter}
                  onChange={(e) => setNewChapter(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddChapterToForm();
                    }
                  }}
                  placeholder="Add chapter..."
                />
                <Button
                  type="button"
                  onClick={handleAddChapterToForm}
                  disabled={!newChapter.trim()}
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
              Are you sure you want to delete this subject? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deletingSubject && (
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="font-medium">{deletingSubject.name}</p>
              <p className="text-sm text-gray-600">
                {deletingSubject.chapters.length} chapter{deletingSubject.chapters.length !== 1 ? 's' : ''}
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
