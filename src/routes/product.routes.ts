import { Router } from "express";
import {authMiddleware} from "../middlewares/auth";
import { addProduct, getProductById, getProducts, updateProduct, uploadProductsFromExcel, rollbackUpload, getUploadBatches, deleteProduct, searchProducts } from "../controllers/product.controller";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// Specific routes first
router.route("/product/add").post(addProduct);
router.route("/product/all").get(authMiddleware, getProducts);
router.route("/product/search").get(authMiddleware, searchProducts);
router.route("/product/bulk/add").post(upload.single("file"), uploadProductsFromExcel);
router.route("/product/bulk/rollback/:uploadId").delete(rollbackUpload);
router.route("/product/bulk/batches").get(getUploadBatches);

// Constrain :id to a 24-hex ObjectId to avoid collisions like "/product/search"
router.route("/product/:id([0-9a-fA-F]{24})").get(authMiddleware, getProductById);
router.route("/product/update/:id([0-9a-fA-F]{24})").put(authMiddleware, updateProduct);
router.route("/product/delete/:id([0-9a-fA-F]{24})").delete(authMiddleware, deleteProduct);

export default router;
