import { Router } from "express";
import { 
  getStudentDashboard, 
  getStudentPressureDashboard, 
  getLearningMaterials, 
  getStudentNotifications, 
  markNotificationsRead,
  getLeaderboard,
  getNearbyLeaderboard,
  getStudentBadges
} from "../controllers/student.controller.js";
import { getExams, submitExamAttempt } from "../controllers/exam.controller.js";
import { markVideoWatched, submitQuestions } from "../controllers/actions.controller.js";
import { getStudentAlerts, markAlertsRead } from "../controllers/alerts.controller.js";

export const studentRouter = Router();

// Dashboard & Materials
studentRouter.get("/dashboard/materials", getLearningMaterials);
studentRouter.get("/dashboard/notifications/:studentId", getStudentNotifications);
studentRouter.put("/dashboard/notifications/:studentId/read", markNotificationsRead);
studentRouter.get("/dashboard/:studentId", getStudentDashboard);
studentRouter.get("/dashboard/:studentId/pressure", getStudentPressureDashboard);

// Leaderboard
studentRouter.get("/leaderboard", getLeaderboard);
studentRouter.get("/leaderboard/nearby/:studentId", getNearbyLeaderboard);

// Exams
studentRouter.get("/exams/:studentId", getExams);
studentRouter.post("/exams/:examId/submit", submitExamAttempt);

// Actions
studentRouter.post("/actions/:studentId/video-watched", markVideoWatched);
studentRouter.post("/actions/:studentId/submit-questions", submitQuestions);

// Badges
studentRouter.get("/badges/:studentId", getStudentBadges);

// Alerts
studentRouter.get("/alerts/:studentId", getStudentAlerts);
studentRouter.post("/alerts/:studentId/read", markAlertsRead);
