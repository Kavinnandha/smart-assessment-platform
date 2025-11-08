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
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Tests</h1>
        {isTeacher && (
          <Link to="/tests/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Test
            </Button>
          </Link>
        )}
      </div>

      {loading ? (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-gray-600">Loading tests...</p>
        </div>
      ) : tests.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Tests Found</h2>
          <p className="text-gray-600 mb-6">
            {isStudent ? 'No tests assigned to you yet' : 'Get started by creating your first test'}
          </p>
          {isTeacher && (
            <Link to="/tests/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Test
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((test) => (
            <div
              key={test._id}
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {test.title}
                  </h3>
                  <p className="text-sm text-gray-600">{test.subject?.name || 'N/A'}</p>
                </div>
                <div className="flex flex-col gap-1">
                  {test.isPublished ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Published
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                      Draft
                    </span>
                  )}
                  {isTeacher && test.isPublished && !test.showResultsImmediately && (
                    test.resultsPublished ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Results Published
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                        Results Pending
                      </span>
                    )
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>{test.duration} minutes</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileText className="h-4 w-4" />
                  <span>{test.questions.length} questions ({test.totalMarks} marks)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>Assigned to {test.assignedTo.length} students</span>
                </div>
                {test.scheduledDate && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(test.scheduledDate)}</span>
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
                              <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                View Results
                              </Button>
                            </Link>
                            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                              <span className="px-2 py-1 bg-gray-100 rounded">
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
                            <Button size="sm" className="w-full bg-gray-400 cursor-not-allowed" disabled>
                              <Clock className="h-4 w-4 mr-2" />
                              Results Pending
                            </Button>
                            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">
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
                          <Button size="sm" className="w-full bg-green-600 hover:bg-green-700">
                            <PlayCircle className="h-4 w-4 mr-2" />
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
                        <Button size="sm" variant="outline" className="w-full">
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
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/tests/submissions?testId=${test._id}`} className="flex-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                          title="View submissions"
                        >
                          <ClipboardList className="h-4 w-4 mr-1" />
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
                          className="flex-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          title="Unpublish test"
                        >
                          <EyeOff className="h-4 w-4 mr-1" />
                          Unpublish
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePublish(test._id)}
                          className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                          title="Publish test"
                        >
                          <Eye className="h-4 w-4 mr-1" />
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
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {!test.showResultsImmediately && test.isPublished && (
                      <div className="flex gap-2">
                        {test.resultsPublished ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnpublishResults(test._id)}
                            className="flex-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            title="Unpublish results - students will no longer see their scores"
                          >
                            <EyeOff className="h-4 w-4 mr-1" />
                            Unpublish Results
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePublishResults(test._id)}
                            className="flex-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Publish results - students will be able to see their scores"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Publish Results
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
