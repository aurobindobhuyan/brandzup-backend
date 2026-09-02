import { Schema, model, HydratedDocument } from "mongoose";
import { IUser } from "./interface";

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    profilePic: { type: String, required: false },

    password: { type: String, required: false },
    googleId: { type: String, required: false },

    passwordResetToken: { type: String },
    passwordResetTokenExpire: { type: Date },
  },
  { timestamps: true },
);

const User = model<IUser>("User", userSchema);

export type HydratedUserDocument = HydratedDocument<IUser>;

export default User;
