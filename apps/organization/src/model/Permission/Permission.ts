import { Schema, Types, model } from "mongoose";
import { IUserType } from "packages";

import * as interfaces from "./interface";

export const permissionSchema = new Schema<interfaces.IPermission>({
  userId: {
    type: Types.ObjectId,
    ref: "User",
    required: true,
  },
  workspaceNanoId: { type: String, required: true },

  access: {
    fullWorkspaceAccess: { type: Boolean, default: false },

    userType: {
      type: Number,
      enum: Object.values(IUserType).filter((v) => typeof v === "number"),
      required: true,
    },

    brandAccess: {
      type: [
        {
          entityId: { type: Types.ObjectId, ref: "Brand", required: true },
          userType: {
            type: Number,
            enum: Object.values(IUserType).filter((v) => typeof v === "number"),
            required: true,
          },
          fullBrandAccess: { type: Boolean, default: false },
          _id: false,
        },
      ],
      default: [],
    },

    guidelineAccess: {
      type: [
        {
          entityId: { type: Types.ObjectId, ref: "Guideline", required: true },
          userType: {
            type: Number,
            enum: Object.values(IUserType).filter((v) => typeof v === "number"),
            required: true,
          },
          brandId: { type: Types.ObjectId, ref: "Brand", required: true },
          _id: false,
        },
      ],
      default: [],
    },
  },

  invite: {
    token: { type: String, unique: false, default: "" },

    status: {
      type: String,
      required: true,
      enum: [...Object.values(interfaces.IInviteStatusKind)],
      default: interfaces.IInviteStatusKind.pending,
    },
  },

  isDeleted: { type: Boolean, default: false },
});

permissionSchema.index({ userId: 1, workspaceId: 1 }, { unique: true });

const Permission = model<interfaces.IPermission>(
  "Permission",
  permissionSchema,
);

export default Permission;
