import { default as permissionRoute } from "./permissionRoute";

export function rootRoute(app: any) {
  app.use("/permission", permissionRoute);
}
