import { Schema, model, Types } from "mongoose";
import * as interfaces from "./interface";

const brandSchema = new Schema<interfaces.IBrand>(
  {
    workspaceId: { type: Types.ObjectId, ref: "Workspace", required: true },
    workspaceNanoId: { type: String, required: true },

    name: { type: String, required: true },
    logo: { type: String, required: false },
  },
  { timestamps: true },
);

const Brand = model<interfaces.IBrand>("Brand", brandSchema);

export default Brand;
