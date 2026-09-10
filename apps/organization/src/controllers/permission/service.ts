import { IInviteStatusKind, IPermission } from "@src/model/Permission/interface";
import Permission from "@src/model/Permission/Permission";
import { Response } from "express";
import { OperationalError } from "packages";

export const createPermission = async ({
  res,
  permission: { userId, workspaceId, workspaceNanoId, access, invite },
}: {
  res: Response;
  permission: IPermission;
}) => {
  // findOne, not find: find() returns an array, which is truthy even when empty.
  const findPermission = await Permission.findOne({ userId, workspaceNanoId })
    .lean()
    .exec();

  if (findPermission) {
    throw new OperationalError(400, "User is already a part of this workspace");
  }

  // Create Permission
  const permission = await Permission.create({
    userId,
    workspaceId,
    workspaceNanoId,

    access,

    invite,
    isDeleted: false,
  });

  return permission;
};

/**
 * The permission that lets the user enter the workspace right now: not
 * deleted and with an invite that has been accepted or was never needed.
 * Returns null when the user has no usable access.
 */
export const getActivePermission = async ({
  userId,
  workspaceNanoId,
}: {
  userId: string;
  workspaceNanoId: string;
}) => {
  return Permission.findOne({
    userId,
    workspaceNanoId,
    isDeleted: false,
    "invite.status": {
      $in: [IInviteStatusKind.accepted, IInviteStatusKind.notRequired],
    },
  })
    .lean()
    .exec();
};
