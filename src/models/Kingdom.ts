import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IKingdom extends Document {
  worldId: Types.ObjectId;
  ownerId: Types.ObjectId;
  name: string;
  government: string;
  rulerId: Types.ObjectId | null;
  capitalCityId: Types.ObjectId | null;
  population: number;
  allyIds: Types.ObjectId[];
  enemyIds: Types.ObjectId[];
  isDeleted: boolean;
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
    population: {
      type: Number,
      default: 0,
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
  },
  {
    timestamps: true,
  }
);

export const Kingdom = mongoose.model<IKingdom>("Kingdom", kingdomSchema);