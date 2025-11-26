import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Clock, Users, FileText, Trash2, Eye, EyeOff, Edit, ClipboardList, PlayCircle, CheckCircle, Search, Filter, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

import { toast } from 'sonner';

interface Test {
  _id: string;
  title: string;
  subject: {
    _id: string;
    name: string;
  };
  duration: number;
  totalMarks: number;
  questions: any[];
  assignedTo: any[];
  scheduledDate?: string;
  deadline?: string;
  isPublished: boolean;
  showResultsImmediately?: boolean;
  resultsPublished?: boolean;
  createdAt: string;
}

interface Submission {
  _id: string;
  test: string;
  student: string;
  status: 'submitted' | 'evaluated' | 'pending';
  totalMarksObtained?: number;
}

const TestsPage = () => {
  const { user } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [testToDelete, setTestToDelete] = useState<string | null>(null);
  const [cascadeDeleteId, setCascadeDeleteId] = useState<string | null>(null);

  const [cascadeDeleteDialogOpen, setCascadeDeleteDialogOpen] = useState(false);

  // Search, Filter, Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all'); // all, published, draft
  const [sortBy, setSortBy] = useState<string>('createdAt'); // createdAt, title, duration
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Generic Confirmation Dialog State
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    description: string;
    action: () => void;
    actionLabel?: string;
    variant?: 'default' | 'destructive';
  }>({
    title: '',
    description: '',
    action: () => { },
    actionLabel: 'Confirm',
    variant: 'default'
  });

  const isStudent = user?.role === 'student';
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  useEffect(() => {
    fetchTests();
    if (isStudent) {
      fetchSubmissions();
    }
  }, [isStudent]);

  const fetchTests = async () => {
    try {
      const response = await api.get('/tests');
      setTests(response.data.tests);
    } catch (error) {
      console.error('Failed to fetch tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const response = await api.get('/submissions');
      setSubmissions(response.data.submissions || []);
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    }
  };

  const getSubmissionForTest = (testId: string) => {
    return submissions.find(sub => sub.test === testId || (sub.test as any)?._id === testId);
  };

  const handleDeleteClick = (id: string) => {
    setTestToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!testToDelete) return;

    try {
      await api.delete(`/tests/${testToDelete}`);
      toast.success('Test deleted successfully');
      fetchTests();
      setDeleteDialogOpen(false);
      setTestToDelete(null);
    } catch (error: any) {
      if (error.response?.status === 409 && error.response?.data?.canCascade) {
        // Close the normal delete dialog and open the cascade confirmation
        setDeleteDialogOpen(false);
        setCascadeDeleteId(testToDelete);
        setTestToDelete(null);
        setCascadeDeleteDialogOpen(true);
      } else {
        console.error('Failed to delete test:', error);
        toast.error(error.response?.data?.message || 'Failed to delete test');
        setDeleteDialogOpen(false);
        setTestToDelete(null);
      }
    }
  };

  const handleForceDelete = async () => {
    if (!cascadeDeleteId) return;

    try {
      await api.delete(`/tests/${cascadeDeleteId}?force=true`);
      toast.success('Test and all submissions deleted successfully');
      fetchTests();
    } catch (error: any) {
      console.error('Failed to force delete test:', error);
      toast.error(error.response?.data?.message || 'Failed to delete test');
    } finally {
      setCascadeDeleteDialogOpen(false);
      setCascadeDeleteId(null);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await api.patch(`/tests/${id}/publish`);
      toast.success('Test published successfully');
      fetchTests();
    } catch (error) {
      console.error('Failed to publish test:', error);
      toast.error('Failed to publish test');
    }
  };

  const handleUnpublish = (id: string) => {
    setConfirmConfig({
      title: 'Unpublish Test',
      description: 'Are you sure you want to unpublish this test? Students will no longer see it.',
      action: async () => {
        try {
          await api.patch(`/tests/${id}/unpublish`);
          toast.success('Test unpublished successfully');
          fetchTests();
        } catch (error) {
          console.error('Failed to unpublish test:', error);
          toast.error('Failed to unpublish test');
        }
        setConfirmDialogOpen(false);
      },
      actionLabel: 'Unpublish',
      variant: 'destructive'
    });
    setConfirmDialogOpen(true);
  };

  const handlePublishResults = async (id: string) => {
    try {
      await api.patch(`/tests/${id}/publish-results`);
      toast.success('Test results published successfully');
      fetchTests();
    } catch (error) {
      console.error('Failed to publish results:', error);
      toast.error('Failed to publish results');
    }
  };

  const handleUnpublishResults = (id: string) => {
    setConfirmConfig({
      title: 'Unpublish Results',
      description: 'Are you sure you want to unpublish the results? Students will no longer see their scores.',
      action: async () => {
        try {
          await api.patch(`/tests/${id}/unpublish-results`);
          toast.success('Test results unpublished successfully');
          fetchTests();
        } catch (error) {
          console.error('Failed to unpublish results:', error);
          toast.error('Failed to unpublish results');
        }
        setConfirmDialogOpen(false);
      },
      actionLabel: 'Unpublish Results',
      variant: 'destructive'
    });
    setConfirmDialogOpen(true);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const filteredTests = tests.filter(test => {
    const matchesSearch = test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.subject?.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSubject = filterSubject === 'all' || test.subject?._id === filterSubject || test.subject?.name === filterSubject;

    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'published' && test.isPublished) ||
      (filterStatus === 'draft' && !test.isPublished);

    return matchesSearch && matchesSubject && matchesStatus;
  }).sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'title') {
      comparison = a.title.localeCompare(b.title);
    } else if (sortBy === 'duration') {
      comparison = a.duration - b.duration;
    } else if (sortBy === 'createdAt') {
      comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Get unique subjects for filter
  const uniqueSubjects = Array.from(new Set(tests.map(t => t.subject?.name).filter(Boolean)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Tests</h1>
        {isTeacher && (
          <Link to="/tests/create">
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Create Test
            </Button>
          </Link>
        )}
      </div>

      <div className="bg-card p-4 rounded-lg shadow space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="Subject" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {uniqueSubjects.map(subject => (
                <SelectItem key={subject} value={subject}>{subject}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4" />
                <SelectValue placeholder="Sort By" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Date Created</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="duration">Duration</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            <ArrowUpDown className={`h-4 w-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="bg-card p-6 rounded-lg shadow text-center">
          <p className="text-muted-foreground">Loading tests...</p>
        </div>
      ) : tests.length === 0 ? (
        <div className="bg-card p-8 sm:p-12 rounded-lg shadow text-center">
          <FileText className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg sm:text-xl font-semibold mb-2">No Tests Found</h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-6">
            {isStudent ? 'No tests assigned to you yet' : 'Get started by creating your first test'}
          </p>
          {isTeacher && (
            <Link to="/tests/create">
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Create Test
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {filteredTests.map((test) => (
            <div
              key={test._id}
              className="bg-card p-4 sm:p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4 gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold mb-1 truncate">
                    {test.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{test.subject?.name || 'N/A'}</p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {test.isPublished ? (
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 text-xs rounded-full whitespace-nowrap">
                      Published
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 text-xs rounded-full whitespace-nowrap">
                      Draft
                    </span>
                  )}
                  {isTeacher && test.isPublished && !test.showResultsImmediately && (
                    test.resultsPublished ? (
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-xs rounded-full whitespace-nowrap">
                        Results Published
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400 text-xs rounded-full whitespace-nowrap">
                        Results Pending
                      </span>
                    )
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                  <span>{test.duration} minutes</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                  <span>{test.questions.length} questions ({test.totalMarks} marks)</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                  <span>Assigned to {test.assignedTo.length} students</span>
                </div>
                {test.scheduledDate && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                    <span className="truncate">{formatDate(test.scheduledDate)}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {isStudent ? (
                  // Student view - show Start Test button or View Results
                  (() => {
                    const submission = getSubmissionForTest(test._id);

                    if (submission) {
                      // Student has already submitted - check if results are available
                      const canViewResults = test.showResultsImmediately || test.resultsPublished;

                      if (canViewResults) {
                        return (
                          <div className="flex flex-col gap-2">
                            <Link to={`/tests/submissions/evaluate/${submission._id}`} className="w-full">
                              <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm">
                                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                View Results
                              </Button>
                            </Link>
                            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                              <span className="px-2 py-1 bg-muted/50 rounded text-center">
                                {submission.status === 'evaluated'
                                  ? `Evaluated - ${submission.totalMarksObtained || 0}/${test.totalMarks}`
                                  : 'Pending Evaluation'}
                              </span>
                            </div>
                          </div>
                        );
                      } else {
                        // Results not yet published by teacher
                        return (
                          <div className="flex flex-col gap-2">
                            <Button size="sm" className="w-full cursor-not-allowed text-xs sm:text-sm" disabled variant="secondary">
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                              Results Pending
                            </Button>
                            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                              <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded text-center">
                                Submitted - Awaiting Result Publication
                              </span>
                            </div>
                          </div>
                        );
                      }
                    }

                    // Student hasn't submitted yet - show Start Test button
                    return (
                      <div className="flex gap-2">
                        <Link to={`/tests/take/${test._id}`} className="flex-1">
                          <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-xs sm:text-sm">
                            <PlayCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                            Start Test
                          </Button>
                        </Link>
                      </div>
                    );
                  })()
                ) : (
                  // Teacher/Admin view - show management buttons
                  <div className="flex items-center gap-1 mt-4 pt-4 border-t">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link to={`/tests/${test._id}`}>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>View Details</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link to={`/tests/edit/${test._id}`}>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>Edit Test</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link to={`/tests/submissions?testId=${test._id}`}>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50">
                              <ClipboardList className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>View Submissions</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => test.isPublished ? handleUnpublish(test._id) : handlePublish(test._id)}
                            className={`h-8 w-8 ${test.isPublished ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50" : "text-green-600 hover:text-green-700 hover:bg-green-50"}`}
                          >
                            {test.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{test.isPublished ? "Unpublish Test" : "Publish Test"}</TooltipContent>
                      </Tooltip>

                      {!test.showResultsImmediately && test.isPublished && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => test.resultsPublished ? handleUnpublishResults(test._id) : handlePublishResults(test._id)}
                              className={`h-8 w-8 ${test.resultsPublished ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50" : "text-blue-600 hover:text-blue-700 hover:bg-blue-50"}`}
                            >
                              {test.resultsPublished ? <EyeOff className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{test.resultsPublished ? "Unpublish Results" : "Publish Results"}</TooltipContent>
                        </Tooltip>
                      )}

                      <div className="flex-1"></div>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteClick(test._id)}
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete Test</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this test? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cascadeDeleteDialogOpen} onOpenChange={setCascadeDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test with Submissions</AlertDialogTitle>
            <AlertDialogDescription>
              This test has existing submissions. Deleting it will also permanently delete all student submissions and results.
              <br /><br />
              <strong>Are you absolutely sure you want to proceed?</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleForceDelete} className="bg-red-600 hover:bg-red-700">
              Delete Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generic Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmConfig.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmConfig.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmConfig.action}
              className={confirmConfig.variant === 'destructive' ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {confirmConfig.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TestsPage;
