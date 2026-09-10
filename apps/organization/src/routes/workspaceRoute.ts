import { Router } from "express";
import * as controller from "@controller/workspace/workspace";

const router = Router();

router.route("/list-all").get(controller.listAllWorkspaces);

// The workspace the session currently points at (from the gateway header).
// Registered before /:workspaceId so it is not captured as an id.
router.route("/current").get(controller.getCurrentWorkspace);

router.route("/create").post(controller.createWorkspace);

router.route("/:workspaceId").get(controller.getWorkspace);

export default router;
