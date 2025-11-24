import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileQuestion, FileText, ClipboardList, Plus, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Stats {
  myTests: number;
  myQuestions: number;
  pendingEvaluations: number;
}

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/analytics/dashboard');
      setStats(response.data.stats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teacher Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.name}. Manage your curriculum, assessments, and students.</p>
        </div>
        <Button asChild>
          <Link to="/tests/create">
            <Plus className="mr-2 h-4 w-4" /> Create New Test
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Questions</CardTitle>
            <FileQuestion className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.myQuestions || 0}</div>
            <p className="text-xs text-muted-foreground">Total questions created</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tests</CardTitle>
            <FileText className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.myTests || 0}</div>
            <p className="text-xs text-muted-foreground">Tests currently available</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Evaluations</CardTitle>
            <ClipboardList className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingEvaluations || 0}</div>
            <p className="text-xs text-muted-foreground">Submissions needing review</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your teaching resources efficiently.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button variant="outline" className="h-auto py-4 justify-start px-4" asChild>
              <Link to="/questions/create">
                <div className="bg-blue-50 p-2 rounded-full mr-4">
                  <Plus className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">Create Question</div>
                  <div className="text-xs text-muted-foreground">Add new question to bank</div>
                </div>
              </Link>
            </Button>

            <Button variant="outline" className="h-auto py-4 justify-start px-4" asChild>
              <Link to="/tests/create">
                <div className="bg-green-50 p-2 rounded-full mr-4">
                  <FileText className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">Create Test</div>
                  <div className="text-xs text-muted-foreground">Design a new assessment</div>
                </div>
              </Link>
            </Button>

            <Button variant="outline" className="h-auto py-4 justify-start px-4" asChild>
              <Link to="/tests/submissions">
                <div className="bg-orange-50 p-2 rounded-full mr-4">
                  <ClipboardList className="h-5 w-5 text-orange-600" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">Evaluate</div>
                  <div className="text-xs text-muted-foreground">Grade student submissions</div>
                </div>
              </Link>
            </Button>

            <Button variant="outline" className="h-auto py-4 justify-start px-4" asChild>
              <Link to="/student-groups">
                <div className="bg-purple-50 p-2 rounded-full mr-4">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">Student Groups</div>
                  <div className="text-xs text-muted-foreground">Manage class groups</div>
                </div>
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Analytics Preview */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
            <CardDescription>Quick insights.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Class Average</span>
              <span className="text-sm font-bold">78%</span>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full">
              <div className="bg-primary h-2 rounded-full" style={{ width: '78%' }}></div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <span className="text-sm font-medium">Completion Rate</span>
              <span className="text-sm font-bold">92%</span>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '92%' }}></div>
            </div>

            <Button variant="ghost" className="w-full mt-4" asChild>
              <Link to="/reports">
                View Full Reports <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeacherDashboard;
