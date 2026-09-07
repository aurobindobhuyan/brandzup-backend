import { Types } from "mongoose";
import { IUserType } from "packages";

export enum IInviteStatusKind {
  notRequired = "NotRequired",
  pending = "Pending",
  accepted = "Accepted",
  rejected = "Rejected",
}

export interface IInvite {
  token?: string;
  status: IInviteStatusKind;

  createdAt?: string;
  updatedAt?: string;
}

export interface IEntityAccess {
  entityId: Types.ObjectId;
  userType: IUserType;
}

export interface IBrandAccess extends IEntityAccess {
  fullBrandAccess: Boolean;
}

export interface IGuidelineAccess extends IEntityAccess {
  brandId: Types.ObjectId;
}

export interface IPermission {
  userId: Types.ObjectId;
  workspaceNanoId: string;

  access: {
    fullWorkspaceAccess?: boolean;
    userType: IUserType;
    brandAccess?: IBrandAccess[];
    guidelineAccess?: IGuidelineAccess[];
  };

  invite: IInvite;

  isDeleted: boolean;
}
