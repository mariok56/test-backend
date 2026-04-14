import "dotenv/config";
import express from "express";
import cors from "cors";
import countRouter from "./routes/count.js";
import authRouter from "./routes/authRoutes.js";
import devicesRouter from "./routes/devices.js";
import { startPoller } from "./poller/index.js";

const app = express();
app.use(
  cors({
    origin: ["http://localhost:3001", "https://smiirl-dashboard.vercel.app"],
  }),
);
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/devices", devicesRouter);
app.use("/api/admin", devicesRouter);
app.use("/api/count", countRouter);
app.get("/health", (_, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startPoller();
});
