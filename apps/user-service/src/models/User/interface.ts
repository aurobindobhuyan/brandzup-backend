export interface IUser {
  name: string;
  email: string;

  password?: string;
  googleId?: string;

  profilePic: string;

  passwordResetToken?: string;
  passwordResetTokenExpire?: Date;
}
