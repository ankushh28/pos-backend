import dotenv from "dotenv";
import express, { Express } from "express";
import { createServer } from "http";
import helmet from "helmet";
import cors from "cors";
import { connectDB } from "./config/database";
import { staticRoutes } from "./middlewares/staticFileMiddleware";
import cookieParser from "cookie-parser";
import path from "path";

// Routes
import authRoutes from "./routes/user.routes";
import productRoutes from "./routes/product.routes";
import orderRoutes from "./routes/order.routes";

dotenv.config();

const app: Express = express();
const server = createServer(app);

// ✅ Use Render's PORT or fallback for local dev
const port = process.env.PORT || 5151;

// Middlewares
app.use(cors({ origin: "*", optionsSuccessStatus: 200 }));
app.use(helmet());
app.use(cookieParser());
app.use(express.json());

// DB connection
connectDB();

// Routes
const routes = [authRoutes, productRoutes, orderRoutes];
routes.forEach((router) => app.use("/api/elite", router));

// Static routes
staticRoutes?.forEach((route) =>
  app.use(route.route, express.static(path.join(__dirname, route.dir)))
);

// Server start
server.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
