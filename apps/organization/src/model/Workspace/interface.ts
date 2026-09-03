import { Types } from "mongoose";

export interface IWorkspace {
  ownerId: Types.ObjectId;
  name: string;
  description: string;
  logo?: string;
}
