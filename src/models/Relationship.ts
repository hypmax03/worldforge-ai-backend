import mongoose, { Schema, type Document, type Types } from "mongoose";

export type RelationshipEntityType = "character" | "kingdom";

export type RelationshipType =
  | "parent"
  | "spouse"
  | "sibling"
  | "friend"
  | "enemy"
  | "ally"
  | "rival"
  | "mentor"
  | "serves"
  | "at_war_with"
  | "allied_with"
  | "trade_partner";

export interface IRelationship extends Document {
  worldId: Types.ObjectId;
  ownerId: Types.ObjectId;
  fromType: RelationshipEntityType;
  fromId: Types.ObjectId;
  toType: RelationshipEntityType;
  toId: Types.ObjectId;
  type: RelationshipType;
  notes: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const relationshipSchema = new Schema<IRelationship>(
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
    fromType: {
      type: String,
      enum: ["character", "kingdom"],
      required: true,
    },
    fromId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    toType: {
      type: String,
      enum: ["character", "kingdom"],
      required: true,
    },
    toId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    type: {
      type: String,
      enum: [
        "parent",
        "spouse",
        "sibling",
        "friend",
        "enemy",
        "ally",
        "rival",
        "mentor",
        "serves",
        "at_war_with",
        "allied_with",
        "trade_partner",
      ],
      required: true,
    },
    notes: {
      type: String,
      default: "",
      maxlength: 300,
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

relationshipSchema.index({ worldId: 1, fromId: 1, toId: 1, type: 1 });

export const Relationship = mongoose.model<IRelationship>(
  "Relationship",
  relationshipSchema
);
