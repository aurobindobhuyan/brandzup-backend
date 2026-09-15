import { Router } from "express";
import * as controller from "@controller/workspace/workspace";

const router = Router();

router.route("/list-all").get(controller.listAllWorkspaces);

router.route("/create").post(controller.createWorkspace);

router.route("/verify-workspace").post(controller.verifyUserWorkspace);

router.route("/:workspaceId").get(controller.getWorkspace);

export default router;
