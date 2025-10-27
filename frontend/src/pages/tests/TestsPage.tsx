import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Clock, Users, FileText, Trash2, Eye, EyeOff, Edit } from 'lucide-react';

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
  createdAt: string;
}

const TestsPage = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTests();
  }, []);

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

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Tests</h1>
        <Link to="/tests/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Test
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-gray-600">Loading tests...</p>
        </div>
      ) : tests.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Tests Found</h2>
          <p className="text-gray-600 mb-6">Get started by creating your first test</p>
          <Link to="/tests/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Test
            </Button>
          </Link>
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
                {test.isPublished ? (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Published
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                    Draft
                  </span>
                )}
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TestsPage;
