import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Search, Download, Trash2, BookOpen, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

  const handleExportPDF = async () => {
    try {
      // Get filtered questions
      const filteredQuestions = questions.filter((q: any) => {
        if (filter.difficulty && q.difficultyLevel !== filter.difficulty) return false;
        if (filter.chapter && q.chapter !== filter.chapter) return false;
        if (filter.topic && q.topic !== filter.topic) return false;
        return true;
      });

      if (filteredQuestions.length === 0) {
        alert('No questions to export');
        return;
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(subject?.name || 'Questions', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      // Filters info
      const filterInfo = [];
      if (filter.chapter) filterInfo.push(`Chapter: ${filter.chapter}`);
      if (filter.topic) filterInfo.push(`Topic: ${filter.topic}`);
      if (filter.difficulty) filterInfo.push(`Difficulty: ${filter.difficulty}`);
      
      if (filterInfo.length > 0) {
        doc.text(`Filters: ${filterInfo.join(', ')}`, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 7;
      }
      
      doc.text(`Total Questions: ${filteredQuestions.length}`, pageWidth / 2, yPosition, { align: 'center' });
      doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition + 5, { align: 'center' });
      
      yPosition += 15;

      // Group questions by chapter
      const questionsByChapter = filteredQuestions.reduce((acc: any, question: any) => {
        const chapterName = question.chapter || 'No Chapter';
        if (!acc[chapterName]) {
          acc[chapterName] = [];
        }
        acc[chapterName].push(question);
        return acc;
      }, {});

      // Add questions
      Object.entries(questionsByChapter).forEach(([chapter, chapterQuestions]: [string, any]) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
        }

        // Chapter header
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(240, 240, 240);
        doc.rect(10, yPosition - 5, pageWidth - 20, 10, 'F');
        doc.text(`Chapter: ${chapter}`, 15, yPosition + 2);
        yPosition += 12;

        // Questions table
        const tableData = chapterQuestions.map((q: any, index: number) => [
          q.questionNumber || `Q${index + 1}`,
          q.topic || '-',
          q.difficultyLevel || '-',
          q.marks?.toString() || '-',
          q.questionType || '-',
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [['Q No.', 'Topic', 'Difficulty', 'Marks', 'Type']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [66, 66, 66], fontSize: 9 },
          bodyStyles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 50 },
            2: { cellWidth: 25 },
            3: { cellWidth: 20 },
            4: { cellWidth: 35 },
          },
          margin: { left: 10, right: 10 },
          didDrawPage: () => {
            // Footer
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(
              `Page ${doc.getCurrentPageInfo().pageNumber}`,
              pageWidth / 2,
              pageHeight - 10,
              { align: 'center' }
            );
          },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 10;
      });

      // Save the PDF
      const fileName = `questions-${subject?.name || 'export'}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Failed to export questions as PDF');
    }
  };

  const handleExportDetailedPDF = async () => {
    try {
      // Get filtered questions
      const filteredQuestions = questions.filter((q: any) => {
        if (filter.difficulty && q.difficultyLevel !== filter.difficulty) return false;
        if (filter.chapter && q.chapter !== filter.chapter) return false;
        if (filter.topic && q.topic !== filter.topic) return false;
        return true;
      });

      if (filteredQuestions.length === 0) {
        alert('No questions to export');
        return;
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (2 * margin);
      let yPosition = 20;

      // Helper function to add page footer
      const addFooter = () => {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Page ${doc.getCurrentPageInfo().pageNumber} | ${subject?.name || 'Questions'}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
        doc.setTextColor(0, 0, 0);
      };

      // Helper function to check space and add new page if needed
      const checkSpace = (requiredSpace: number) => {
        if (yPosition + requiredSpace > pageHeight - 25) {
          addFooter();
          doc.addPage();
          yPosition = 20;
          return true;
        }
        return false;
      };

      // Title page
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(subject?.name || 'Questions Bank', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 15;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      
      // Filters info
      const filterInfo = [];
      if (filter.chapter) filterInfo.push(`Chapter: ${filter.chapter}`);
      if (filter.topic) filterInfo.push(`Topic: ${filter.topic}`);
      if (filter.difficulty) filterInfo.push(`Difficulty: ${filter.difficulty}`);
      
      if (filterInfo.length > 0) {
        filterInfo.forEach(info => {
          doc.text(info, pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 7;
        });
      }
      
      yPosition += 5;
      doc.text(`Total Questions: ${filteredQuestions.length}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 7;
      doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 20;

      // Statistics box
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(margin, yPosition, contentWidth, 35, 3, 3, 'FD');
      
      yPosition += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Statistics', margin + 5, yPosition);
      
      yPosition += 7;
      doc.setFont('helvetica', 'normal');
      const stats = [
        `Easy: ${filteredQuestions.filter((q: any) => q.difficultyLevel === 'easy').length}`,
        `Medium: ${filteredQuestions.filter((q: any) => q.difficultyLevel === 'medium').length}`,
        `Hard: ${filteredQuestions.filter((q: any) => q.difficultyLevel === 'hard').length}`,
        `Total Marks: ${filteredQuestions.reduce((sum: number, q: any) => sum + (q.marks || 0), 0)}`
      ];
      stats.forEach(stat => {
        doc.text(`• ${stat}`, margin + 10, yPosition);
        yPosition += 6;
      });

      // Start questions on new page
      addFooter();
      doc.addPage();
      yPosition = 20;

      // Group questions by chapter
      const questionsByChapter = filteredQuestions.reduce((acc: any, question: any) => {
        const chapterName = question.chapter || 'No Chapter';
        if (!acc[chapterName]) {
          acc[chapterName] = [];
        }
        acc[chapterName].push(question);
        return acc;
      }, {});

      // Add detailed questions
      Object.entries(questionsByChapter).forEach(([chapter, chapterQuestions]: [string, any]) => {
        checkSpace(20);

        // Chapter header
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(240, 240, 240);
        doc.roundedRect(margin, yPosition - 5, contentWidth, 12, 2, 2, 'F');
        doc.text(`Chapter: ${chapter}`, margin + 5, yPosition + 3);
        yPosition += 15;

        chapterQuestions.forEach((q: any, index: number) => {
          checkSpace(40);

          // Question number and metadata
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(`${q.questionNumber || `Q${index + 1}`}.`, margin, yPosition);
          
          // Metadata badges
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          let badgeX = margin + 25;
          
          // Topic badge
          if (q.topic) {
            doc.setFillColor(230, 240, 255);
            doc.roundedRect(badgeX, yPosition - 3, doc.getTextWidth(q.topic) + 4, 5, 1, 1, 'F');
            doc.text(q.topic, badgeX + 2, yPosition);
            badgeX += doc.getTextWidth(q.topic) + 8;
          }
          
          // Difficulty badge
          const diffColors: any = {
            easy: [200, 255, 200],
            medium: [255, 240, 200],
            hard: [255, 200, 200]
          };
          const diffColor = diffColors[q.difficultyLevel] || [240, 240, 240];
          doc.setFillColor(diffColor[0], diffColor[1], diffColor[2]);
          const diffText = q.difficultyLevel?.toUpperCase() || 'N/A';
          doc.roundedRect(badgeX, yPosition - 3, doc.getTextWidth(diffText) + 4, 5, 1, 1, 'F');
          doc.text(diffText, badgeX + 2, yPosition);
          badgeX += doc.getTextWidth(diffText) + 8;
          
          // Marks badge
          doc.setFillColor(255, 230, 200);
          const marksText = `${q.marks || 0} marks`;
          doc.roundedRect(badgeX, yPosition - 3, doc.getTextWidth(marksText) + 4, 5, 1, 1, 'F');
          doc.text(marksText, badgeX + 2, yPosition);
          
          yPosition += 8;

          // Question text
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          const questionLines = doc.splitTextToSize(q.questionText || 'No question text', contentWidth - 5);
          questionLines.forEach((line: string) => {
            checkSpace(7);
            doc.text(line, margin + 5, yPosition);
            yPosition += 5;
          });

          yPosition += 3;

          // Options for MCQ
          if (q.questionType === 'multiple-choice' && q.options && q.options.length > 0) {
            doc.setFont('helvetica', 'normal');
            q.options.forEach((option: string, optIndex: number) => {
              checkSpace(6);
              const isCorrect = option === q.correctAnswer;
              if (isCorrect) {
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 128, 0);
              }
              const optionText = `   ${String.fromCharCode(65 + optIndex)}. ${option}`;
              doc.text(optionText, margin + 5, yPosition);
              if (isCorrect) {
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0, 0, 0);
              }
              yPosition += 5;
            });
            yPosition += 2;
          }

          // Answer section
          if (q.correctAnswer && q.questionType !== 'multiple-choice') {
            checkSpace(15);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 100, 0);
            doc.text('Answer:', margin + 5, yPosition);
            yPosition += 5;
            
            doc.setFont('helvetica', 'normal');
            const answerLines = doc.splitTextToSize(q.correctAnswer, contentWidth - 10);
            answerLines.forEach((line: string) => {
              checkSpace(5);
              doc.text(line, margin + 10, yPosition);
              yPosition += 4;
            });
            doc.setTextColor(0, 0, 0);
            yPosition += 3;
          }

          // Separator line
          doc.setDrawColor(220, 220, 220);
          doc.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += 8;
        });

        yPosition += 5;
      });

      addFooter();

      // Save the PDF
      const fileName = `questions-detailed-${subject?.name || 'export'}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Failed to export detailed PDF:', error);
      alert('Failed to export questions as detailed PDF');
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF (Summary)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportDetailedPDF} className="cursor-pointer">
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF (Detailed)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport} className="cursor-pointer">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
