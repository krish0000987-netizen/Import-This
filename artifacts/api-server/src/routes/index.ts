import { Router, type IRouter } from "express";
import healthRouter from "./health";
import olaRouter from "./ola";
import paymentsRouter from "./payments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(olaRouter);
router.use(paymentsRouter);

export default router;
