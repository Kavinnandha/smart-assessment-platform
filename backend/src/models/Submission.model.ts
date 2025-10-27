import mongoose, { Document, Schema } from 'mongoose';

export interface IAnswer {
  question: mongoose.Types.ObjectId;
  answerText?: string;
  answerImage?: string;
  marksObtained?: number;
  remarks?: string;
}

export interface ISubmission extends Document {
  test: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  answers: IAnswer[];
  totalMarksObtained?: number;
  submittedAt: Date;
  evaluatedBy?: mongoose.Types.ObjectId;
  evaluatedAt?: Date;
  timeTaken?: number; // in minutes
  status: 'submitted' | 'evaluated' | 'pending';
  createdAt: Date;
  updatedAt: Date;
}

const submissionSchema = new Schema<ISubmission>(
  {
    test: {
      type: Schema.Types.ObjectId,
      ref: 'Test',
      required: true
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    answers: [{
      question: {
        type: Schema.Types.ObjectId,
        ref: 'Question',
        required: true
      },
      answerText: {
        type: String
      },
      answerImage: {
        type: String
      },
      marksObtained: {
        type: Number,
        min: 0
      },
      remarks: {
        type: String
      }
    }],
    totalMarksObtained: {
      type: Number,
      min: 0
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    evaluatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    evaluatedAt: {
      type: Date
    },
    timeTaken: {
      type: Number
    },
    status: {
      type: String,
      enum: ['submitted', 'evaluated', 'pending'],
      default: 'pending'
    }
  },
  {
    timestamps: true
  }
);

// Indexes
submissionSchema.index({ test: 1, student: 1 }, { unique: true });
submissionSchema.index({ student: 1 });
submissionSchema.index({ status: 1 });

export default mongoose.model<ISubmission>('Submission', submissionSchema);
