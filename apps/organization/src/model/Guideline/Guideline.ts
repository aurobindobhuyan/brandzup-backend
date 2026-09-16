import { Schema, Types, model } from "mongoose";
import { IGuideline } from "./interface";

const guidelineSchema = new Schema<IGuideline>(
  {
    createdBy: { type: Types.ObjectId, required: true, ref: "User" },

    brandId: { type: Types.ObjectId, required: true, ref: "Brand" },
    workspaceId: { type: Types.ObjectId, required: true, ref: "Workspace" },

    nanoId: { type: String, required: true },
    brandNanoId: { type: String, required: true },
    workspaceNanoId: { type: String, required: true },

    name: { type: String, required: true },
    description: { type: String, required: false, default: "" },
    logo: { type: String, required: false },

    status: { type: String, enum: ["published", "draft"], default: "draft" },
  },
  { timestamps: true },
);

const Guideline = model<IGuideline>("Guideline", guidelineSchema);

export default Guideline;
