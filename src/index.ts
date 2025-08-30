import dotenv from "dotenv";
import express, { Express, Request, Response, NextFunction } from "express";
import { createServer } from "http";
import helmet from "helmet";
import cors from "cors";
import mongoose from "mongoose";
import { connectDB } from "./config/database";
import { staticRoutes } from "./middlewares/staticFileMiddleware";
import cookieParser from "cookie-parser";
import path from "path";
import authRoutes from "./routes/user.routes";
import productRoutes from "./routes/product.routes";
import orderRoutes from "./routes/order.routes";
dotenv.config();

const app: Express = express();
const server = createServer(app);
const port = 5000;

app.use(cors());
app.use(helmet());
connectDB();
app.use(cookieParser());
app.use(express.json());

app.use(
  cors({
    origin: "*",
    optionsSuccessStatus: 200,
  })
);

const routes = [
    authRoutes,
    productRoutes,
    orderRoutes
];
routes?.forEach((router) => app.use("/api/elite", router));
staticRoutes?.forEach((route) =>
  app.use(route.route, express.static(path.join(__dirname, route.dir)))
);


server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});




//login
//midleware
//upload product with excel
//add product
//edit product
//delete product
//get product by id
//get Allproducts
//search
//confirmsale


//getAllOrder
//GetInvoice
//