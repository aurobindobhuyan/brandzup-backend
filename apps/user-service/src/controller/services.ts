import { Types } from "mongoose";
import bcrypt from "bcrypt";

import { OperationalError } from "packages";
import { IUser, User } from "@models/User";

const getPublicUser = (
  user: Pick<IUser, "name" | "email" | "profilePic"> & { _id: Types.ObjectId },
) => {
  const { _id, name, email, profilePic } = user;

  return { _id: _id.toString(), name, email, profilePic };
};

export const login = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<{
  _id: string;
  name: string;
  email: string;
  profilePic: string;
}> => {
  const findUser = await User.findOne({ email }).lean().exec();

  if (!findUser) {
    throw new OperationalError(400, "User not found");
  }

  if (!findUser.password) {
    throw new OperationalError(400, "Invalid email or password");
  }

  // Check password
  const checkPassword = await bcrypt.compare(password, findUser.password);

  if (!checkPassword) {
    throw new OperationalError(400, "Invalid email or password");
  }

  return getPublicUser(findUser);
};

export const register = async ({
  name,
  email,
  password,
  profilePic,
}: {
  name: string;
  email: string;
  password: string;
  profilePic: string;
}) => {
  const checkUserExist = await User.findOne({ email }).lean().exec();

  if (checkUserExist) {
    throw new OperationalError(400, "User already exist");
  }

  const hashedPassword = bcrypt.hashSync(password, 9);

  const newUser = await User.create({
    name,
    email,
    password: hashedPassword,
    profilePic,
  });

  return getPublicUser(newUser);
};

export const getUserById = async (userId: string) => {
  const user = await User.findById(userId).lean().exec();

  if (!user) {
    throw new OperationalError(404, "User not found");
  }

  return getPublicUser(user);
};
