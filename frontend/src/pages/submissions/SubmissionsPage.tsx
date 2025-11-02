import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { FileText, Clock, Calendar, User, CheckCircle, Eye, Award } from 'lucide-react';

interface Submission {
  _id: string;
  test: {
    _id: string;
    title: string;
    subject?: {
      name: string;
    };
    totalMarks: number;
  };
  student: {
    _id: string;
    name: string;
    email: string;
  };
  answers: any[];
  totalMarksObtained?: number;
  submittedAt: string;
  status: 'submitted' | 'evaluated' | 'pending';
}

const SubmissionsPage = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const testId = searchParams.get('testId');
  const isStudent = user?.role === 'student';

  useEffect(() => {
    fetchSubmissions();
  }, [testId]);

  const fetchSubmissions = async () => {
    try {
      if (!testId) {
        setSubmissions([]);
        setLoading(false);
        return;
      }
      
      const url = `/submissions?testId=${testId}`;
      const response = await api.get(url);
      const fetchedSubmissions = response.data.submissions || response.data;
      console.log('Fetched submissions:', fetchedSubmissions);
      setSubmissions(fetchedSubmissions);
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 75) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isStudent ? 'My Test Results' : 'Submissions'}
          </h1>
          {isStudent && (
            <p className="text-sm text-gray-600 mt-1">
              View your test submissions and scores
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-gray-600">Loading submissions...</p>
        </div>
      ) : !testId ? (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Test Selected</h2>
          <p className="text-gray-600 mb-4">
            Please select a test from the Tests page to view its submissions
          </p>
          <Button onClick={() => window.location.href = '/tests'}>
            Go to Tests
          </Button>
        </div>
      ) : submissions.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Submissions Found</h2>
          <p className="text-gray-600">
            {isStudent 
              ? "You haven't submitted this test yet" 
              : 'No submissions for this test yet'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            isStudent ? (
              // Student View - Show their own results
              <div
                key={submission._id}
                className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {submission.test.title}
                      </h3>
                      {submission.test.subject && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                          {submission.test.subject.name}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-xs text-gray-500">Submitted On</p>
                          <p className="font-medium text-gray-900">{formatDate(submission.submittedAt)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          submission.status === 'evaluated' ? 'bg-green-100' : 'bg-yellow-100'
                        }`}>
                          {submission.status === 'evaluated' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <Clock className="h-5 w-5 text-yellow-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Status</p>
                          <p className={`font-medium ${
                            submission.status === 'evaluated' ? 'text-green-600' : 'text-yellow-600'
                          }`}>
                            {submission.status === 'evaluated' ? 'Evaluated' : 'Pending Evaluation'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Award className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="text-xs text-gray-500">Score</p>
                          {submission.status === 'evaluated' ? (
                            <>
                              <p className={`text-2xl font-bold ${getScoreColor(submission.totalMarksObtained || 0, submission.test.totalMarks)}`}>
                                {submission.totalMarksObtained || 0} / {submission.test.totalMarks}
                              </p>
                              <p className="text-xs text-gray-600">
                                {((submission.totalMarksObtained || 0) / submission.test.totalMarks * 100).toFixed(1)}%
                              </p>
                            </>
                          ) : (
                            <p className="text-gray-400 font-medium">Not evaluated yet</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {submission.status === 'evaluated' && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">
                              Performance: <span className={`font-semibold ${
                                ((submission.totalMarksObtained || 0) / submission.test.totalMarks * 100) >= 75 ? 'text-green-600' :
                                ((submission.totalMarksObtained || 0) / submission.test.totalMarks * 100) >= 60 ? 'text-blue-600' :
                                ((submission.totalMarksObtained || 0) / submission.test.totalMarks * 100) >= 50 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {((submission.totalMarksObtained || 0) / submission.test.totalMarks * 100) >= 75 ? 'Excellent' :
                                 ((submission.totalMarksObtained || 0) / submission.test.totalMarks * 100) >= 60 ? 'Good' :
                                 ((submission.totalMarksObtained || 0) / submission.test.totalMarks * 100) >= 50 ? 'Average' :
                                 'Needs Improvement'}
                              </span>
                            </p>
                          </div>
                          <Link to={`/tests/submissions/evaluate/${submission._id}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Teacher View - Original layout
            <div
              key={submission._id}
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {submission.test.title}
                    </h3>
                    {submission.test.subject && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {submission.test.subject.name}
                      </span>
                    )}
                    {submission.status === 'evaluated' ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Evaluated
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Pending
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="h-4 w-4" />
                      <div>
                        <p className="font-medium text-gray-900">{submission.student.name}</p>
                        <p className="text-xs">{submission.student.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <div>
                        <p className="text-xs text-gray-500">Submitted</p>
                        <p>{formatDate(submission.submittedAt)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-gray-600" />
                      <div>
                        <p className="text-xs text-gray-500">Score</p>
                        {submission.status === 'evaluated' ? (
                          <p className={`font-semibold ${getScoreColor(submission.totalMarksObtained || 0, submission.test.totalMarks)}`}>
                            {submission.totalMarksObtained || 0} / {submission.test.totalMarks}
                          </p>
                        ) : (
                          <p className="text-gray-400">Not evaluated</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ml-4">
                  <Link to={`/tests/submissions/evaluate/${submission._id}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {submission.status === 'evaluated' ? 'View' : 'Evaluate'}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
            )
          ))}
        </div>
      )}
    </div>
  );
};

export default SubmissionsPage;

