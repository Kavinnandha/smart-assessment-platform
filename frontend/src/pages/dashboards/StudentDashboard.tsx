import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { BookOpen, FileText, CheckCircle, Clock } from 'lucide-react';

interface Stats {
  assignedTests: number;
  completedTests: number;
  pendingTests: number;
  averageScore: number;
}

const StudentDashboard = () => {
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
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome, {user?.name}!</h1>
        <p className="mt-2 text-gray-600">Here's an overview of your academic performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Assigned Tests</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.assignedTests || 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats?.completedTests || 0}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{stats?.pendingTests || 0}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average Score</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{stats?.averageScore || 0}%</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button className="h-24" onClick={() => window.location.href = '/tests'}>
            <div className="text-center">
              <FileText className="h-6 w-6 mx-auto mb-2" />
              <span>View Tests</span>
            </div>
          </Button>
          <Button className="h-24" onClick={() => window.location.href = '/submissions'}>
            <div className="text-center">
              <CheckCircle className="h-6 w-6 mx-auto mb-2" />
              <span>My Submissions</span>
            </div>
          </Button>
          <Button className="h-24" onClick={() => window.location.href = '/reports'}>
            <div className="text-center">
              <BookOpen className="h-6 w-6 mx-auto mb-2" />
              <span>View Reports</span>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
