import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { StudentDashboardPage } from "./pages/student/StudentDashboardPage";
import { LeaderboardPage } from "./pages/student/LeaderboardPage";
import { ExamsPage } from "./pages/student/ExamsPage";
import { EvaluatorDashboardPage } from "./pages/evaluator/EvaluatorDashboardPage";
import { Navbar } from "./components/Navbar";
import { RoleSelectionPage } from "./pages/RoleSelectionPage";
import { RoleLoginPage } from "./pages/RoleLoginPage";
import { useAuth } from "./context/AuthContext";

function ProtectedRoute({ allowedRole, children }) {
  const { auth } = useAuth();

  if (!auth.role) {
    return <Navigate to="/" replace />;
  }

  if (auth.role !== allowedRole) {
    return <Navigate to={auth.role === "evaluator" ? "/evaluator" : "/student/dashboard"} replace />;
  }

  return children;
}

function AppLayout() {
  const { auth } = useAuth();
  const location = useLocation();
  const isAuthFlow = ["/", "/login/student", "/login/evaluator"].includes(location.pathname);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {!isAuthFlow && auth.role ? <Navbar /> : null}
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={<RoleSelectionPage />} />
          <Route path="/login/student" element={<RoleLoginPage role="student" />} />
          <Route path="/login/evaluator" element={<RoleLoginPage role="evaluator" />} />

          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRole="student">
                <StudentDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/leaderboard"
            element={
              <ProtectedRoute allowedRole="student">
                <LeaderboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/exams"
            element={
              <ProtectedRoute allowedRole="student">
                <ExamsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/evaluator"
            element={
              <ProtectedRoute allowedRole="evaluator">
                <EvaluatorDashboardPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
