import { Router } from "express";
import { OrderController } from "../controllers/order.controller";

const router = Router();

router.post("/orders", OrderController.createOrder);
router.put("/orders/:id", OrderController.updateOrder);
router.put("/orders/:id/cancel", OrderController.cancelOrder);
router.get("/orders", OrderController.getAllOrders);
router.get("/orders/:id", OrderController.getOrder);
router.get("/orders/:id/invoice", OrderController.getInvoice);

export default router;