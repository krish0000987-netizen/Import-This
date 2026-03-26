import { Router, type IRouter } from "express";
import healthRouter from "./health";
import olaRouter from "./ola";
import paymentsRouter from "./payments";
import ridesRouter from "./rides";
import adminRouter from "./admin";
import driversRouter from "./drivers";

const router: IRouter = Router();

router.use(healthRouter);
router.use(olaRouter);
router.use(paymentsRouter);
router.use(ridesRouter);
router.use(adminRouter);
router.use(driversRouter);

export default router;
