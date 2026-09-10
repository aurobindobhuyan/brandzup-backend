import { Router } from "express";
import * as controller from "@controller/userController";

const router = Router();

router.route("/register").post(controller.register);

export default router;
