import { default as permissionRoute } from "./permissionRoute";
import { default as workspaceRoute } from "./workspaceRoute";

export function rootRoute(app: any) {
  app.use("/workspace", workspaceRoute);
  app.use("/permission", permissionRoute);
}
