import dotenv from "dotenv";
import express, { Express } from "express";
import { createServer } from "http";
import helmet from "helmet";
import cors from "cors";
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

const port = process.env.PORT ? Number(process.env.PORT) : 5151;

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

app.get("/health", (_req, res) => {
  res.status(200).send("ok");
});

const routes = [authRoutes, productRoutes, orderRoutes];
routes.forEach((router) => app.use("/api/elite", router));

staticRoutes.forEach((route) =>
  app.use(route.route, express.static(path.join(__dirname, route.dir)))
);

server.listen(port, "0.0.0.0", () => {
  console.log(`✅ Server running at http://0.0.0.0:${port}`);
});
