import { Router } from "express";
import {authMiddleware} from "../middlewares/auth";
import { addProduct, getProductById, getProducts, updateProduct, uploadProductsFromExcel, rollbackUpload, getUploadBatches, deleteProduct } from "../controllers/product.controller";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.route("/product/add").post(addProduct);
router.route("/product/all").get(authMiddleware, getProducts);
router.route("/product/:id").get(authMiddleware, getProductById);
router.route("/product/update/:id").put(authMiddleware, updateProduct);
router.route("/product/delete/:id").delete(authMiddleware, deleteProduct);
router.route("/product/bulk/add").post(upload.single("file"), uploadProductsFromExcel);
router.route("/product/bulk/rollback/:uploadId").delete(rollbackUpload);
router.route("/product/bulk/batches").get(getUploadBatches);

export default router;
