import { IPermission } from "@src/model/Permission/interface";
import Permission from "@src/model/Permission/Permission";
import { Response } from "express";
import { errorResponse } from "packages";

export const createPermission = async ({
  res,
  permission: { userId, workspaceNanoId, access, invite },
}: {
  res: Response;
  permission: IPermission;
}) => {
  const findPermission = await Permission.find({ userId, workspaceNanoId })
    .lean()
    .exec();

  if (findPermission) {
    errorResponse(res, "User is already a part of this workspace");
  }

  // Create Permission
  const permission = await Permission.create({
    userId,
    workspaceNanoId,

    access,

    invite,
    isDeleted: false,
  });

  return permission;
};
