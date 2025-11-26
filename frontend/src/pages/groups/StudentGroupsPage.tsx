import { useEffect, useState } from 'react';
import { UsersRound, Plus, Edit, Trash2, GraduationCap, BookOpen, Search, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
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

  // Sheet States
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [viewingGroup, setViewingGroup] = useState<Group | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);

  const [formData, setFormData] = useState<GroupFormData>({
    name: '',
    description: '',
    subject: '',
    students: [],
    teachers: [],
  });

  // Search states for Sheet
  const [studentSearch, setStudentSearch] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');

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

  const handleOpenSheet = (group?: Group) => {
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
    setStudentSearch('');
    setTeacherSearch('');
    setIsSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setEditingGroup(null);
    setError('');
  };

  const handleOpenViewSheet = (group: Group) => {
    setViewingGroup(group);
    setIsViewSheetOpen(true);
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

  const handleSubmitGroup = async () => {
    if (!formData.name.trim()) {
      toast.error('Group name is required');
      return;
    }
    if (!formData.subject) {
      toast.error('Subject is required');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      if (editingGroup) {
        await api.put(`/groups/${editingGroup._id}`, formData);
      } else {
        await api.post('/groups', formData);
      }

      await fetchGroups();
      handleCloseSheet();
      toast.success(editingGroup ? 'Group updated successfully' : 'Group created successfully');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to save group';
      setError(errorMessage);
      toast.error(errorMessage);
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
      toast.success('Group deleted successfully');
    } catch (err: any) {
      if (err.response?.status === 409 && err.response?.data?.dependencies) {
        const dependencies = err.response.data.dependencies;
        setError(`Cannot delete group: ${dependencies.join('. ')}`);
        toast.error('Cannot delete group due to dependencies');
      } else {
        const errorMessage = err.response?.data?.message || 'Failed to delete group';
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const filteredTeachers = teachers.filter(t =>
    t.name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
    t.email.toLowerCase().includes(teacherSearch.toLowerCase())
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
          <Button onClick={() => handleOpenSheet()} className="gap-2">
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
            <div key={group._id} className="bg-card rounded-lg shadow-md border hover:shadow-lg transition-shadow flex flex-col">
              <div className="p-5 flex-1">
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
                        onClick={() => handleOpenSheet(group)}
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

                <div className="mb-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                    {group.subject?.name || 'Unknown Subject'}
                  </span>
                </div>

                <div className="space-y-2 mt-auto">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Students</span>
                    <span className="font-semibold">{group.students.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Teachers</span>
                    <span className="font-semibold">{group.teachers?.length || 0}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 pt-0 mt-auto">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => handleOpenViewSheet(group)}
                >
                  <Eye className="h-4 w-4" />
                  View Details
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Group Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent
          className="w-full sm:max-w-2xl overflow-y-auto"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <SheetHeader>
            <SheetTitle>{editingGroup ? 'Edit Group' : 'Create New Group'}</SheetTitle>
            <SheetDescription>
              {editingGroup ? 'Update group information.' : 'Create a new student group.'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-6 px-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Group Name *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Class A - Batch 2024"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., First year students - Morning batch"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Select
                  value={formData.subject}
                  onValueChange={(value) => setFormData({ ...formData, subject: value })}
                >
                  <SelectTrigger className="mt-1.5">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Students Selection */}
                <div className="space-y-2">
                  <Label>Students ({formData.students.length} selected)</Label>
                  <div className="border rounded-md flex flex-col h-[300px]">
                    <div className="p-2 border-b bg-muted/30">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search students..."
                          className="pl-8 h-9"
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                      {filteredStudents.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic text-center py-4">No students found</p>
                      ) : (
                        filteredStudents.map((student) => (
                          <div
                            key={student._id}
                            className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded cursor-pointer transition-colors"
                            onClick={() => handleToggleStudent(student._id)}
                          >
                            <Checkbox
                              checked={formData.students.includes(student._id)}
                              onCheckedChange={() => handleToggleStudent(student._id)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{student.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Teachers Selection */}
                <div className="space-y-2">
                  <Label>Teachers ({formData.teachers.length} selected)</Label>
                  <div className="border rounded-md flex flex-col h-[300px]">
                    <div className="p-2 border-b bg-muted/30">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search teachers..."
                          className="pl-8 h-9"
                          value={teacherSearch}
                          onChange={(e) => setTeacherSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                      {filteredTeachers.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic text-center py-4">No teachers found</p>
                      ) : (
                        filteredTeachers.map((teacher) => (
                          <div
                            key={teacher._id}
                            className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded cursor-pointer transition-colors"
                            onClick={() => handleToggleTeacher(teacher._id)}
                          >
                            <Checkbox
                              checked={formData.teachers.includes(teacher._id)}
                              onCheckedChange={() => handleToggleTeacher(teacher._id)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <GraduationCap className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                <p className="text-sm font-medium truncate">{teacher.name}</p>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{teacher.email}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={handleCloseSheet} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmitGroup} disabled={submitting}>
              {submitting ? 'Saving...' : editingGroup ? 'Update Group' : 'Create Group'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* View Details Sheet */}
      <Sheet open={isViewSheetOpen} onOpenChange={setIsViewSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Group Details</SheetTitle>
            <SheetDescription>
              View students and teachers assigned to this group.
            </SheetDescription>
          </SheetHeader>

          {viewingGroup && (
            <div className="space-y-6 py-6 px-4">
              <div>
                <h3 className="text-lg font-bold">{viewingGroup.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                    <BookOpen className="h-3 w-3" />
                    {viewingGroup.subject.name}
                  </span>
                </div>
                {viewingGroup.description && (
                  <p className="text-sm text-muted-foreground mt-2">{viewingGroup.description}</p>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-blue-600" />
                    Teachers ({viewingGroup.teachers?.length || 0})
                  </h4>
                  <div className="border rounded-md divide-y">
                    {viewingGroup.teachers && viewingGroup.teachers.length > 0 ? (
                      viewingGroup.teachers.map((teacher) => (
                        <div key={teacher._id} className="p-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{teacher.name}</p>
                            <p className="text-xs text-muted-foreground">{teacher.email}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="p-4 text-sm text-muted-foreground italic text-center">No teachers assigned</p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <UsersRound className="h-4 w-4 text-green-600" />
                    Students ({viewingGroup.students.length})
                  </h4>
                  <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto">
                    {viewingGroup.students.length > 0 ? (
                      viewingGroup.students.map((student) => (
                        <div key={student._id} className="p-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{student.name}</p>
                            <p className="text-xs text-muted-foreground">{student.email}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="p-4 text-sm text-muted-foreground italic text-center">No students assigned</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this group? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deletingGroup && (
            <div className="bg-muted p-4 rounded-md">
              <p className="font-medium">{deletingGroup.name}</p>
              <p className="text-sm text-muted-foreground">
                {deletingGroup.students.length} student{deletingGroup.students.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseDeleteDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              className="bg-red-600 hover:bg-red-700"
              disabled={submitting}
            >
              {submitting ? 'Deleting...' : 'Delete Group'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
