import "dotenv/config";
import express from "express";
import cors from "cors";
import countRouter from "./routes/count.js";
import authRouter from "./routes/authRoutes.js";
import devicesRouter from "./routes/devices.js";
import { requireAuth, requireAdmin } from "./middleware/auth.js";

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/devices", devicesRouter);
app.use("/api/admin", devicesRouter);
app.use("/api/count", countRouter);
app.get("/health", (_, res) => res.json({ status: "ok" }));
app.use("/api/admin", requireAuth, requireAdmin, devicesRouter);

export default app;
