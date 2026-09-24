import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface ICharacter extends Document {
  worldId: Types.ObjectId;
  ownerId: Types.ObjectId;
  kingdomId: Types.ObjectId | null;
  cityId: Types.ObjectId | null;
  name: string;
  age: number;
  gender: string;
  race: string;
  occupation: string;
  isAlive: boolean;
  parentIds: Types.ObjectId[];
  spouseId: Types.ObjectId | null;
  allyIds: Types.ObjectId[];
  enemyIds: Types.ObjectId[];
  biography: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const characterSchema = new Schema<ICharacter>(
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
    kingdomId: {
      type: Schema.Types.ObjectId,
      ref: "Kingdom",
      default: null,
    },
    cityId: {
      type: Schema.Types.ObjectId,
      ref: "City",
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    age: {
      type: Number,
      default: 0,
    },
    gender: {
      type: String,
      default: "",
    },
    race: {
      type: String,
      default: "",
    },
    occupation: {
      type: String,
      default: "",
    },
    isAlive: {
      type: Boolean,
      default: true,
    },
    parentIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Character",
      },
    ],
    spouseId: {
      type: Schema.Types.ObjectId,
      ref: "Character",
      default: null,
    },
    allyIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Character",
      },
    ],
    enemyIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Character",
      },
    ],
    biography: {
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

export const Character = mongoose.model<ICharacter>("Character", characterSchema);
