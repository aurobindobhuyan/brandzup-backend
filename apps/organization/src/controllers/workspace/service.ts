import { Response } from "express";
import { Types } from "mongoose";

import Permission from "@src/model/Permission/Permission";
import Workspace from "@src/model/Workspace/Workspace";
import { IInviteStatusKind } from "@src/model/Permission/interface";

import { createNanoId, errorResponse, IUserType } from "packages";

import { createPermission } from "../permission/service";

export const listAllWorkspaces = async ({
  res,
  userId,
}: {
  res: Response;
  userId: string;
}) => {
  const findAllPermissions = await Permission.find({ userId }).lean().exec();

  if (!findAllPermissions) {
    errorResponse(res, "Couldn't resolve your reqeust");
  }

  return findAllPermissions;
};

export const createWorkspace = async ({
  res,
  userId,
  name,
  description,
}: {
  res: Response;
  userId: string;
  name: string;
  description: string;
}) => {
  const findExisting = await Workspace.findOne({ ownerId: userId })
    .select("name")
    .lean()
    .exec();

  if (findExisting) {
    errorResponse(res, "You already own a Workspace");
  }

  const workspace = await Workspace.create({
    nanoId: createNanoId(),
    ownerId: userId,
    name,
    description,
  });

  // Create permission as Owner
  await createPermission({
    res,
    permission: {
      userId: new Types.ObjectId(userId),
      workspaceNanoId: workspace.nanoId,

      access: {
        fullWorkspaceAccess: true,
        userType: IUserType.Owner,
      },

      invite: {
        status: IInviteStatusKind.notRequired,
      },
      isDeleted: false,
    },
  });

  return workspace;
};

export const getWorkspace = async ({
  res,
  nanoId,
}: {
  res: Response;
  nanoId: string;
}) => {
  const findWorkspace = await Workspace.findOne({ nanoId })
    .lean()
    .exec();

  if (!findWorkspace) {
    errorResponse(res, "Wrokspace not found");
  }

  return findWorkspace;
};
