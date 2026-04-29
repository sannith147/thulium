import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogOut, GraduationCap, ShieldCheck } from "lucide-react";
import { NotificationBell } from "./NotificationBell";

const studentLinks = [
  { to: "/student/dashboard", label: "Dashboard" },
  { to: "/student/leaderboard", label: "Leaderboard" },
  { to: "/student/exams", label: "Exams" },
];

const evaluatorLinks = [
  { to: "/evaluator", label: "Dashboard" },
];

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { auth, logout } = useAuth();

  const links = auth.role === "evaluator" ? evaluatorLinks : studentLinks;
  const isEvaluator = auth.role === "evaluator";

  const onLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
        {/* Logo */}
        <div className="mr-4 flex items-center gap-2">
          <span className="text-lg font-black tracking-tight text-slate-100">Thulium</span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            isEvaluator ? "bg-amber-500/10 text-amber-400" : "bg-indigo-500/10 text-indigo-400"
          }`}>
            {isEvaluator ? "Evaluator" : "Student"}
          </span>
        </div>

        {/* Nav links */}
        {links.map((link) => {
          const active = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                active
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              }`}
            >
              {link.label}
            </Link>
          );
        })}

        {/* Right side: user info + logout */}
        <div className="ml-auto flex items-center gap-3">
          {!isEvaluator && <NotificationBell />}
          <div className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full ${isEvaluator ? "bg-amber-500/10" : "bg-indigo-500/10"}`}>
              {isEvaluator
                ? <ShieldCheck className="h-4 w-4 text-amber-400" />
                : <GraduationCap className="h-4 w-4 text-indigo-400" />
              }
            </div>
            <span className="hidden text-sm font-medium text-slate-300 sm:inline">
              {auth.name || auth.role}
            </span>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-400 transition-all hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
