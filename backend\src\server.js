import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";

import { apiRouter } from "./routes/index.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Allow multiple origins for development
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175"
].filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "gate-prep-backend" });
});

app.use("/api", apiRouter);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
// touch 
// restart 
