import { Router } from "express";
import * as permission from "@controller/permission/permission";

const router = Router();

router.route("/permission/:workspaceNanoId").get(permission.getActivePermission);

export default router;
