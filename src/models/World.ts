import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IWorld extends Document {
  name: string;
  genre: string;
  description: string;
  technologyLevel: string;
  magicLevel: string;
  historicalStartingPoint: string;
  currentYear: number;
  ownerId: Types.ObjectId;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedWith: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const worldSchema = new Schema<IWorld>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    genre: {
      type: String,
      required: true,
      enum: [
        "fantasy",
        "scifi",
        "cyberpunk",
        "post-apocalyptic",
        "medieval",
        "horror",
        "alternate-history",
        "space-civilization",
      ],
    },
    description: {
      type: String,
      default: "",
    },
    technologyLevel: {
      type: String,
      default: "",
    },
    magicLevel: {
      type: String,
      default: "",
    },
    historicalStartingPoint: {
      type: String,
      default: "",
    },
    currentYear: {
      type: Number,
      default: 0,
      validate: Number.isInteger,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedWith: {
      type: Schema.Types.ObjectId,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const World = mongoose.model<IWorld>("World", worldSchema);