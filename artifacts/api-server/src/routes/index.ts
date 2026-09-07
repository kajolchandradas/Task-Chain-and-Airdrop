import { Router, type IRouter } from "express";
import healthRouter from "./health";
import panelRouter from "./panel";

const router: IRouter = Router();

router.use(healthRouter);
router.use(panelRouter);

export default router;
