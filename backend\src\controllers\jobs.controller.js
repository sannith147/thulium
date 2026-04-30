import { isSupabaseConfigured, supabase } from "../lib/supabase.js";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export async function runLeaderboardSnapshotJob(_req, res) {
  if (!isSupabaseConfigured) return res.json({ ok: true, demo: true });

  const snapshotDate = todayIso();

  // Snapshot XP all-time (top 200). Expand to daily/weekly/monthly + other metrics later.
  const { data: rows, error } = await supabase.rpc("get_leaderboard", {
    p_type: "global",
    p_window: "all_time",
    p_sort: "xp",
    p_subject_id: null,
    p_limit: 200,
    p_offset: 0
  });

  if (error) return res.status(400).json({ error: error.message });

  const inserts = (rows || []).map((r) => ({
    window: "all_time",
    metric: "xp",
    subject_id: null,
    snapshot_date: snapshotDate,
    student_id: r.student_id,
    rank: r.rank,
    value: Number(r.xp || 0)
  }));

  const upsertRes = await supabase
    .from("leaderboard_rank_snapshots")
    .upsert(inserts, { onConflict: "window,metric,subject_id,snapshot_date,student_id" });

  if (upsertRes.error) return res.status(400).json({ error: upsertRes.error.message });

  return res.json({ ok: true, snapshotDate, count: inserts.length });
}

export async function runBadgesJob(_req, res) {
  if (!isSupabaseConfigured) return res.json({ ok: true, demo: true });

  // Ensure badge metadata exists
  const badgeDefs = [
    { code: "streak_7", name: "7 Day Streak", description: "Maintain a 7 day streak.", icon: "🔥" },
    { code: "accuracy_king", name: "Accuracy King", description: "90%+ accuracy with enough attempts.", icon: "🎯" },
    { code: "top10", name: "Top 10 Finisher", description: "Reach Top 10 on global leaderboard.", icon: "🏅" }
  ];

  await supabase.from("badges").upsert(badgeDefs, { onConflict: "code" });

  const { data: badges, error: badgesErr } = await supabase.from("badges").select("id, code");
  if (badgesErr) return res.status(400).json({ error: badgesErr.message });
  const badgeByCode = new Map((badges || []).map((b) => [b.code, b.id]));

  // 7-day streak
  const streakRes = await supabase.from("students").select("id, streak_days").gte("streak_days", 7).limit(500);
  if (streakRes.error) return res.status(400).json({ error: streakRes.error.message });
  const streakAwards = (streakRes.data || []).map((s) => ({
    student_id: s.id,
    badge_id: badgeByCode.get("streak_7"),
    metadata: { streak_days: s.streak_days }
  }));

  // Accuracy king (simple heuristic)
  const accRes = await supabase
    .from("leaderboard_accuracy_all_time")
    .select("student_id, accuracy, attempt_count")
    .gte("accuracy", 90)
    .gte("attempt_count", 5)
    .limit(200);
  if (accRes.error) return res.status(400).json({ error: accRes.error.message });
  const accAwards = (accRes.data || []).map((s) => ({
    student_id: s.student_id,
    badge_id: badgeByCode.get("accuracy_king"),
    metadata: { accuracy: s.accuracy, attempt_count: s.attempt_count }
  }));

  // Top10
  const topRes = await supabase.rpc("get_leaderboard", {
    p_type: "global",
    p_window: "all_time",
    p_sort: "xp",
    p_subject_id: null,
    p_limit: 10,
    p_offset: 0
  });
  if (topRes.error) return res.status(400).json({ error: topRes.error.message });
  const topAwards = (topRes.data || []).map((r) => ({
    student_id: r.student_id,
    badge_id: badgeByCode.get("top10"),
    metadata: { rank: r.rank, xp: r.xp }
  }));

  const allAwards = [...streakAwards, ...accAwards, ...topAwards].filter((a) => a.badge_id);
  const upsertAwards = await supabase.from("student_badges").upsert(allAwards, { onConflict: "student_id,badge_id" });
  if (upsertAwards.error) return res.status(400).json({ error: upsertAwards.error.message });

  return res.json({ ok: true, awarded: allAwards.length });
}

export async function runDropAlertsJob(_req, res) {
  if (!isSupabaseConfigured) return res.json({ ok: true, demo: true });

  // Create a rank-drop alert if movement is negative in latest leaderboard call (simple, lightweight).
  const boardRes = await supabase.rpc("get_leaderboard", {
    p_type: "global",
    p_window: "all_time",
    p_sort: "xp",
    p_subject_id: null,
    p_limit: 200,
    p_offset: 0
  });
  if (boardRes.error) return res.status(400).json({ error: boardRes.error.message });

  const drops = (boardRes.data || []).filter((r) => Number(r.movement || 0) < 0).slice(0, 50);
  const alerts = drops.map((r) => ({
    student_id: r.student_id,
    alert_type: "rank_drop",
    title: "Rank drop detected",
    message: `You dropped in rank recently. Complete today’s tasks to recover.`,
    severity: 2
  }));

  if (alerts.length) {
    const ins = await supabase.from("student_alerts").insert(alerts);
    if (ins.error) return res.status(400).json({ error: ins.error.message });
  }

  return res.json({ ok: true, alertsCreated: alerts.length });
}

export async function runAntiCheatJob(_req, res) {
  if (!isSupabaseConfigured) return res.json({ ok: true, demo: true });

  // Abnormal accuracy scan using the view
  const accRes = await supabase
    .from("leaderboard_accuracy_all_time")
    .select("student_id, accuracy, attempt_count")
    .gte("accuracy", 98)
    .gte("attempt_count", 5)
    .limit(200);
  if (accRes.error) return res.status(400).json({ error: accRes.error.message });

  const flags = (accRes.data || []).map((r) => ({
    student_id: r.student_id,
    flag_type: "abnormal_accuracy",
    severity: 4,
    details: { accuracy: r.accuracy, attempt_count: r.attempt_count }
  }));

  if (flags.length) {
    const ins = await supabase.from("student_flags").insert(flags);
    if (ins.error) return res.status(400).json({ error: ins.error.message });
  }

  return res.json({ ok: true, flagsCreated: flags.length });
}

