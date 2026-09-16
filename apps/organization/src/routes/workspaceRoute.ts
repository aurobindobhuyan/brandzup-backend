import { Router } from "express";
import * as controller from "@controller/workspace/workspace";
import { requireWorkspaceId } from "packages";

const router = Router();

router.route("/list-all").get(controller.listAllWorkspaces);

router.route("/create").post(controller.createWorkspace);

router.route("/verify-workspace").post(controller.verifyUserWorkspace);

router.route("/:workspaceId").get(requireWorkspaceId, controller.getWorkspace);

export default router;
