import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';

interface Subject {
  _id: string;
  name: string;
  chapters: string[];
}

interface Attachment {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

const CreateQuestionPage = () => {
  const navigate = useNavigate();
  const { id, subjectId } = useParams();
  const isEditMode = !!id;
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
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

  useEffect(() => {
    // Auto-select subject if subjectId is provided in URL (both create and edit modes)
    if (subjectId && subjects.length > 0) {
      console.log('Auto-selecting subject from URL:', subjectId);
      const subject = subjects.find(s => s._id === subjectId);
      console.log('Found subject:', subject);
      if (subject) {
        setSelectedSubject(subject);
        // Set formData.subject for both create and edit when subjectId is in URL
        setFormData(prev => ({ ...prev, subject: subjectId }));
      }
    }
  }, [subjectId, subjects]);

  // Additional effect to set selected subject from loaded question data (when NO subjectId in URL)
  useEffect(() => {
    if (isEditMode && formData.subject && subjects.length > 0 && !subjectId) {
      console.log('Setting subject from question data:', formData.subject);
      const subject = subjects.find(s => s._id === formData.subject);
      console.log('Found subject from question:', subject);
      if (subject) {
        setSelectedSubject(subject);
      }
    }
  }, [formData.subject, subjects, isEditMode, subjectId]);

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

      // Load attachments if they exist
      if (question.attachments && question.attachments.length > 0) {
        setAttachments(question.attachments);
      }

      // The selectedSubject will be set by the useEffect when subjects are loaded
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadedFiles: Attachment[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        // Upload to backend (you'll need to create this endpoint)
        const response = await api.post('/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        uploadedFiles.push({
          fileName: file.name,
          fileUrl: response.data.fileUrl,
          fileType: file.type,
          fileSize: file.size,
        });
      }

      setAttachments([...attachments, ...uploadedFiles]);
      alert(`${uploadedFiles.length} file(s) uploaded successfully!`);
    } catch (error) {
      console.error('Failed to upload files:', error);
      alert('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        ...formData,
        marks: Number(formData.marks),
        attachments: attachments
      };

      if (isEditMode) {
        await api.put(`/questions/${id}`, payload);
        alert('Question updated successfully!');
      } else {
        await api.post('/questions', payload);
        alert('Question created successfully!');
      }
      
      // Navigate back to the subject questions page if subjectId exists, otherwise to main questions page
      if (subjectId) {
        navigate(`/questions/subject/${subjectId}`);
      } else {
        navigate('/questions');
      }
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
        {isEditMode 
          ? selectedSubject
            ? `Edit Question - ${selectedSubject.name}`
            : 'Edit Question'
          : selectedSubject 
            ? `Create Question - ${selectedSubject.name}`
            : 'Create Question'}
      </h1>

      {loading && isEditMode ? (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p>Loading question...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
        {/* Show subject and chapter fields only when no subjectId in URL (both create and edit) */}
        {!subjectId && (
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
        )}

        {/* Show only chapter field when subjectId is provided - NO subject field (both create and edit) */}
        {subjectId && (
          <div>
            <Label htmlFor="chapter">Chapter *</Label>
            <select
              id="chapter"
              name="chapter"
              value={formData.chapter}
              onChange={handleChange}
              required
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            {selectedSubject && selectedSubject.chapters.length === 0 && (
              <p className="text-sm text-amber-600 mt-1">⚠️ No chapters available for this subject. Please add chapters in Subject Management.</p>
            )}
            {selectedSubject && selectedSubject.chapters.length > 0 && (
              <p className="text-sm text-green-600 mt-1">
                ✓ {selectedSubject.chapters.length} chapter(s) available
              </p>
            )}
          </div>
        )}

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

        {/* Attachments Section */}
        <div className="border-t pt-4">
          <Label className="text-base font-semibold mb-3 block">Attachments (Optional)</Label>
          
          {/* File Upload Button */}
          <div className="mb-4">
            <label className="flex items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none">
              <div className="flex flex-col items-center space-y-2">
                <Upload className="w-8 h-8 text-gray-400" />
                <span className="font-medium text-gray-600">
                  {uploading ? 'Uploading...' : 'Click to upload files'}
                </span>
                <span className="text-xs text-gray-500">
                  PDF, Images, Documents (Max 10MB per file)
                </span>
              </div>
              <input
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          </div>

          {/* Uploaded Files List */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Uploaded Files ({attachments.length})
              </p>
              <div className="space-y-2">
                {attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {attachment.fileType.startsWith('image/') ? (
                        <ImageIcon className="w-5 h-5 text-blue-500 shrink-0" />
                      ) : (
                        <FileText className="w-5 h-5 text-gray-500 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {attachment.fileName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(attachment.fileSize)}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveAttachment(index)}
                      className="shrink-0 ml-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : (isEditMode ? 'Update Question' : 'Create Question')}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => subjectId ? navigate(`/questions/subject/${subjectId}`) : navigate('/questions')}
          >
            Cancel
          </Button>
        </div>
      </form>
      )}
    </div>
  );
};

export default CreateQuestionPage;
