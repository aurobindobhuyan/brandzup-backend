import { Router } from "express";
import * as controller from "@controller/userController";

const router = Router();

router.route("/register").post(controller.register);

router.route("/me").get(controller.me);

export default router;
