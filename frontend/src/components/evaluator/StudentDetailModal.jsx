import React, { useState, useEffect } from "react";
import { Modal } from "../Modal";
import { api } from "../../services/api";
import { Trophy, Target, Calendar, Flame, Activity } from "lucide-react";

export function StudentDetailModal({ isOpen, onClose, student }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && student?.student_id) {
      fetchStudentDetails();
    }
  }, [isOpen, student]);

  const fetchStudentDetails = async () => {
    setLoading(true);
    setError("");
    setDetails(null);
    try {
      const { data } = await api.get(`/evaluator/analytics/${student.student_id}`);
      setDetails(data.analytics);
    } catch (err) {
      console.error("Error fetching student details:", err);
      setError("Could not load analytics for this student.");
    } finally {
      setLoading(false);
    }
  };

  if (!student) return null;

  const accuracy = details?.accuracy || student?.accuracy || 0;
  const xp = details?.xp || student?.xp || 0;
  const activityDays = details?.activity_days || student?.activity_days || 0;
  const testsCompleted = details?.tests_completed || student?.tests_completed || 0;

  const stats = [
    { label: "Total XP", value: xp.toLocaleString(), icon: Trophy, color: "text-amber-400" },
    { label: "Avg Accuracy", value: `${Number(accuracy).toFixed(1)}%`, icon: Target, color: "text-indigo-400" },
    { label: "Active Days", value: activityDays, icon: Calendar, color: "text-emerald-400" },
    { label: "Tests Done", value: testsCompleted, icon: Activity, color: "text-rose-400" },
  ];

  const riskLevel =
    accuracy < 30 || activityDays === 0 ? "high" :
    accuracy < 50 || activityDays <= 2 ? "medium" : "low";

  const riskConfig = {
    high: { label: "High Risk", color: "bg-rose-500/10 text-rose-400 ring-rose-500/20" },
    medium: { label: "Needs Attention", color: "bg-amber-500/10 text-amber-400 ring-amber-500/20" },
    low: { label: "On Track", color: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20" },
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Analysis: ${student.student_name}`}>
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-lg bg-rose-500/10 p-4 text-sm text-rose-400">{error}</div>
      ) : (
        <div className="space-y-5">
          {/* Risk badge */}
          <div className="flex items-center gap-3">
            <span className={`rounded-lg px-3 py-1 text-sm font-bold ring-1 ${riskConfig[riskLevel].color}`}>
              {riskConfig[riskLevel].label}
            </span>
            <span className="text-xs text-slate-500">
              Based on accuracy and recent activity
            </span>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col items-center rounded-xl bg-slate-800/50 p-3">
                <s.icon className={`mb-1 h-5 w-5 ${s.color}`} />
                <span className="text-lg font-bold text-slate-100">{s.value}</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Accuracy bar */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-400">Accuracy</span>
              <span className={accuracy >= 60 ? "text-emerald-400" : accuracy >= 40 ? "text-amber-400" : "text-rose-400"}>
                {Number(accuracy).toFixed(1)}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  accuracy >= 60 ? "bg-emerald-500" : accuracy >= 40 ? "bg-amber-500" : "bg-rose-500"
                }`}
                style={{ width: `${Math.min(100, accuracy)}%` }}
              />
            </div>
          </div>

          {/* Streak info */}
          {student.streak_days !== undefined && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-800/50 p-3">
              <Flame className="h-5 w-5 text-orange-400" />
              <div>
                <div className="text-sm font-semibold text-slate-100">{student.streak_days || 0} Day Streak</div>
                <div className="text-[11px] text-slate-500">
                  Last active: {student.last_active_date ? new Date(student.last_active_date).toLocaleDateString() : "Never"}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
