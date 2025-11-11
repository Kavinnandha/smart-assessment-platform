import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, BookOpen, ChevronRight } from 'lucide-react';

const QuestionsPage = () => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSubjectsAndCounts();
  }, []);

  const fetchSubjectsAndCounts = async () => {
    try {
      setLoading(true);
      
      // Fetch all subjects
      const subjectsResponse = await api.get('/subjects');
      const allSubjects = subjectsResponse.data;
      
      // Fetch all questions to count per subject
      const questionsResponse = await api.get('/questions');
      const allQuestions = questionsResponse.data.questions;
      
      // Count questions per subject
      const counts: any = {};
      let uncategorizedCount = 0;
      
      allQuestions.forEach((q: any) => {
        if (q.subject && q.subject._id) {
          const subjectId = q.subject._id;
          counts[subjectId] = (counts[subjectId] || 0) + 1;
        } else {
          uncategorizedCount++;
        }
      });
      
      // Add uncategorized if there are questions without a subject
      const subjectsWithCounts = [...allSubjects];
      if (uncategorizedCount > 0) {
        subjectsWithCounts.push({
          _id: 'uncategorized',
          name: 'Uncategorized',
          chapters: [],
          questionCount: uncategorizedCount
        });
      }
      
      // Add question counts to subjects
      const subjectsWithStats = subjectsWithCounts.map(subject => ({
        ...subject,
        questionCount: subject._id === 'uncategorized' ? uncategorizedCount : (counts[subject._id] || 0)
      }));
      
      setSubjects(subjectsWithStats);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Question Bank</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Browse questions by subject</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search subjects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-base"
            />
          </div>
          <Button variant="outline" className="w-full sm:w-auto">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
      </div>

      {/* Subjects Grid - Card View */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full bg-white p-8 rounded-lg shadow text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-sm sm:text-base text-gray-600">Loading subjects...</p>
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="col-span-full bg-white p-6 sm:p-8 rounded-lg shadow text-center text-gray-500">
            No subjects found
          </div>
        ) : (
          filteredSubjects.map((subject) => (
            <div
              key={subject._id}
              className="bg-white rounded-lg shadow-md border hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => navigate(`/questions/subject/${subject._id}`)}
            >
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 sm:p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors shrink-0" />
                </div>
                
                <h3 className="font-bold text-lg sm:text-xl mb-2 group-hover:text-blue-600 transition-colors">
                  {subject.name}
                </h3>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-gray-600">Questions</span>
                    <span className="font-semibold text-base sm:text-lg">{subject.questionCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-gray-600">Chapters</span>
                    <span className="font-semibold">{subject.chapters?.length || 0}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-600 text-xs sm:text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/questions/subject/${subject._id}`);
                    }}
                  >
                    View Questions
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default QuestionsPage;
