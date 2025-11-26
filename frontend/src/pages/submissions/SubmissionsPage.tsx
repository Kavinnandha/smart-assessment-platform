import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Clock, Calendar, User, CheckCircle, Eye, Award, Search, Filter, ArrowUpDown, Hash } from 'lucide-react';

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
  attemptNumber?: number;
}

const SubmissionsPage = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const testId = searchParams.get('testId');
  const isStudent = user?.role === 'student';

  // Search, Filter, Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('submittedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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

  const filteredSubmissions = submissions.filter(submission => {
    const matchesSearch =
      submission.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.test.title.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' || submission.status === filterStatus;

    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'submittedAt') {
      comparison = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
    } else if (sortBy === 'score') {
      const scoreA = a.totalMarksObtained || 0;
      const scoreB = b.totalMarksObtained || 0;
      comparison = scoreA - scoreB;
    } else if (sortBy === 'studentName') {
      comparison = a.student.name.localeCompare(b.student.name);
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {isStudent ? 'My Test Results' : 'Submissions'}
          </h1>
          {isStudent && (
            <p className="text-sm text-muted-foreground mt-1">
              View your test submissions and scores
            </p>
          )}
        </div>
      </div>

      {/* Search, Filter, Sort Controls */}
      {testId && (
        <div className="bg-card p-4 rounded-lg shadow mb-6 space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isStudent ? "Search by test title..." : "Search by student name or email..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="evaluated">Evaluated</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
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
                <SelectItem value="submittedAt">Date Submitted</SelectItem>
                <SelectItem value="score">Score</SelectItem>
                {!isStudent && <SelectItem value="studentName">Student Name</SelectItem>}
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
      )}

      {loading ? (
        <div className="bg-card p-6 rounded-lg shadow text-center">
          <p className="text-muted-foreground">Loading submissions...</p>
        </div>
      ) : !testId ? (
        <div className="bg-card p-12 rounded-lg shadow text-center">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Test Selected</h2>
          <p className="text-muted-foreground mb-4">
            Please select a test from the Tests page to view its submissions
          </p>
          <Button onClick={() => window.location.href = '/tests'}>
            Go to Tests
          </Button>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="bg-card p-12 rounded-lg shadow text-center">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Submissions Found</h2>
          <p className="text-muted-foreground">
            {isStudent
              ? "You haven't submitted this test yet"
              : 'No submissions match your search criteria'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSubmissions.map((submission) => (
            isStudent ? (
              // Student View - Show their own results
              <div
                key={submission._id}
                className="bg-card p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-xl font-semibold">
                        {submission.test.title}
                      </h3>
                      {submission.test.subject && (
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-sm rounded-full">
                          {submission.test.subject.name}
                        </span>
                      )}
                      {submission.attemptNumber && (
                        <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400 text-sm rounded-full flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          Attempt #{submission.attemptNumber}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <div>
                          <p className="text-xs text-muted-foreground">Submitted On</p>
                          <p className="font-medium">{formatDate(submission.submittedAt)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${submission.status === 'evaluated' ? 'bg-green-100 dark:bg-green-900/20' : 'bg-yellow-100 dark:bg-yellow-900/20'
                          }`}>
                          {submission.status === 'evaluated' ? (
                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Status</p>
                          <p className={`font-medium ${submission.status === 'evaluated' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
                            }`}>
                            {submission.status === 'evaluated' ? 'Evaluated' : 'Pending Evaluation'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        <div>
                          <p className="text-xs text-muted-foreground">Score</p>
                          {submission.status === 'evaluated' ? (
                            <>
                              <p className={`text-2xl font-bold ${getScoreColor(submission.totalMarksObtained || 0, submission.test.totalMarks)}`}>
                                {submission.totalMarksObtained || 0} / {submission.test.totalMarks}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {((submission.totalMarksObtained || 0) / submission.test.totalMarks * 100).toFixed(1)}%
                              </p>
                            </>
                          ) : (
                            <p className="text-muted-foreground font-medium">Not evaluated yet</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {submission.status === 'evaluated' && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Performance: <span className={`font-semibold ${((submission.totalMarksObtained || 0) / submission.test.totalMarks * 100) >= 75 ? 'text-green-600 dark:text-green-400' :
                                  ((submission.totalMarksObtained || 0) / submission.test.totalMarks * 100) >= 60 ? 'text-blue-600 dark:text-blue-400' :
                                    ((submission.totalMarksObtained || 0) / submission.test.totalMarks * 100) >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                                      'text-red-600 dark:text-red-400'
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
                className="bg-card p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">
                        {submission.test.title}
                      </h3>
                      {submission.test.subject && (
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-xs rounded-full">
                          {submission.test.subject.name}
                        </span>
                      )}
                      {submission.attemptNumber && (
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400 text-xs rounded-full flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          Attempt #{submission.attemptNumber}
                        </span>
                      )}
                      {submission.status === 'evaluated' ? (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 text-xs rounded-full flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Evaluated
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 text-xs rounded-full flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Pending
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <div>
                          <p className="font-medium">{submission.student.name}</p>
                          <p className="text-xs">{submission.student.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <div>
                          <p className="text-xs text-muted-foreground">Submitted</p>
                          <p>{formatDate(submission.submittedAt)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Score</p>
                          {submission.status === 'evaluated' ? (
                            <p className={`font-semibold ${getScoreColor(submission.totalMarksObtained || 0, submission.test.totalMarks)}`}>
                              {submission.totalMarksObtained || 0} / {submission.test.totalMarks}
                            </p>
                          ) : (
                            <p className="text-muted-foreground">Not evaluated</p>
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

