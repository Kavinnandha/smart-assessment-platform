import express from 'express';
import Subject from '../models/Subject.model';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../models/User.model';

const router = express.Router();

// Get all subjects (accessible to all authenticated users)
router.get('/', authenticate, async (req, res) => {
  try {
    const subjects = await Subject.find().sort({ name: 1 });
    res.json(subjects);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Get subject by ID (accessible to all authenticated users)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    res.json(subject);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Create new subject (Admin only)
router.post('/', authenticate, authorize(UserRole.ADMIN), async (req, res) => {
  try {
    const { name, chapters } = req.body;

    // Check if subject already exists
    const existingSubject = await Subject.findOne({ name: name.trim() });
    if (existingSubject) {
      return res.status(400).json({ message: 'Subject with this name already exists' });
    }

    // Create subject with chapters (each chapter has name and topics array)
    const subject = new Subject({
      name: name.trim(),
      chapters: chapters || [],
    });

    await subject.save();
    res.status(201).json({ message: 'Subject created successfully', subject });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Update subject (Admin only)
router.put('/:id', authenticate, authorize(UserRole.ADMIN), async (req, res) => {
  try {
    const { name, chapters } = req.body;

    // Check if another subject has the same name
    if (name) {
      const existingSubject = await Subject.findOne({ 
        name: name.trim(),
        _id: { $ne: req.params.id }
      });
      if (existingSubject) {
        return res.status(400).json({ message: 'Subject with this name already exists' });
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (chapters !== undefined) updateData.chapters = chapters;

    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    res.json({ message: 'Subject updated successfully', subject });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Delete subject (Admin only)
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    res.json({ message: 'Subject deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Add chapter to subject (Admin only)
router.post('/:id/chapters', authenticate, authorize(UserRole.ADMIN), async (req, res) => {
  try {
    const { name, topics } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Chapter name is required' });
    }

    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Check if chapter already exists
    const chapterExists = subject.chapters.some(ch => ch.name === name.trim());
    if (chapterExists) {
      return res.status(400).json({ message: 'Chapter already exists in this subject' });
    }

    subject.chapters.push({ name: name.trim(), topics: topics || [] });
    await subject.save();

    res.json({ message: 'Chapter added successfully', subject });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Update chapter in subject (Admin only)
router.put('/:id/chapters/:chapterIndex', authenticate, authorize(UserRole.ADMIN), async (req, res) => {
  try {
    const { name, topics } = req.body;
    const chapterIndex = parseInt(req.params.chapterIndex);

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Chapter name is required' });
    }

    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    if (chapterIndex < 0 || chapterIndex >= subject.chapters.length) {
      return res.status(400).json({ message: 'Invalid chapter index' });
    }

    // Check if new chapter name already exists (excluding current index)
    const existingIndex = subject.chapters.findIndex((ch, idx) => 
      ch.name === name.trim() && idx !== chapterIndex
    );
    if (existingIndex !== -1) {
      return res.status(400).json({ message: 'Chapter with this name already exists' });
    }

    subject.chapters[chapterIndex].name = name.trim();
    if (topics !== undefined) {
      subject.chapters[chapterIndex].topics = topics;
    }
    await subject.save();

    res.json({ message: 'Chapter updated successfully', subject });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Delete chapter from subject (Admin only)
router.delete('/:id/chapters/:chapterIndex', authenticate, authorize(UserRole.ADMIN), async (req, res) => {
  try {
    const chapterIndex = parseInt(req.params.chapterIndex);

    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    if (chapterIndex < 0 || chapterIndex >= subject.chapters.length) {
      return res.status(400).json({ message: 'Invalid chapter index' });
    }

    subject.chapters.splice(chapterIndex, 1);
    await subject.save();

    res.json({ message: 'Chapter deleted successfully', subject });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Add topic to chapter (Admin only)
router.post('/:id/chapters/:chapterIndex/topics', authenticate, authorize(UserRole.ADMIN), async (req, res) => {
  try {
    const { topic } = req.body;
    const chapterIndex = parseInt(req.params.chapterIndex);

    if (!topic || !topic.trim()) {
      return res.status(400).json({ message: 'Topic name is required' });
    }

    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    if (chapterIndex < 0 || chapterIndex >= subject.chapters.length) {
      return res.status(400).json({ message: 'Invalid chapter index' });
    }

    const chapter = subject.chapters[chapterIndex];
    
    // Check if topic already exists in this chapter
    if (chapter.topics.includes(topic.trim())) {
      return res.status(400).json({ message: 'Topic already exists in this chapter' });
    }

    chapter.topics.push(topic.trim());
    await subject.save();

    res.json({ message: 'Topic added successfully', subject });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Update topic in chapter (Admin only)
router.put('/:id/chapters/:chapterIndex/topics/:topicIndex', authenticate, authorize(UserRole.ADMIN), async (req, res) => {
  try {
    const { topic } = req.body;
    const chapterIndex = parseInt(req.params.chapterIndex);
    const topicIndex = parseInt(req.params.topicIndex);

    if (!topic || !topic.trim()) {
      return res.status(400).json({ message: 'Topic name is required' });
    }

    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    if (chapterIndex < 0 || chapterIndex >= subject.chapters.length) {
      return res.status(400).json({ message: 'Invalid chapter index' });
    }

    const chapter = subject.chapters[chapterIndex];

    if (topicIndex < 0 || topicIndex >= chapter.topics.length) {
      return res.status(400).json({ message: 'Invalid topic index' });
    }

    // Check if new topic name already exists (excluding current index)
    const existingIndex = chapter.topics.findIndex((t, idx) => 
      t === topic.trim() && idx !== topicIndex
    );
    if (existingIndex !== -1) {
      return res.status(400).json({ message: 'Topic with this name already exists in this chapter' });
    }

    chapter.topics[topicIndex] = topic.trim();
    await subject.save();

    res.json({ message: 'Topic updated successfully', subject });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Delete topic from chapter (Admin only)
router.delete('/:id/chapters/:chapterIndex/topics/:topicIndex', authenticate, authorize(UserRole.ADMIN), async (req, res) => {
  try {
    const chapterIndex = parseInt(req.params.chapterIndex);
    const topicIndex = parseInt(req.params.topicIndex);

    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    if (chapterIndex < 0 || chapterIndex >= subject.chapters.length) {
      return res.status(400).json({ message: 'Invalid chapter index' });
    }

    const chapter = subject.chapters[chapterIndex];

    if (topicIndex < 0 || topicIndex >= chapter.topics.length) {
      return res.status(400).json({ message: 'Invalid topic index' });
    }

    chapter.topics.splice(topicIndex, 1);
    await subject.save();

    res.json({ message: 'Topic deleted successfully', subject });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

export default router;
