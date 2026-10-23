import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IKingdom extends Document {
  worldId: Types.ObjectId;
  ownerId: Types.ObjectId;
  name: string;
  government: string;
  rulerId: Types.ObjectId | null;
  capitalCityId: Types.ObjectId | null;
  mapX: number | null;
  mapY: number | null;
  population: number;
  food: number;
  stability: number;
  droughtYearsLeft: number;
  allyIds: Types.ObjectId[];
  enemyIds: Types.ObjectId[];
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedWith: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const kingdomSchema = new Schema<IKingdom>(
  {
    worldId: {
      type: Schema.Types.ObjectId,
      ref: "World",
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
    government: {
      type: String,
      default: "",
    },
    rulerId: {
      type: Schema.Types.ObjectId,
      ref: "Character",
      default: null,
    },
    capitalCityId: {
      type: Schema.Types.ObjectId,
      ref: "City",
      default: null,
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
    population: {
      type: Number,
      default: 0,
    },
    food: {
      type: Number,
      default: 0,
      min: 0,
    },
    stability: {
      type: Number,
      default: 70,
      min: 0,
      max: 100,
    },
    droughtYearsLeft: {
      type: Number,
      default: 0,
      min: 0,
      validate: Number.isInteger,
    },
    allyIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Kingdom",
      },
    ],
    enemyIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Kingdom",
      },
    ],
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

export const Kingdom = mongoose.model<IKingdom>("Kingdom", kingdomSchema);