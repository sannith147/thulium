import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/Card";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { StreakHeatmap } from "../../components/dashboard/StreakHeatmap";
import { Video, FileText, ClipboardList, ExternalLink, Play, ChevronRight } from "lucide-react";
import { Latex } from "../../components/Latex";

function Pill({ tone = "neutral", children }) {
  const cls =
    tone === "good"
      ? "bg-emerald-600/20 text-emerald-200"
      : tone === "bad"
        ? "bg-rose-600/20 text-rose-200"
        : "bg-slate-700 text-slate-200";
  return <span className={`rounded px-2 py-1 text-xs ${cls}`}>{children}</span>;
}

export function StudentDashboardPage() {
  const { auth } = useAuth();
  const studentId = auth.id;
  const [data, setData] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [tick, setTick] = useState(0);
  const navigate = useNavigate();

  const refreshKey = useMemo(() => tick, [tick]);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/student/dashboard/${studentId}/pressure`)
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch(console.error);

    api
      .get("/student/dashboard/materials")
      .then((res) => {
        if (!cancelled) setMaterials(res.data?.materials || []);
      })
      .catch(console.error);

    api
      .get(`/student/exams/${studentId}`)
      .then((res) => {
        if (!cancelled) setUpcomingExams(res.data?.exams?.slice(0, 3) || []);
      })
      .catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // Periodic refresh (lightweight)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!data) {
    return (
      <Card title="Dashboard">
        <p className="text-sm text-slate-300">Loading…</p>
      </Card>
    );
  }

  const statusTone =
    data.dailyStatus?.key === "gaining" ? "good" : data.dailyStatus?.key === "losing" ? "bad" : "neutral";
  const comparisonTone = data.quickComparison?.tag === "above_avg" ? "good" : "bad";

  return (
    <div className="space-y-4">
      <Card title="Act now">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[240px]">
            <p className="text-xl font-semibold">{data.primaryAction?.title}</p>
            <p className="mt-1 text-sm text-slate-300">Day ends in {data.dayEndsInLabel}</p>
          </div>
          <button
            onClick={() => navigate(data.primaryAction?.targetPath || "/student/exams")}
            className="ml-auto rounded-lg bg-indigo-600 px-5 py-3 font-semibold hover:bg-indigo-500"
          >
            {data.primaryAction?.cta || "Start Now"}
          </button>
        </div>
      </Card>

      {data.alerts?.length ? (
        <Card title="Alert">
          <div className="space-y-2">
            {data.alerts.map((a) => (
              <div key={a.id} className="rounded bg-rose-600/10 p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-rose-200">{a.title}</div>
                    <div className="text-slate-200">{a.message}</div>
                  </div>
                  <button
                    onClick={() =>
                      api
                        .post(`/student/alerts/${studentId}/read`, { alertIds: [a.id] })
                        .then(() => setTick((t) => t + 1))
                        .catch(() => {})
                    }
                    className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-100 hover:bg-slate-700"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {data.badges?.length ? (
        <Card title="Badges">
          <div className="flex flex-wrap gap-2">
            {data.badges.map((b) => (
              <span key={b.code} className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-100">
                <span className="mr-1">{b.icon}</span>
                {b.name}
              </span>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Beat next rank">
          {data.beatNextRank?.nextCompetitor ? (
            <div className="space-y-2">
              <p className="text-sm text-slate-300">Next: <span className="text-slate-100">{data.beatNextRank.nextCompetitor.name}</span></p>
              <p className="text-lg font-semibold">
                {data.beatNextRank.xpGap} XP to overtake
              </p>
              <p className="text-sm text-slate-300">{data.beatNextRank.hint}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-300">You’re at the top (or no data yet).</p>
          )}
        </Card>

        <Card title="Today">
          <div className="flex items-center justify-between">
            <Pill tone={statusTone}>{data.dailyStatus?.label}</Pill>
            <Pill tone={comparisonTone}>{data.quickComparison?.label}</Pill>
          </div>
          <p className="mt-3 text-sm text-slate-300">{data.othersMoving?.message}</p>
          <p className="mt-2 text-sm">
            <span className="text-slate-300">{data.othersMoving?.nearYouCompletedToday} students near you completed today.</span>
          </p>
          {data.othersMoving?.topRanksUpdatedRecently ? (
            <p className="mt-1 text-xs text-slate-300">Top ranks updated recently.</p>
          ) : null}
        </Card>

        <Card title="Streak danger">
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold">🔥 {data.streak?.days} days</p>
            <Pill tone="bad">Breaks in {data.streak?.breaksInLabel}</Pill>
          </div>
          <div className="mt-3">
            <StreakHeatmap
              days={data.heatmap30 || []}
              streakChainDays={data.streakChainDays || []}
              breakpoints={data.breakpoints || []}
            />
            <p className="mt-2 text-xs text-slate-300">Consistency builds rank. Breaks reduce momentum.</p>
          </div>
        </Card>

        <Card title="Upcoming Assignments & Exams">
          <div className="space-y-3">
            {!upcomingExams || upcomingExams.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">No upcoming tasks.</div>
            ) : (
              upcomingExams.map((exam) => (
                <div 
                  key={exam.id}
                  onClick={() => navigate("/student/exams")}
                  className="flex items-center gap-3 rounded-lg bg-slate-800/50 p-3 ring-1 ring-slate-700 cursor-pointer transition-all hover:bg-slate-800 hover:ring-indigo-500/50"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    exam.exam_type === 'daily' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'
                  }`}>
                    {exam.file_url ? <FileText className="h-5 w-5" /> : <ClipboardList className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="truncate text-sm font-medium text-slate-100">
                      <Latex>{exam.title}</Latex>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <span className="uppercase tracking-wider">{exam.exam_type === 'daily' ? 'Assignment' : 'Exam'}</span>
                      <span>·</span>
                      <span className="text-indigo-400">by {exam.creator_name}</span>
                      <span>·</span>
                      <span>{new Date(exam.scheduled_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-600" />
                </div>
              ))
            )}
            <button 
              onClick={() => navigate("/student/exams")}
              className="w-full rounded-lg border border-slate-800 py-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-800 hover:text-slate-300"
            >
              View All Tasks
            </button>
          </div>
        </Card>

        <Card title="Recent Learning Materials">
          <div className="space-y-3">
            {!materials || materials.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">No new materials.</div>
            ) : (
              materials.map((m) => (
                <a 
                  key={m.id} 
                  href={m.content_type === 'video' ? m.youtube_url : m.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg bg-slate-800/50 p-3 ring-1 ring-slate-700 transition-all hover:bg-slate-800 hover:ring-indigo-500/50"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    m.content_type === 'video' ? 'bg-rose-500/10 text-rose-500' : 
                    m.content_type === 'assignment' ? 'bg-amber-500/10 text-amber-500' : 
                    'bg-indigo-500/10 text-indigo-500'
                  }`}>
                    {m.content_type === 'video' ? <Play className="h-5 w-5" /> : 
                     m.content_type === 'assignment' ? <ClipboardList className="h-5 w-5" /> : 
                     <FileText className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="truncate text-sm font-medium text-slate-100">
                      <Latex>{m.title}</Latex>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <span className="uppercase tracking-wider">{m.content_type}</span>
                      {m.creator_name && (
                        <>
                          <span>·</span>
                          <span className="text-indigo-400">by {m.creator_name}</span>
                        </>
                      )}
                      {m.created_at && (
                        <>
                          <span>·</span>
                          <span>{new Date(m.created_at).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-slate-600" />
                </a>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card title="If you don’t act">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Pill tone="bad">{data.rankRisk?.label}</Pill>
          <div className="text-sm">
            <div className="text-emerald-200">{data.impactLine?.complete}</div>
            <div className="text-rose-200">{data.impactLine?.skip}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
