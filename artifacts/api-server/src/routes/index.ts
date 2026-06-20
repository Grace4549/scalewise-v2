import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import expertsRouter from "./experts";
import bookingsRouter from "./bookings";
import reviewsRouter from "./reviews";
import messagesRouter from "./messages";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(expertsRouter);
router.use(bookingsRouter);
router.use(reviewsRouter);
router.use(messagesRouter);
router.use(adminRouter);

export default router;
