import mongoose, { Document, Schema } from 'mongoose';

export enum DifficultyLevel {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

export interface IQuestion extends Document {
  questionNumber: string;
  chapter: string;
  topic?: string;
  marks: number;
  difficultyLevel: DifficultyLevel;
  questionText: string;
  questionImage?: string;
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }>;
  options?: string[];
  correctAnswer?: string;
  subject: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<IQuestion>(
  {
    questionNumber: {
      type: String,
      required: true
    },
    chapter: {
      type: String,
      required: true
    },
    topic: {
      type: String,
      required: false
    },
    marks: {
      type: Number,
      required: true,
      min: 0
    },
    difficultyLevel: {
      type: String,
      enum: Object.values(DifficultyLevel),
      required: true
    },
    questionText: {
      type: String,
      required: true
    },
    questionImage: {
      type: String
    },
    attachments: [{
      fileName: {
        type: String,
        required: true
      },
      fileUrl: {
        type: String,
        required: true
      },
      fileType: {
        type: String,
        required: true
      },
      fileSize: {
        type: Number,
        required: true
      }
    }],
    options: [{
      type: String
    }],
    correctAnswer: {
      type: String
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient querying
questionSchema.index({ chapter: 1, topic: 1 });
questionSchema.index({ difficultyLevel: 1 });
questionSchema.index({ subject: 1 });

export default mongoose.model<IQuestion>('Question', questionSchema);
