import { Response } from 'express';
import Question, { DifficultyLevel } from '../models/Question.model';
import Subject from '../models/Subject.model';
import Group from '../models/Group.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../models/User.model';
import XLSX from 'xlsx';

export const createQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const question = new Question({
      ...req.body,
      createdBy: req.user?.userId
    });

    await question.save();
    res.status(201).json({ message: 'Question created successfully', question });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getQuestions = async (req: AuthRequest, res: Response) => {
  try {
    const { chapter, topic, difficultyLevel, subject, search } = req.query;
    
    const filter: any = {};
    if (chapter) filter.chapter = chapter;
    if (topic) filter.topic = topic;
    if (difficultyLevel) filter.difficultyLevel = difficultyLevel;
    if (subject) filter.subject = subject;
    if (search) {
      filter.$or = [
        { questionText: { $regex: search, $options: 'i' } }
      ];
    }

    // If user is a teacher, filter questions based on assigned subjects
    if (req.user?.role === UserRole.TEACHER) {
      // Find all groups where the teacher is assigned
      const teacherGroups = await Group.find({ 
        teachers: req.user.userId 
      }).distinct('subject');
      
      // Add subject filter to only show questions from assigned subjects
      filter.subject = { $in: teacherGroups };
    }

    const questions = await Question.find(filter)
      .populate('createdBy', 'name email')
      .populate('subject', 'name')
      .sort({ createdAt: -1 });

    res.json({ questions });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getQuestionById = async (req: AuthRequest, res: Response) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('subject', 'name');

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    res.json({ question });
  } catch (error) {
    console.error('Get question error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('subject', 'name');

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    res.json({ message: 'Question updated successfully', question });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};;

export const deleteQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const importQuestions = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const questions = data.map((row: any) => ({
      chapter: row['Chapter'] || row.chapter,
      topic: row['Topic'] || row.topic,
      marks: Number(row['Marks'] || row.marks),
      difficultyLevel: (row['Difficulty Level'] || row.difficultyLevel)?.toLowerCase(),
      questionText: row['Question Text'] || row.questionText,
      subject: row['Subject'] || row.subject,
      createdBy: req.user?.userId
    }));

    const created = await Question.insertMany(questions);
    res.status(201).json({ 
      message: `${created.length} questions imported successfully`, 
      count: created.length 
    });
  } catch (error) {
    console.error('Import questions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const exportQuestions = async (req: AuthRequest, res: Response) => {
  try {
    const { subject, chapter } = req.query;
    const filter: any = {};
    if (subject) filter.subject = subject;
    if (chapter) filter.chapter = chapter;

    const questions = await Question.find(filter).lean();

    const exportData = questions.map(q => ({
      'Chapter': q.chapter,
      'Topic': q.topic,
      'Marks': q.marks,
      'Difficulty Level': q.difficultyLevel,
      'Question Text': q.questionText,
      'Subject': q.subject
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=questions.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Export questions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
