import { default as permissionRoute } from "./permissionRoute";
import { default as workspaceRoute } from "./workspaceRoute";
import { default as brandRoute } from "./brandRoute";
import { requireWorkspaceId } from "packages";

export function rootRoute(app: any) {
  app.use("/workspace", workspaceRoute);
  app.use("/brand", requireWorkspaceId, brandRoute);
  app.use("/permission", requireWorkspaceId, permissionRoute);
}
