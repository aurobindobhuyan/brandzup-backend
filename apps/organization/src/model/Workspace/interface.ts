import { Types } from "mongoose";

export interface IWorkspace {
  nanoId: string;
  ownerId: Types.ObjectId;
  name: string;
  description: string;
  logo?: string;
}
