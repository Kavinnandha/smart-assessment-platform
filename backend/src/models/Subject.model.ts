import mongoose, { Document, Schema } from 'mongoose';

export interface ISubject extends Document {
  name: string;
  chapters: string[];
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema = new Schema<ISubject>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    chapters: {
      type: [String],
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
