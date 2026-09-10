import { default as permissionRoute } from "./permissionRoute";
import { default as workspaceRoute } from "./workspaceRoute";
import { default as internalRoute } from "./internalRoute";

export function rootRoute(app: any) {
  app.use("/workspace", workspaceRoute);
  app.use("/permission", permissionRoute);

  // Service-to-service only. The gateway refuses /org/internal/* so this is
  // unreachable from a browser.
  app.use("/internal", internalRoute);
}
