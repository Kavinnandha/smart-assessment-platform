import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Subject {
  _id: string;
  name: string;
  chapters: string[];
}

const CreateQuestionPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    questionNumber: '',
    chapter: '',
    topic: '',
    marks: '',
    difficultyLevel: 'easy',
    questionText: '',
    subject: ''
  });

  useEffect(() => {
    fetchSubjects();
    if (isEditMode) {
      fetchQuestion();
    }
  }, []);

  const fetchQuestion = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/questions/${id}`);
      const question = response.data.question;
      
      setFormData({
        questionNumber: question.questionNumber || '',
        chapter: question.chapter || '',
        topic: question.topic || '',
        marks: question.marks?.toString() || '',
        difficultyLevel: question.difficultyLevel || 'easy',
        questionText: question.questionText || '',
        subject: question.subject?._id || ''
      });

      // Set the selected subject to populate chapters
      if (question.subject?._id) {
        const subject = subjects.find(s => s._id === question.subject._id);
        if (subject) {
          setSelectedSubject(subject);
        } else {
          // If subjects aren't loaded yet, we'll set it after they load
          setTimeout(() => {
            const subj = subjects.find(s => s._id === question.subject._id);
            setSelectedSubject(subj || null);
          }, 500);
        }
      }
    } catch (error) {
      console.error('Failed to fetch question:', error);
      alert('Failed to load question details');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await api.get('/subjects');
      console.log('Fetched subjects:', response.data);
      setSubjects(response.data);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const handleSubjectChange = (subjectId: string) => {
    const subject = subjects.find(s => s._id === subjectId);
    console.log('Selected subject:', subject);
    console.log('Chapters:', subject?.chapters);
    setSelectedSubject(subject || null);
    setFormData({ 
      ...formData, 
      subject: subjectId,
      chapter: '' // Reset chapter when subject changes
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        ...formData,
        marks: Number(formData.marks)
      };

      if (isEditMode) {
        await api.put(`/questions/${id}`, payload);
        alert('Question updated successfully!');
      } else {
        await api.post('/questions', payload);
        alert('Question created successfully!');
      }
      
      navigate('/questions');
    } catch (error) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} question:`, error);
      alert(`Failed to ${isEditMode ? 'update' : 'create'} question`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        {isEditMode ? 'Edit Question' : 'Create Question'}
      </h1>

      {loading && isEditMode ? (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p>Loading question...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="subject">Subject *</Label>
            <select
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={(e) => handleSubjectChange(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" className="text-gray-900">Select Subject</option>
              {subjects.map((subject) => (
                <option key={subject._id} value={subject._id} className="text-gray-900 py-2">
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="chapter">Chapter *</Label>
            <select
              id="chapter"
              name="chapter"
              value={formData.chapter}
              onChange={handleChange}
              required
              disabled={!formData.subject}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" className="text-gray-900">Select Chapter</option>
              {selectedSubject?.chapters && selectedSubject.chapters.length > 0 ? (
                selectedSubject.chapters.map((chapter, index) => (
                  <option key={index} value={chapter} className="text-gray-900 py-2">
                    {chapter}
                  </option>
                ))
              ) : null}
            </select>
            {!formData.subject && (
              <p className="text-sm text-gray-500 mt-1">Select a subject first</p>
            )}
            {formData.subject && selectedSubject && selectedSubject.chapters.length === 0 && (
              <p className="text-sm text-amber-600 mt-1">⚠️ No chapters available for this subject. Please add chapters in Subject Management.</p>
            )}
            {formData.subject && selectedSubject && selectedSubject.chapters.length > 0 && (
              <p className="text-sm text-green-600 mt-1">
                ✓ {selectedSubject.chapters.length} chapter(s) available
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="topic">Topic (Optional)</Label>
            <Input
              id="topic"
              name="topic"
              value={formData.topic}
              onChange={handleChange}
              placeholder="e.g., Linear Equations"
            />
          </div>
          <div>
            <Label htmlFor="questionNumber">Question Number *</Label>
            <Input
              id="questionNumber"
              name="questionNumber"
              value={formData.questionNumber}
              onChange={handleChange}
              required
              placeholder="Q1"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="marks">Marks</Label>
            <Input
              id="marks"
              name="marks"
              type="number"
              value={formData.marks}
              onChange={handleChange}
              required
              min="1"
            />
          </div>
          <div>
            <Label htmlFor="difficultyLevel">Difficulty Level</Label>
            <select
              id="difficultyLevel"
              name="difficultyLevel"
              value={formData.difficultyLevel}
              onChange={handleChange}
              className="flex h-10 w-full rounded-md border px-3 py-2"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        <div>
          <Label htmlFor="questionText">Question Text</Label>
          <textarea
            id="questionText"
            name="questionText"
            value={formData.questionText}
            onChange={handleChange}
            required
            rows={6}
            className="flex w-full rounded-md border px-3 py-2"
            placeholder="Enter your question here..."
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : (isEditMode ? 'Update Question' : 'Create Question')}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/questions')}>
            Cancel
          </Button>
        </div>
      </form>
      )}
    </div>
  );
};

export default CreateQuestionPage;
