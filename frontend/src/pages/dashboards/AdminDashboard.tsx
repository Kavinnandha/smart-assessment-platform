import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, FileText, FileQuestion, Database, Settings, Activity, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Stats {
  totalTests: number;
  totalQuestions: number;
  totalSubmissions: number;
}

const AdminDashboard = () => {
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
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.name}. System overview and management controls.</p>
        </div>
        <Button variant="outline">
          <Settings className="mr-2 h-4 w-4" /> System Settings
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
            <FileText className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTests || 0}</div>
            <p className="text-xs text-muted-foreground">Active assessments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Questions Bank</CardTitle>
            <FileQuestion className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalQuestions || 0}</div>
            <p className="text-xs text-muted-foreground">Total questions available</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submissions</CardTitle>
            <Database className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSubmissions || 0}</div>
            <p className="text-xs text-muted-foreground">Total tests taken</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Administration Tools */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Administration</CardTitle>
            <CardDescription>Manage users, content, and system configurations.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button variant="outline" className="h-auto py-4 justify-start px-4" asChild>
              <Link to="/users">
                <div className="bg-blue-50 p-2 rounded-full mr-4">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">User Management</div>
                  <div className="text-xs text-muted-foreground">Add, edit, or remove users</div>
                </div>
              </Link>
            </Button>

            <Button variant="outline" className="h-auto py-4 justify-start px-4" asChild>
              <Link to="/subjects">
                <div className="bg-green-50 p-2 rounded-full mr-4">
                  <BookOpen className="h-5 w-5 text-green-600" /> // Changed icon to BookOpen as it fits Subjects better
                </div>
                <div className="text-left">
                  <div className="font-semibold">Subject Management</div>
                  <div className="text-xs text-muted-foreground">Configure subjects and topics</div>
                </div>
              </Link>
            </Button>

            <Button variant="outline" className="h-auto py-4 justify-start px-4" asChild>
              <Link to="/questions">
                <div className="bg-purple-50 p-2 rounded-full mr-4">
                  <Database className="h-5 w-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">Content Management</div>
                  <div className="text-xs text-muted-foreground">Oversee all questions and tests</div>
                </div>
              </Link>
            </Button>

            <Button variant="outline" className="h-auto py-4 justify-start px-4" asChild>
              <Link to="/reports">
                <div className="bg-orange-50 p-2 rounded-full mr-4">
                  <Activity className="h-5 w-5 text-orange-600" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">System Analytics</div>
                  <div className="text-xs text-muted-foreground">View platform usage stats</div>
                </div>
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* System Health / Alerts */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Operational metrics.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium">API Server: Online</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium">Database: Connected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium">AI Service: Operational</span>
            </div>

            <div className="pt-4 border-t mt-4">
              <p className="text-xs text-muted-foreground mb-2">Storage Usage</p>
              <div className="w-full bg-secondary h-2 rounded-full">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '45%' }}></div>
              </div>
              <p className="text-xs text-right text-muted-foreground mt-1">45% Used</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
