import { useEffect, useState } from 'react';
import { UsersRound, Plus, Edit, Trash2, GraduationCap, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Student {
  _id: string;
  name: string;
  email: string;
}

interface Teacher {
  _id: string;
  name: string;
  email: string;
}

interface Subject {
  _id: string;
  name: string;
}

interface Group {
  _id: string;
  name: string;
  description: string;
  subject: Subject;
  students: Student[];
  teachers: Teacher[];
  createdAt: string;
  updatedAt: string;
}

interface GroupFormData {
  name: string;
  description: string;
  subject: string;
  students: string[];
  teachers: string[];
}

export default function StudentGroupsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);
  const [formData, setFormData] = useState<GroupFormData>({
    name: '',
    description: '',
    subject: '',
    students: [],
    teachers: [],
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchGroups();
    fetchStudents();
    fetchTeachers();
    fetchSubjects();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await api.get('/groups');
      setGroups(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get('/users?role=student');
      setStudents(response.data.users || []);
    } catch (err: any) {
      console.error('Failed to fetch students:', err);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await api.get('/users?role=teacher');
      setTeachers(response.data.users || []);
    } catch (err: any) {
      console.error('Failed to fetch teachers:', err);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await api.get('/subjects');
      setSubjects(response.data || []);
    } catch (err: any) {
      console.error('Failed to fetch subjects:', err);
    }
  };

  const handleOpenGroupDialog = (group?: Group) => {
    if (group) {
      setEditingGroup(group);
      setFormData({
        name: group.name,
        description: group.description || '',
        subject: group.subject._id,
        students: group.students.map(s => s._id),
        teachers: group.teachers?.map(t => t._id) || [],
      });
    } else {
      setEditingGroup(null);
      setFormData({
        name: '',
        description: '',
        subject: '',
        students: [],
        teachers: [],
      });
    }
    setError('');
    setIsGroupDialogOpen(true);
  };

  const handleCloseGroupDialog = () => {
    setIsGroupDialogOpen(false);
    setEditingGroup(null);
    setError('');
  };

  const handleToggleStudent = (studentId: string) => {
    setFormData(prev => ({
      ...prev,
      students: prev.students.includes(studentId)
        ? prev.students.filter(id => id !== studentId)
        : [...prev.students, studentId]
    }));
  };

  const handleToggleTeacher = (teacherId: string) => {
    setFormData(prev => ({
      ...prev,
      teachers: prev.teachers.includes(teacherId)
        ? prev.teachers.filter(id => id !== teacherId)
        : [...prev.teachers, teacherId]
    }));
  };

  const handleSubmitGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (editingGroup) {
        await api.put(`/groups/${editingGroup._id}`, formData);
      } else {
        await api.post('/groups', formData);
      }

      await fetchGroups();
      handleCloseGroupDialog();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save group');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDeleteDialog = (group: Group) => {
    setDeletingGroup(group);
    setIsDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setDeletingGroup(null);
  };

  const handleDeleteGroup = async () => {
    if (!deletingGroup) return;

    try {
      setSubmitting(true);
      await api.delete(`/groups/${deletingGroup._id}`);
      await fetchGroups();
      handleCloseDeleteDialog();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete group');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">Loading groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Student Groups</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? 'Organize students into groups for easier management' : 'View groups assigned to you'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => handleOpenGroupDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Group
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-card p-4 rounded-lg shadow-sm border">
        <Input
          placeholder="Search groups..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Groups Grid - Card View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGroups.length === 0 ? (
          <div className="col-span-full bg-card p-8 rounded-lg shadow-sm border text-center text-muted-foreground">
            No groups found
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div key={group._id} className="bg-card rounded-lg shadow-md border hover:shadow-lg transition-shadow">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <UsersRound className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenGroupDialog(group)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDeleteDialog(group)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                <h3 className="font-bold text-xl mb-2">{group.name}</h3>
                {group.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{group.description}</p>
                )}
                
                <div className="mb-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                    <BookOpen className="h-3 w-3" />
                    {group.subject.name}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Students</span>
                    <span className="font-semibold text-lg">{group.students.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Teachers</span>
                    <span className="font-semibold text-lg">{group.teachers?.length || 0}</span>
                  </div>
                </div>

                {group.teachers && group.teachers.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" />
                      Assigned Teachers:
                    </p>
                    <div className="space-y-1 max-h-20 overflow-y-auto">
                      {group.teachers.map((teacher) => (
                        <div key={teacher._id} className="text-sm text-blue-700 dark:text-blue-400 font-medium">
                          • {teacher.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {group.students.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Students in group:</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {group.students.slice(0, 3).map((student) => (
                        <div key={student._id} className="text-sm">
                          • {student.name}
                        </div>
                      ))}
                      {group.students.length > 3 && (
                        <div className="text-sm text-muted-foreground italic">
                          + {group.students.length - 3} more...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Group Dialog */}
      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'Edit Group' : 'Create New Group'}</DialogTitle>
            <DialogDescription>
              {editingGroup ? 'Update group information.' : 'Create a new student group.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitGroup} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            <div>
              <Label htmlFor="name">Group Name *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Class A - Batch 2024"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., First year students - Morning batch"
              />
            </div>

            <div>
              <Label htmlFor="subject">Subject *</Label>
              <select
                id="subject"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Select a subject</option>
                {subjects.map((subject) => (
                  <option key={subject._id} value={subject._id}>
                    {subject.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">Select the subject for this group</p>
            </div>

            <div>
              <Label>Students ({formData.students.length} selected)</Label>
              <div className="mt-2 border rounded-md p-4 max-h-64 overflow-y-auto space-y-2">
                {students.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No students available</p>
                ) : (
                  students.map((student) => (
                    <div
                      key={student._id}
                      className="flex items-center gap-3 p-2 hover:bg-muted/30 rounded cursor-pointer"
                      onClick={() => handleToggleStudent(student._id)}
                    >
                      <input
                        type="checkbox"
                        checked={formData.students.includes(student._id)}
                        onChange={() => handleToggleStudent(student._id)}
                        className="h-4 w-4 rounded border"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.email}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <Label>Assigned Teachers ({formData.teachers.length} selected)</Label>
              <div className="mt-2 border rounded-md p-4 max-h-64 overflow-y-auto space-y-2">
                {teachers.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No teachers available</p>
                ) : (
                  teachers.map((teacher) => (
                    <div
                      key={teacher._id}
                      className="flex items-center gap-3 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded cursor-pointer"
                      onClick={() => handleToggleTeacher(teacher._id)}
                    >
                      <input
                        type="checkbox"
                        checked={formData.teachers.includes(teacher._id)}
                        onChange={() => handleToggleTeacher(teacher._id)}
                        className="h-4 w-4 rounded border"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <p className="text-sm font-medium">{teacher.name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground ml-6">{teacher.email}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseGroupDialog}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editingGroup ? 'Update Group' : 'Create Group'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this group? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deletingGroup && (
            <div className="bg-muted/30 p-4 rounded-md">
              <p className="font-medium">{deletingGroup.name}</p>
              <p className="text-sm text-muted-foreground">
                {deletingGroup.students.length} student{deletingGroup.students.length !== 1 ? 's' : ''}
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
              onClick={handleDeleteGroup}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? 'Deleting...' : 'Delete Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
