import { Types } from "mongoose";

export interface IGuideline {
  brandId: Types.ObjectId;
  workspaceId: Types.ObjectId;

  name: string;
  description: string;
  logo?: string;
}
