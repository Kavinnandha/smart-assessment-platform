import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Clock, Users, FileText, Trash2, Eye, EyeOff, Edit, ClipboardList, PlayCircle, CheckCircle } from 'lucide-react';

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

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this test?')) {
      return;
    }

    try {
      await api.delete(`/tests/${id}`);
      alert('Test deleted successfully');
      fetchTests();
    } catch (error) {
      console.error('Failed to delete test:', error);
      alert('Failed to delete test');
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await api.patch(`/tests/${id}/publish`);
      alert('Test published successfully');
      fetchTests();
    } catch (error) {
      console.error('Failed to publish test:', error);
      alert('Failed to publish test');
    }
  };

  const handleUnpublish = async (id: string) => {
    if (!window.confirm('Are you sure you want to unpublish this test? Students will no longer see it.')) {
      return;
    }

    try {
      await api.patch(`/tests/${id}/unpublish`);
      alert('Test unpublished successfully');
      fetchTests();
    } catch (error) {
      console.error('Failed to unpublish test:', error);
      alert('Failed to unpublish test');
    }
  };

  const handlePublishResults = async (id: string) => {
    try {
      await api.patch(`/tests/${id}/publish-results`);
      alert('Test results published successfully');
      fetchTests();
    } catch (error) {
      console.error('Failed to publish results:', error);
      alert('Failed to publish results');
    }
  };

  const handleUnpublishResults = async (id: string) => {
    if (!window.confirm('Are you sure you want to unpublish the results? Students will no longer see their scores.')) {
      return;
    }

    try {
      await api.patch(`/tests/${id}/unpublish-results`);
      alert('Test results unpublished successfully');
      fetchTests();
    } catch (error) {
      console.error('Failed to unpublish results:', error);
      alert('Failed to unpublish results');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

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
          {tests.map((test) => (
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
                  <>
                    <div className="flex gap-2">
                      <Link to={`/tests/${test._id}`} className="flex-1">
                        <Button size="sm" variant="outline" className="w-full text-xs sm:text-sm">
                          View Details
                        </Button>
                      </Link>
                      <Link to={`/tests/edit/${test._id}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Edit test"
                        >
                          <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </Link>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/tests/submissions?testId=${test._id}`} className="flex-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-purple-600 hover:text-purple-700 hover:bg-purple-50 text-xs sm:text-sm"
                          title="View submissions"
                        >
                          <ClipboardList className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          Submissions
                        </Button>
                      </Link>
                    </div>
                    <div className="flex gap-2">
                      {test.isPublished ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnpublish(test._id)}
                          className="flex-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50 text-xs sm:text-sm"
                          title="Unpublish test"
                        >
                          <EyeOff className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          Unpublish
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePublish(test._id)}
                          className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-50 text-xs sm:text-sm"
                          title="Publish test"
                        >
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          Publish
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(test._id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete test"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                    {!test.showResultsImmediately && test.isPublished && (
                      <div className="flex gap-2">
                        {test.resultsPublished ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnpublishResults(test._id)}
                            className="flex-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50 text-xs sm:text-sm"
                            title="Unpublish results - students will no longer see their scores"
                          >
                            <EyeOff className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="hidden sm:inline">Unpublish Results</span>
                            <span className="sm:hidden">Results Off</span>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePublishResults(test._id)}
                            className="flex-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs sm:text-sm"
                            title="Publish results - students will be able to see their scores"
                          >
                            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="hidden sm:inline">Publish Results</span>
                            <span className="sm:hidden">Results On</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TestsPage;
