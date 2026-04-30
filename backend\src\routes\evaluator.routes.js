import { Router } from "express";
import {
  createLearningContent,
  updateLearningContent,
  deleteLearningContent,
  getMyContent,
  createExam,
  getExams,
  deleteExam,
  getStudentAnalytics,
  getLeaderboardInsights,
  getOpenFlags,
  getDashboardOverview,
  getDashboardActivity,
  getDashboardSegmentation,
  getStudentsList,
  broadcastMessage
} from "../controllers/evaluator.controller.js";
import { runAntiCheatJob, runBadgesJob, runDropAlertsJob, runLeaderboardSnapshotJob } from "../controllers/jobs.controller.js";

export const evaluatorRouter = Router();

evaluatorRouter.post("/content", createLearningContent);
evaluatorRouter.get("/content/:evaluatorId", getMyContent);
evaluatorRouter.put("/content/:contentId", updateLearningContent);
evaluatorRouter.delete("/content/:contentId", deleteLearningContent);
evaluatorRouter.get("/exams", getExams);
evaluatorRouter.post("/exams", createExam);
evaluatorRouter.delete("/exams/:examId", deleteExam);
evaluatorRouter.get("/analytics/:studentId", getStudentAnalytics);
evaluatorRouter.get("/leaderboard/insights", getLeaderboardInsights);
evaluatorRouter.get("/flags/open", getOpenFlags);

evaluatorRouter.get("/dashboard/overview", getDashboardOverview);
evaluatorRouter.get("/dashboard/activity", getDashboardActivity);
evaluatorRouter.get("/dashboard/segmentation", getDashboardSegmentation);
evaluatorRouter.get("/students", getStudentsList);
evaluatorRouter.post("/broadcast", broadcastMessage);

// Job endpoints (wire these to a scheduler/cron in production)
evaluatorRouter.post("/jobs/snapshots", runLeaderboardSnapshotJob);
evaluatorRouter.post("/jobs/badges", runBadgesJob);
evaluatorRouter.post("/jobs/drop-alerts", runDropAlertsJob);
evaluatorRouter.post("/jobs/anti-cheat", runAntiCheatJob);
