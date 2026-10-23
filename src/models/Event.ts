import mongoose, { Schema, type Document, type Types } from "mongoose";

export const eventCategories = [
  "founding",
  "war",
  "birth",
  "death",
  "succession",
  "disaster",
  "treaty",
  "discovery",
  "other",
] as const;

export type EventCategory = (typeof eventCategories)[number];
export type EventSource = "manual" | "ai" | "simulation";

export interface IEvent extends Document {
  worldId: Types.ObjectId;
  ownerId: Types.ObjectId;
  year: number;
  title: string;
  description: string;
  category: EventCategory;
  source: EventSource;
  characterIds: Types.ObjectId[];
  kingdomIds: Types.ObjectId[];
  cityIds: Types.ObjectId[];
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedWith: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
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
    year: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      default: "",
      maxlength: 2000,
    },
    category: {
      type: String,
      required: true,
      enum: eventCategories,
    },
    source: {
      type: String,
      enum: ["manual", "ai", "simulation"],
      default: "manual",
    },
    characterIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Character",
      },
    ],
    kingdomIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Kingdom",
      },
    ],
    cityIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "City",
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

export const Event = mongoose.model<IEvent>("Event", eventSchema);
