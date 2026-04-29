import React, { useState } from "react";
import { Modal } from "../Modal";
import { Send, Users, ShieldAlert, Sigma, CheckCircle2 } from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { Latex } from "../Latex";

export function BroadcastModal({ isOpen, onClose, students }) {
  const { auth } = useAuth();
  const [message, setMessage] = useState("");
  const [targetType, setTargetType] = useState("all"); // all | at_risk
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const atRiskStudents = (students || []).filter(
    (s) => (s.accuracy || 0) < 40 || (s.activity_days || 0) === 0
  );

  const targetStudents = targetType === "all" ? students : atRiskStudents;

  const handleSend = async () => {
    if (!message.trim() || !targetStudents?.length) return;
    setSending(true);
    setError("");
    try {
      const studentIds = targetStudents.map((s) => s.student_id).filter(Boolean);
      const res = await api.post("/evaluator/broadcast", {
        studentIds,
        message,
        evaluatorId: auth.id
      });
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setMessage("");
        setPreview(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Broadcast failed:", err);
      setError(err.response?.data?.error || "Failed to send broadcast. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Broadcast Message">
      {sent ? (
        <div className="flex flex-col items-center justify-center gap-3 py-10">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          <p className="text-base font-semibold text-slate-100">Message Sent!</p>
          <p className="text-sm text-slate-400">Delivered to {targetStudents.length} student{targetStudents.length !== 1 ? "s" : ""}.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {error && (
            <div className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-400 ring-1 ring-rose-500/20">{error}</div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-400">Target Audience</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTargetType("all")}
                className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm transition-all ${
                  targetType === "all"
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                    : "border-slate-800 bg-slate-800/50 text-slate-500 hover:border-slate-700"
                }`}
              >
                <Users className="h-4 w-4" />
                All Students ({students?.length || 0})
              </button>
              <button
                onClick={() => setTargetType("at_risk")}
                className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm transition-all ${
                  targetType === "at_risk"
                    ? "border-rose-500 bg-rose-500/10 text-rose-400"
                    : "border-slate-800 bg-slate-800/50 text-slate-500 hover:border-slate-700"
                }`}
              >
                <ShieldAlert className="h-4 w-4" />
                At Risk Only ({atRiskStudents.length})
              </button>
            </div>
            {targetType === "at_risk" && atRiskStudents.length === 0 && (
              <p className="mt-2 text-xs text-slate-500 italic">No at-risk students found (all have accuracy ≥40% and activity &gt;0).</p>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-400">Message</label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-bold text-indigo-400 ring-1 ring-indigo-500/20">
                  <Sigma className="h-3 w-3" /> LATEX ENABLED
                </div>
                <button
                  onClick={() => setPreview(!preview)}
                  className="text-[10px] font-bold text-slate-500 hover:text-indigo-400"
                >
                  {preview ? "Hide Preview" : "Show Preview"}
                </button>
              </div>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here... (use $...$ for math)"
              className="h-32 w-full rounded-lg bg-slate-950 p-3 font-mono text-sm text-slate-100 outline-none ring-1 ring-slate-800 focus:ring-indigo-500"
            />
            {preview && message.trim() && (
              <div className="mt-2 rounded-lg bg-slate-900 p-3 text-sm ring-1 ring-slate-800">
                <Latex displayMode={true}>{message}</Latex>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !message.trim() || targetStudents.length === 0}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {sending ? "Sending..." : `Send to ${targetStudents.length} student${targetStudents.length !== 1 ? "s" : ""}`}
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
