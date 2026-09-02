import { default as userRouter } from "./userRoute";

export const router = (app: any) => {
  app.use("/user", userRouter);
};
