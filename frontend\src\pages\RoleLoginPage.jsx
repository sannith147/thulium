import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { ArrowLeft, Loader2, ShieldCheck, UserCircle, Key } from "lucide-react";

export function RoleLoginPage({ role }) {
  const [name, setName] = useState("");
  const [mssId, setMssId] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const isEvaluator = role === "evaluator";
  const roleLabel = isEvaluator ? "Evaluator" : "Student";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ALLOWED_EVALUATORS = [
    "MSS2023104", "MSS2023115", "MSS2023126", "MSS2023145", 
    "MSS2022136", "MSS2023112", "MSS2023056", "MSS2023019",
    "MSS2023006", "MSS2023153"
  ];

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (isEvaluator && !ALLOWED_EVALUATORS.includes(mssId.trim())) {
      setError("Unauthorized ID. Only authorized MSS evaluators can log in.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/login-sync", {
        role,
        name: name.trim() || mssId.trim(),
        mssId: mssId.trim()
      });

      const { id, name: finalName } = response.data;
      
      login({ 
        role, 
        name: finalName,
        id
      });
      navigate(isEvaluator ? "/evaluator" : "/student/dashboard", { replace: true });
    } catch (err) {
      console.error("Login failed:", err);
      setError(err.response?.data?.error || "Connection error. Please ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 shadow-2xl backdrop-blur-xl">
        {/* Header decoration */}
        <div className={`h-1.5 w-full ${isEvaluator ? "bg-amber-500" : "bg-indigo-600"}`} />
        
        <div className="p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-100">{roleLabel} Portal</h1>
              <p className="mt-1 text-sm text-slate-400">Secure access to Thulium platform</p>
            </div>
            <div className={`rounded-xl p-3 ${isEvaluator ? "bg-amber-500/10 text-amber-500" : "bg-indigo-500/10 text-indigo-500"}`}>
              {isEvaluator ? <ShieldCheck className="h-6 w-6" /> : <UserCircle className="h-6 w-6" />}
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-400">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Full Name</label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-slate-100 outline-none ring-1 ring-slate-800 transition-all focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="e.g. John Doe"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">MSS ID</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  required
                  value={mssId}
                  onChange={(e) => setMssId(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-slate-100 outline-none ring-1 ring-slate-800 transition-all focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="e.g. MSS-DEMO-001"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg px-4 py-3 font-bold text-white transition-all ${
                isEvaluator ? "bg-amber-600 hover:bg-amber-500" : "bg-indigo-600 hover:bg-indigo-500"
              } ${loading ? "opacity-70" : "active:scale-95"}`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Access {roleLabel} Panel</span>
              )}
            </button>
          </form>

          <div className="mt-8 border-t border-slate-800 pt-6">
            <Link 
              to="/" 
              className="flex items-center justify-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to role selection
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

