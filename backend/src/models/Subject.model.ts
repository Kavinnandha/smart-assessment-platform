import mongoose, { Document, Schema } from 'mongoose';

export interface IChapter {
  name: string;
  topics: string[];
}

export interface ISubject extends Document {
  name: string;
  chapters: IChapter[];
  createdAt: Date;
  updatedAt: Date;
}

const ChapterSchema = new Schema<IChapter>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    topics: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const SubjectSchema = new Schema<ISubject>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    chapters: {
      type: [ChapterSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster subject lookups
SubjectSchema.index({ name: 1 });

const Subject = mongoose.model<ISubject>('Subject', SubjectSchema);

export default Subject;
