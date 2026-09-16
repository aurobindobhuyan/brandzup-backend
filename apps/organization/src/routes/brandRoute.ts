import { Router } from "express";
import * as controllers from "@controller/brand/brand";

const router = Router();

router.route("/list-all").get(controllers.listAllBrands);

router.route("/create").post(controllers.createBrand);

export default router;
