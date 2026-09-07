import { Schema, model, Types } from "mongoose";
import { IWorkspace } from "./interface";

const workspaceSchema = new Schema<IWorkspace>(
  {
    nanoId: { type: String, required: true },
    ownerId: { type: Types.ObjectId, ref: "User", required: true },

    name: { type: String, required: true },
    description: { type: String, required: false, default: "" },

    logo: { type: String, required: false },
  },
  { timestamps: true },
);

workspaceSchema.index({ ownerId: 1, nanoId: 1 }, { unique: true });

const Workspace = model<IWorkspace>("Workspace", workspaceSchema);

export default Workspace;
