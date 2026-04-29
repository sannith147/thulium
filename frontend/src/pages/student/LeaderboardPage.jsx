import { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/Card";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

function MovementPill({ movement }) {
  const value = Number(movement || 0);
  if (value > 0) return <span className="rounded bg-emerald-600/20 px-2 py-1 text-xs text-emerald-200">↑ Up</span>;
  if (value < 0) return <span className="rounded bg-rose-600/20 px-2 py-1 text-xs text-rose-200">↓ Down</span>;
  return <span className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-200">—</span>;
}

function formatPercent(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "-";
  return `${x.toFixed(2)}%`;
}

export function LeaderboardPage() {
  const { auth } = useAuth();
  const currentStudentId = auth.id || "00000000-0000-0000-0000-000000000001";
  const [type, setType] = useState("global"); // global | xp | accuracy | streak | subject
  const [window, setWindow] = useState("all_time"); // daily | weekly | monthly | all_time
  const [sort, setSort] = useState("xp"); // xp | accuracy | streak
  const [subjectId, setSubjectId] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [nearby, setNearby] = useState([]);
  const [loading, setLoading] = useState(false);

  const query = useMemo(() => {
    const params = { type, window, sort, page, limit: 25 };
    if (type === "subject" && subjectId) params.subjectId = subjectId;
    return params;
  }, [type, window, sort, page, subjectId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      api.get("/student/leaderboard", { params: query }),
      api.get(`/student/leaderboard/nearby/${currentStudentId}`, { params: query })
    ])
      .then(([boardRes, nearbyRes]) => {
        if (cancelled) return;
        setRows(boardRes.data.leaderboard || []);
        setNearby(nearbyRes.data.nearby || []);
      })
      .catch(() => {
        if (cancelled) return;
        setRows([]);
        setNearby([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  const me = nearby.find((r) => r.student_id === currentStudentId) || rows.find((r) => r.student_id === currentStudentId);

  return (
    <div className="space-y-4">
      <Card title="Leaderboard">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block text-slate-300">Time</span>
            <select
              value={window}
              onChange={(e) => {
                setWindow(e.target.value);
                setPage(1);
              }}
              className="w-full rounded bg-slate-800 px-3 py-2"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="all_time">All time</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-slate-300">Type</span>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              className="w-full rounded bg-slate-800 px-3 py-2"
            >
              <option value="global">Global (default)</option>
              <option value="xp">XP</option>
              <option value="accuracy">Accuracy</option>
              <option value="streak">Streak</option>
              <option value="subject">Subject-wise</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-slate-300">Sort</span>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="w-full rounded bg-slate-800 px-3 py-2"
            >
              <option value="xp">XP</option>
              <option value="accuracy">Accuracy</option>
              <option value="streak">Streak</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-slate-300">Subject ID (optional)</span>
            <input
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setPage(1);
              }}
              disabled={type !== "subject"}
              className="w-full rounded bg-slate-800 px-3 py-2 disabled:opacity-50"
              placeholder={type === "subject" ? "Paste subject uuid" : "Enable by selecting Subject-wise"}
            />
          </label>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Your Rank">
          {me ? (
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Rank</span>
                <span className="font-semibold">#{me.rank}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">XP</span>
                <span className="font-semibold">{me.xp ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Streak</span>
                <span className="font-semibold">{me.streak_days ?? 0} days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Movement</span>
                <MovementPill movement={me.movement} />
              </div>
              <p className="mt-3 rounded bg-slate-800 p-2 text-slate-200">
                Complete today’s tasks to maintain/improve rank.
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-300">No rank data yet. (Seed some users + XP events in Supabase.)</p>
          )}
        </Card>

        <Card title="Nearby Rank (±5)">
          <div className="space-y-2">
            {nearby.length ? (
              nearby.map((r) => {
                const isMe = r.student_id === currentStudentId;
                return (
                  <div
                    key={r.student_id}
                    className={`flex items-center justify-between rounded p-2 text-sm ${
                      isMe ? "bg-indigo-600/20 border border-indigo-600/40" : "bg-slate-800"
                    }`}
                  >
                    <span className="truncate">
                      #{r.rank} {r.student_name} {isMe ? "(you)" : ""}
                    </span>
                    <MovementPill movement={r.movement} />
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-300">No nearby rank data.</p>
            )}
          </div>
        </Card>

        <Card title="Quick Stats">
          <div className="space-y-1 text-sm">
            <p className="text-slate-300">Window: <span className="text-slate-100">{window}</span></p>
            <p className="text-slate-300">Type: <span className="text-slate-100">{type}</span></p>
            <p className="text-slate-300">Sort: <span className="text-slate-100">{sort}</span></p>
            <p className="text-slate-300">Loaded: <span className="text-slate-100">{rows.length} rows</span></p>
            {loading ? <p className="text-slate-300">Loading…</p> : null}
          </div>
        </Card>
      </div>

      <Card title="Leaderboard Table">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-300">
              <tr>
                <th className="py-2 pr-3">Rank</th>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">XP</th>
                <th className="py-2 pr-3">Accuracy</th>
                <th className="py-2 pr-3">Streak</th>
                <th className="py-2 pr-3">Completed</th>
                <th className="py-2 pr-3">Movement</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.student_id} className="border-t border-slate-800">
                  <td className="py-2 pr-3">#{r.rank}</td>
                  <td className="py-2 pr-3">{r.student_name}</td>
                  <td className="py-2 pr-3">{r.xp ?? 0}</td>
                  <td className="py-2 pr-3">{formatPercent(r.accuracy)}</td>
                  <td className="py-2 pr-3">{r.streak_days ?? 0}</td>
                  <td className="py-2 pr-3">{formatPercent(r.completed_tasks_percent)}</td>
                  <td className="py-2 pr-3">
                    <MovementPill movement={r.movement} />
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr className="border-t border-slate-800">
                  <td className="py-3 text-slate-300" colSpan={7}>
                    No leaderboard data found. Once Supabase has students + XP events, ranks will populate here.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            className="rounded bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700 disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span className="text-sm text-slate-300">Page {page}</span>
          <button
            className="rounded bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700 disabled:opacity-50"
            disabled={rows.length < 25}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </Card>
    </div>
  );
}
