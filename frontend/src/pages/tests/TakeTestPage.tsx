import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, FileText, ArrowLeft, Eye, EyeOff, Edit } from 'lucide-react';

interface Question {
  _id: string;
  question: {
    _id: string;
    questionNumber: string;
    questionText: string;
    chapter: string;
    topic: string;
    difficultyLevel: string;
  };
  marks: number;
  order: number;
}

interface Test {
  _id: string;
  title: string;
  subject: {
    _id: string;
    name: string;
  };
  description?: string;
  duration: number;
  totalMarks: number;
  questions: Question[];
  assignedTo: {
    _id: string;
    name: string;
    email: string;
  }[];
  scheduledDate?: string;
  deadline?: string;
  isPublished: boolean;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

const TakeTestPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTest();
  }, [id]);

  const fetchTest = async () => {
    try {
      const response = await api.get(`/tests/${id}`);
      setTest(response.data.test);
    } catch (error) {
      console.error('Failed to fetch test:', error);
      alert('Failed to load test details');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      await api.patch(`/tests/${id}/publish`);
      alert('Test published successfully');
      fetchTest();
    } catch (error) {
      console.error('Failed to publish test:', error);
      alert('Failed to publish test');
    }
  };

  const handleUnpublish = async () => {
    if (!window.confirm('Are you sure you want to unpublish this test? Students will no longer see it.')) {
      return;
    }

    try {
      await api.patch(`/tests/${id}/unpublish`);
      alert('Test unpublished successfully');
      fetchTest();
    } catch (error) {
      console.error('Failed to unpublish test:', error);
      alert('Failed to unpublish test');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-gray-600">Loading test details...</p>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-red-600">Test not found</p>
          <Button onClick={() => navigate('/tests')} className="mt-4">
            Back to Tests
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          onClick={() => navigate('/tests')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tests
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/tests/edit/${test._id}`)}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Test
          </Button>
          
          {test.isPublished ? (
            <Button
              variant="outline"
              onClick={handleUnpublish}
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            >
              <EyeOff className="h-4 w-4 mr-2" />
              Unpublish
            </Button>
          ) : (
            <Button
              onClick={handlePublish}
              className="bg-green-600 hover:bg-green-700"
            >
              <Eye className="h-4 w-4 mr-2" />
              Publish
            </Button>
          )}
        </div>
      </div>

      {/* Test Header */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {test.title}
            </h1>
            <p className="text-lg text-gray-600">{test.subject?.name || 'N/A'}</p>
          </div>
          {test.isPublished ? (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              Published
            </span>
          ) : (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
              Draft
            </span>
          )}
        </div>

        {test.description && (
          <p className="text-gray-700 mb-4 p-4 bg-gray-50 rounded-lg">
            {test.description}
          </p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2 text-gray-700">
            <Clock className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Duration</p>
              <p className="font-semibold">{test.duration} minutes</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <FileText className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Questions</p>
              <p className="font-semibold">{test.questions.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <FileText className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Total Marks</p>
              <p className="font-semibold">{test.totalMarks}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Users className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Assigned To</p>
              <p className="font-semibold">{test.assignedTo.length} students</p>
            </div>
          </div>
        </div>

        {(test.scheduledDate || test.deadline) && (
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
            {test.scheduledDate && (
              <div className="flex items-center gap-2 text-gray-700">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-500">Scheduled Date</p>
                  <p className="font-medium text-sm">{formatDate(test.scheduledDate)}</p>
                </div>
              </div>
            )}
            {test.deadline && (
              <div className="flex items-center gap-2 text-gray-700">
                <Calendar className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-xs text-gray-500">Deadline</p>
                  <p className="font-medium text-sm">{formatDate(test.deadline)}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-gray-600">
            Created by <span className="font-medium">{test.createdBy.name}</span> on{' '}
            {formatDate(test.createdAt)}
          </p>
        </div>
      </div>

      {/* Questions List */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Questions ({test.questions.length})</h2>
        <div className="space-y-4">
          {test.questions
            .sort((a, b) => a.order - b.order)
            .map((item, index) => (
              <div key={item._id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start gap-4">
                  <div className="shrink-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm text-gray-500">
                          Q{item.question.questionNumber}
                        </p>
                        <p className="font-medium text-gray-900 mt-1">
                          {item.question.questionText}
                        </p>
                      </div>
                      <span className="ml-4 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                        {item.marks} marks
                      </span>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-600 mt-2">
                      <span>Chapter: {item.question.chapter}</span>
                      {item.question.topic && (
                        <span>Topic: {item.question.topic}</span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          item.question.difficultyLevel === 'easy'
                            ? 'bg-green-100 text-green-800'
                            : item.question.difficultyLevel === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {item.question.difficultyLevel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Assigned Students */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">
          Assigned Students ({test.assignedTo.length})
        </h2>
        {test.assignedTo.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No students assigned to this test
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {test.assignedTo.map((student) => (
              <div
                key={student._id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
                  {student.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {student.name}
                  </p>
                  <p className="text-sm text-gray-600 truncate">{student.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TakeTestPage;
