import mongoose, { Document, Schema } from 'mongoose';

export enum DifficultyLevel {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple-choice',
  TRUE_FALSE = 'true-false',
  SHORT_ANSWER = 'short-answer',
  LONG_ANSWER = 'long-answer'
}

export enum AttachmentPosition {
  BEFORE = 'before',
  AFTER = 'after',
  CUSTOM = 'custom'
}

export interface IQuestion extends Document {
  chapter: string;
  topic?: string;
  marks: number;
  difficultyLevel: DifficultyLevel;
  questionType: QuestionType;
  questionText: string;
  questionImage?: string;
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }>;
  attachmentPosition?: AttachmentPosition;
  options?: string[];
  correctAnswer?: string;
  correctAnswerAttachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }>;
  correctAnswerAttachmentPosition?: AttachmentPosition;
  subject: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<IQuestion>(
  {
    chapter: {
      type: String,
      required: true
    },
    topic: {
      type: String,
      required: true
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
    questionType: {
      type: String,
      enum: Object.values(QuestionType),
      required: true,
      default: QuestionType.SHORT_ANSWER
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
    attachmentPosition: {
      type: String,
      enum: Object.values(AttachmentPosition),
      default: AttachmentPosition.AFTER
    },
    options: [{
      type: String
    }],
    correctAnswer: {
      type: String,
      required: true
    },
    correctAnswerAttachments: [{
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
    correctAnswerAttachmentPosition: {
      type: String,
      enum: Object.values(AttachmentPosition),
      default: AttachmentPosition.AFTER
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
