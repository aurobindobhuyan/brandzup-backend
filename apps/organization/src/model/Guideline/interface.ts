import { Types } from "mongoose";

export interface IGuideline {
  createdBy: Types.ObjectId;
  brandId: Types.ObjectId;
  workspaceId: Types.ObjectId;

  nanoId: string;
  brandNanoId: string;
  workspaceNanoId: string;

  name: string;
  description: string;
  logo?: string;

  status: "published" | "draft";

  createdAt: Date;
}
