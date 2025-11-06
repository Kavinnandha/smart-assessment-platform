import mongoose, { Document, Schema } from 'mongoose';

export interface ITestQuestion {
  question: mongoose.Types.ObjectId;
  marks: number;
  order: number;
}

export interface ITest extends Document {
  title: string;
  subject: mongoose.Types.ObjectId;
  description?: string;
  duration: number; // in minutes
  totalMarks: number;
  questions: ITestQuestion[];
  createdBy: mongoose.Types.ObjectId;
  assignedTo: mongoose.Types.ObjectId[]; // Student IDs (for individual assignment)
  assignedGroups: mongoose.Types.ObjectId[]; // Group IDs (for group assignment)
  scheduledDate?: Date;
  deadline?: Date;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const testSchema = new Schema<ITest>(
  {
    title: {
      type: String,
      required: true
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: true
    },
    description: {
      type: String
    },
    duration: {
      type: Number,
      required: true,
      min: 1
    },
    totalMarks: {
      type: Number,
      required: true,
      min: 0
    },
    questions: [{
      question: {
        type: Schema.Types.ObjectId,
        ref: 'Question',
        required: true
      },
      marks: {
        type: Number,
        required: true
      },
      order: {
        type: Number,
        required: true
      }
    }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    assignedTo: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    assignedGroups: [{
      type: Schema.Types.ObjectId,
      ref: 'Group'
    }],
    scheduledDate: {
      type: Date
    },
    deadline: {
      type: Date
    },
    isPublished: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Indexes
testSchema.index({ createdBy: 1 });
testSchema.index({ assignedTo: 1 });
testSchema.index({ assignedGroups: 1 });
testSchema.index({ scheduledDate: 1 });

export default mongoose.model<ITest>('Test', testSchema);
