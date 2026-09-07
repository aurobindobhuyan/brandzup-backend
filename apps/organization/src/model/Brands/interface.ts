import { ObjectId } from "mongoose";

export interface IBrand {
  workspaceId: ObjectId;
  workspaceNanoId: string;
  name: string;
  logo: string;
}
