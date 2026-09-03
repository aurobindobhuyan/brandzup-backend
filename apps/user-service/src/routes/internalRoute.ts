import { Router } from "express";
import * as controller from "@controller/userController";

const router = Router();

router.route("/login").post(controller.login);

export default router;
