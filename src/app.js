import "dotenv/config";
import express from "express";
import cors from "cors";
import countRouter from "./routes/count.js";
import authRouter from "./routes/authRoutes.js";
import devicesRouter from "./routes/devices.js";
import adminRouter from "./routes/adminRoutes.js";
import { requireAuth, requireAdmin } from "./middleware/auth.js";

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/devices", devicesRouter);
app.use("/api/admin", requireAuth, requireAdmin, adminRouter);
app.use("/api/count", countRouter);
app.get("/health", (_, res) => res.json({ status: "ok" }));

export default app;
