import mongoose, { Document, Schema } from 'mongoose';

export enum UserRole {
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STUDENT = 'student'
}

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  subjects?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true
    },
    subjects: [{
      type: Schema.Types.ObjectId,
      ref: 'Subject'
    }]
  },
  {
    timestamps: true
  }
);

export default mongoose.model<IUser>('User', userSchema);
