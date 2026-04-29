import { Router } from "express";
import { studentRouter } from "./student.routes.js";
import { evaluatorRouter } from "./evaluator.routes.js";
import { loginSync } from "../controllers/auth.controller.js";

export const apiRouter = Router();

apiRouter.post("/auth/login-sync", loginSync);
apiRouter.use("/student", studentRouter);
apiRouter.use("/evaluator", evaluatorRouter);
