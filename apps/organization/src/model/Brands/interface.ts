import { ObjectId } from "mongoose";

export interface IBrand {
  workspaceId: ObjectId;
  name: string;
  logo: string;
}
