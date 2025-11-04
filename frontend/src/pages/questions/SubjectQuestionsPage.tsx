import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Search, Download, Trash2, BookOpen } from 'lucide-react';

interface Chapter {
  name: string;
  topics: string[];
}

interface Subject {
  _id: string;
  name: string;
  chapters: Chapter[];
}

const SubjectQuestionsPage = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ chapter: '', topic: '', difficulty: '' });

  useEffect(() => {
    fetchSubjectAndQuestions();
  }, [subjectId, filter]);

  const fetchSubjectAndQuestions = async () => {
    try {
      setLoading(true);
      
      // Fetch subject details
      if (subjectId && subjectId !== 'uncategorized') {
        const subjectResponse = await api.get(`/subjects/${subjectId}`);
        setSubject(subjectResponse.data);
      } else {
        setSubject({ name: 'Uncategorized', _id: 'uncategorized', chapters: [] });
      }

      // Fetch questions for this subject
      const params: any = { ...filter, search };
      if (subjectId !== 'uncategorized') {
        params.subject = subjectId;
      }
      
      const questionsResponse = await api.get('/questions', { params });
      
      // Filter questions by subject
      const filteredQuestions = questionsResponse.data.questions.filter((q: any) => {
        if (subjectId === 'uncategorized') {
          return !q.subject || !q.subject._id;
        }
        return q.subject?._id === subjectId;
      });
      
      setQuestions(filteredQuestions);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchSubjectAndQuestions();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this question?')) {
      return;
    }

    try {
      await api.delete(`/questions/${id}`);
      alert('Question deleted successfully');
      fetchSubjectAndQuestions();
    } catch (error) {
      console.error('Failed to delete question:', error);
      alert('Failed to delete question');
    }
  };

  const handleExport = async () => {
    try {
      const params: any = { ...filter };
      if (subjectId !== 'uncategorized') {
        params.subject = subjectId;
      }
      
      const response = await api.get('/questions/export', {
        responseType: 'blob',
        params
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `questions-${subject?.name || 'export'}.xlsx`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error('Failed to export questions:', error);
    }
  };

  // Group questions by chapter
  const questionsByChapter = questions.reduce((acc: any, question: any) => {
    const chapterName = question.chapter || 'No Chapter';
    
    if (!acc[chapterName]) {
      acc[chapterName] = [];
    }
    
    acc[chapterName].push(question);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/questions')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Subjects
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{subject?.name || 'Loading...'}</h1>
              <p className="text-gray-600 mt-1">{questions.length} question{questions.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Link to={`/questions/create/${subjectId}`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Question
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <Input
              placeholder="Search questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <select
            value={filter.difficulty}
            onChange={(e) => setFilter({ ...filter, difficulty: e.target.value })}
            className="px-3 py-2 border rounded-md"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <select
            value={filter.chapter}
            onChange={(e) => setFilter({ ...filter, chapter: e.target.value })}
            className="px-3 py-2 border rounded-md"
          >
            <option value="">All Chapters</option>
            {subject?.chapters?.map((chapter: Chapter, idx: number) => (
              <option key={idx} value={chapter.name}>
                {chapter.name}
              </option>
            ))}
          </select>
          <Button onClick={handleSearch}>
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Total Questions</p>
          <p className="text-2xl font-bold">{questions.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Easy</p>
          <p className="text-2xl font-bold text-green-600">
            {questions.filter((q: any) => q.difficultyLevel === 'easy').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Medium</p>
          <p className="text-2xl font-bold text-yellow-600">
            {questions.filter((q: any) => q.difficultyLevel === 'medium').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Hard</p>
          <p className="text-2xl font-bold text-red-600">
            {questions.filter((q: any) => q.difficultyLevel === 'hard').length}
          </p>
        </div>
      </div>

      {/* Questions List - Grouped by Chapter */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">Loading questions...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
            No questions found for this subject
          </div>
        ) : (
          Object.entries(questionsByChapter).map(([chapter, chapterQuestions]: [string, any]) => (
            <div key={chapter} className="bg-white rounded-lg shadow-sm border">
              {/* Chapter Header */}
              <div className="p-4 bg-gray-50 border-b">
                <h3 className="font-semibold text-lg">{chapter}</h3>
                <p className="text-sm text-gray-500">
                  {chapterQuestions.length} question{chapterQuestions.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Questions Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question No</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Topic</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Difficulty</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marks</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {chapterQuestions.map((q: any) => (
                      <tr key={q._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{q.questionNumber}</td>
                        <td className="px-6 py-4">{q.topic || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            q.difficultyLevel === 'easy' ? 'bg-green-100 text-green-800' :
                            q.difficultyLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {q.difficultyLevel}
                          </span>
                        </td>
                        <td className="px-6 py-4">{q.marks}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <Link to={`/questions/edit/${q._id}/${subjectId}`}>
                              <Button size="sm" variant="outline">Edit</Button>
                            </Link>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleDelete(q._id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SubjectQuestionsPage;
