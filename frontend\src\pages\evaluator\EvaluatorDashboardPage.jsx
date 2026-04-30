import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { StatsOverview } from "../../components/evaluator/StatsOverview";
import { StudentSegmentation } from "../../components/evaluator/StudentSegmentation";
import { StudentTable } from "../../components/evaluator/StudentTable";
import { StudentDetailModal } from "../../components/evaluator/StudentDetailModal";
import { BroadcastModal } from "../../components/evaluator/BroadcastModal";
import { CreateExamModal } from "../../components/evaluator/CreateExamModal";
import { UploadContentModal } from "../../components/evaluator/UploadContentModal";
import { MyContentPanel } from "../../components/evaluator/MyContentPanel";
import { Card } from "../../components/Card";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";
import {
  AlertTriangle, Plus, LayoutDashboard, Users, MessageSquare,
  ClipboardList, Clock, Trash2, BookOpen, Flag, RefreshCw
} from "lucide-react";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "content", label: "Content", icon: BookOpen },
  { id: "exams", label: "Exams", icon: ClipboardList },
  { id: "flags", label: "Flags", icon: Flag },
];

export function EvaluatorDashboardPage() {
  const { auth } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [segments, setSegments] = useState([]);
  const [students, setStudents] = useState([]);
  const [activity, setActivity] = useState([]);
  const [exams, setExams] = useState([]);
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingExam, setDeletingExam] = useState(null);
  const [resolvingFlag, setResolvingFlag] = useState(null);

  // Modal states
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isCreateExamModalOpen, setIsCreateExamModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [ovRes, segRes, stuRes, actRes, exRes, flRes] = await Promise.all([
        api.get(`/evaluator/dashboard/overview?evaluatorId=${auth.id}`),
        api.get("/evaluator/dashboard/segmentation"),
        api.get("/evaluator/students"),
        api.get("/evaluator/dashboard/activity"),
        api.get(`/evaluator/exams?evaluatorId=${auth.id}`),
        api.get("/evaluator/flags/open")
      ]);
      setOverview(ovRes.data || null);
      setSegments(segRes.data?.segments || []);
      setStudents(stuRes.data?.students || []);
      setActivity(actRes.data?.activity || []);
      setExams(exRes.data?.exams || []);
      setFlags(flRes.data?.flags || []);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExam = async (exam) => {
    if (!window.confirm(`Delete exam "${exam.title}"? This cannot be undone.`)) return;
    setDeletingExam(exam.id);
    try {
      await api.delete(`/evaluator/exams/${exam.id}?deleted_by=${auth.id}`);
      setExams((prev) => prev.filter((e) => e.id !== exam.id));
    } catch (err) {
      alert("Failed to delete: " + (err.response?.data?.error || err.message));
    } finally {
      setDeletingExam(null);
    }
  };

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setIsDetailModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Evaluator Dashboard</h1>
          <p className="text-sm text-slate-400">Monitor and manage student performance · {students.length} students enrolled</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium hover:bg-slate-700"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium hover:bg-slate-700"
          >
            <Plus className="h-4 w-4" /> Upload Content
          </button>
          <button
            onClick={() => setIsCreateExamModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium hover:bg-slate-700"
          >
            <Plus className="h-4 w-4" /> Create Exam
          </button>
          <button
            onClick={() => setIsBroadcastModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <MessageSquare className="h-4 w-4" /> Broadcast
          </button>
        </div>
      </header>

      {/* Stats always visible */}
      <StatsOverview stats={overview} />

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl bg-slate-900 p-1 ring-1 ring-slate-800">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.id === "flags" && flags.length > 0 && (
                <span className="ml-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {flags.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card title="Daily Engagement Trend">
                <div className="h-[280px] w-full">
                  {activity.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      No activity data yet. Students need to complete tasks first.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={activity}>
                        <defs>
                          <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis
                          dataKey="day"
                          stroke="#94a3b8"
                          fontSize={12}
                          tickFormatter={(str) => {
                            try { return new Date(str).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
                            catch { return str; }
                          }}
                        />
                        <YAxis stroke="#94a3b8" fontSize={12} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "8px" }}
                          labelStyle={{ color: "#94a3b8", marginBottom: "4px" }}
                        />
                        <Area type="monotone" dataKey="activity_count" stroke="#6366f1" fillOpacity={1} fill="url(#colorActivity)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Card>
            </div>
            <StudentSegmentation segments={segments} />
          </div>

          <StudentTable
            students={students}
            onSelectStudent={handleSelectStudent}
            onBroadcast={() => setIsBroadcastModalOpen(true)}
          />
        </div>
      )}

      {/* Tab: Content */}
      {activeTab === "content" && (
        <MyContentPanel />
      )}

      {/* Tab: Exams */}
      {activeTab === "exams" && (
        <Card title="All Exams & Assignments">
          <div className="mb-3 flex justify-end">
            <button
              onClick={() => setIsCreateExamModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
            >
              <Plus className="h-3.5 w-3.5" /> Create New
            </button>
          </div>
          {exams.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">
              No exams or assignments created yet. Click "Create New" to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {exams.map((exam) => (
                <div
                  key={exam.id}
                  className="flex items-center gap-4 rounded-xl bg-slate-800/50 p-4 ring-1 ring-slate-700 transition-all hover:ring-slate-600"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${exam.exam_type === "weekly" ? "bg-amber-500/10 text-amber-500" : "bg-indigo-500/10 text-indigo-400"}`}>
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-100">{exam.title}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-500">
                      <span className={`rounded px-1.5 py-0.5 font-bold uppercase ${exam.exam_type === "weekly" ? "bg-amber-500/10 text-amber-500" : "bg-indigo-500/10 text-indigo-400"}`}>
                        {exam.exam_type}
                      </span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{exam.duration_minutes} min</span>
                      <span>·</span>
                      <span>{exam.file_url ? "File-based" : `${(exam.questions || []).length} questions`}</span>
                      <span>·</span>
                      <span>{exam.scheduled_at ? new Date(exam.scheduled_at).toLocaleDateString() : "Unscheduled"}</span>
                    </div>
                  </div>
                  {exam.created_by === auth.id && (
                    <button
                      onClick={() => handleDeleteExam(exam)}
                      disabled={deletingExam === exam.id}
                      className="rounded-lg p-2 text-slate-500 transition-all hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-40"
                      title="Delete exam"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Tab: Flags */}
      {activeTab === "flags" && (
        <Card title="Open Anti-Cheat Flags">
          {flags.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">
              🎉 No open flags. All students are behaving well.
            </div>
          ) : (
            <div className="space-y-3">
              {flags.map((flag) => (
                <div
                  key={flag.id}
                  className="flex items-start gap-4 rounded-xl bg-rose-500/5 p-4 ring-1 ring-rose-500/20"
                >
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-100">{flag.student_name}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        flag.severity >= 3 ? "bg-rose-500/20 text-rose-400" :
                        flag.severity >= 2 ? "bg-amber-500/20 text-amber-400" :
                        "bg-slate-700 text-slate-400"
                      }`}>
                        Severity {flag.severity}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {flag.flag_type?.replace(/_/g, " ")} · {new Date(flag.created_at).toLocaleString()}
                    </div>
                    {flag.details && (
                      <div className="mt-1 text-[11px] text-slate-500 font-mono">{JSON.stringify(flag.details)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Modals */}
      <StudentDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        student={selectedStudent}
      />
      <BroadcastModal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        students={students}
      />
      <CreateExamModal
        isOpen={isCreateExamModalOpen}
        onClose={() => setIsCreateExamModalOpen(false)}
        onExamCreated={() => { fetchDashboardData(); setActiveTab("exams"); }}
      />
      <UploadContentModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onContentCreated={() => { fetchDashboardData(); setActiveTab("content"); }}
      />
    </div>
  );
}
