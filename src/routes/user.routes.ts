import { Router } from "express";
import {authMiddleware} from "../middlewares/auth";
import { login, register, verifyOtp } from "../controllers/user.controller";

const router = Router();

router.route("/user/register").post(register);
router.route("/user/login").post(login);
router.route("/user/verify-otp").post(verifyOtp);

export default router;
