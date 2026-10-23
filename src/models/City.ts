import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface ICity extends Document {
  worldId: Types.ObjectId;
  kingdomId: Types.ObjectId;
  ownerId: Types.ObjectId;
  name: string;
  population: number;
  government: string;
  mapX: number | null;
  mapY: number | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedWith: Types.ObjectId | null;
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
    mapX: {
      type: Number,
      default: null,
      min: 0,
      max: 1000,
      validate: (value: number | null) => value === null || Number.isFinite(value),
    },
    mapY: {
      type: Number,
      default: null,
      min: 0,
      max: 1000,
      validate: (value: number | null) => value === null || Number.isFinite(value),
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

export const City = mongoose.model<ICity>("City", citySchema);
