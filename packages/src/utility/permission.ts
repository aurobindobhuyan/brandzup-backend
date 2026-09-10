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
  entityId: string;
  userType: string;
}

export interface IBrandAccess extends IEntityAccess {
  fullBrandAccess: Boolean;
}

export interface IGuidelineAccess extends IEntityAccess {
  brandId: string;
}

export interface IPermission {
  userId: string;
  workspaceNanoId: string;

  access: {
    fullWorkspaceAccess?: boolean;
    userType: string;
    brandAccess?: IBrandAccess[];
    guidelineAccess?: IGuidelineAccess[];
  };

  invite: IInvite;

  isDeleted: boolean;
}