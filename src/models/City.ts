import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface ICity extends Document {
  worldId: Types.ObjectId;
  kingdomId: Types.ObjectId;
  ownerId: Types.ObjectId;
  name: string;
  population: number;
  government: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const citySchema = new Schema<ICity>(
  {
    worldId: {
      type: Schema.Types.ObjectId,
      ref: "World",
      required: true,
    },
    kingdomId: {
      type: Schema.Types.ObjectId,
      ref: "Kingdom",
      required: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    population: {
      type: Number,
      default: 0,
    },
    government: {
      type: String,
      default: "",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const City = mongoose.model<ICity>("City", citySchema);
