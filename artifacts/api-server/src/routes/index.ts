import { Router, type IRouter } from "express";
import healthRouter from "./health";
import olaRouter from "./ola";

const router: IRouter = Router();

router.use(healthRouter);
router.use(olaRouter);

export default router;
