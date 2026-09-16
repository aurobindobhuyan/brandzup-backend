import { Types } from "mongoose";

export interface IBrand {
  createdBy: Types.ObjectId;
  workspaceId: Types.ObjectId;

  brandNanoId: string;
  workspaceNanoId: string;
  name: string;
  logo: string;

  createdAt: Date;
}
