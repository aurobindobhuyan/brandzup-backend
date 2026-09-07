import { Types } from "mongoose";

export interface IGuideline {
  brandId: Types.ObjectId;
  workspaceId: Types.ObjectId;

  brandNanoId: string;
  workspaceNanoId: string;

  name: string;
  description: string;
  logo?: string;
}
