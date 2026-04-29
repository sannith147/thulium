import { supabase } from "../lib/supabase.js";
import {
  buildHeatmap30,
  classifyDailyStatus,
  computeXpGapToNext,
  estimateRankDrop,
  formatCountdown,
  getSecondsUntilEndOfDay,
  pickPrimaryAction
} from "../services/dashboardPressureLogic.js";
import { computeStreakChain, secondsUntilStreakBreak } from "../services/streakService.js";

export async function getStudentDashboard(req, res) {
  const { studentId } = req.params;

  const [tasksRes, perfRes, streakRes] = await Promise.all([
    supabase
      .from("daily_tasks")
      .select("id, date, video_url, assignment_id, status")
      .eq("student_id", studentId)
      .order("date", { ascending: false })
      .limit(2),
    supabase
      .from("student_performance_summary")
      .select("accuracy, tests_completed, avg_score, xp")
      .eq("student_id", studentId)
      .maybeSingle(),
    supabase
      .from("students")
      .select("streak_days, xp")
      .eq("id", studentId)
      .maybeSingle()
  ]);

  return res.json({
    tasks: tasksRes.data || [],
    performance: perfRes.data || { accuracy: 0, tests_completed: 0, avg_score: 0, xp: 0 },
    streak: streakRes.data?.streak_days || 0,
    xp: streakRes.data?.xp || 0
  });
}

export async function getStudentNotifications(req, res) {
  const { studentId } = req.params;
  const { data, error } = await supabase
    .from("student_notifications")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Get notifications error (non-fatal):", error.message);
    return res.json({ notifications: [] });
  }

  return res.json({ notifications: data || [] });
}

export async function markNotificationsRead(req, res) {
  const { studentId } = req.params;
  const { error } = await supabase
    .from("student_notifications")
    .update({ is_read: true })
    .eq("student_id", studentId)
    .eq("is_read", false);

  if (error) {
    console.error("Mark notifications read error (non-fatal):", error.message);
    return res.status(400).json({ error: error.message });
  }

  return res.json({ success: true });
}

export async function getStudentPressureDashboard(req, res) {
  const { studentId } = req.params;
  const secondsLeft = secondsUntilStreakBreak(new Date());
  const timeLeftLabel = formatCountdown(secondsLeft);


  // Pull today completion summary and nearby ranks.
  const today = new Date().toISOString().slice(0, 10);
  const [meRes, todayRes, nearbyRes, heatRes] = await Promise.all([
    supabase.from("students").select("xp, streak_days, last_active_date").eq("id", studentId).single(),
    supabase.from("student_daily_summary").select("videos_completed, full_completion, completed_tasks_percent, xp_earned").eq("student_id", studentId).eq("day", today).maybeSingle(),
    supabase.rpc("get_leaderboard_nearby", {
      p_student_id: studentId,
      p_type: "global",
      p_window: "all_time",
      p_sort: "xp",
      p_subject_id: null
    }),
    supabase
      .from("student_daily_summary")
      .select("day, full_completion, completed_tasks_percent")
      .eq("student_id", studentId)
      .gte("day", new Date(Date.now() - 29 * 24 * 3600 * 1000).toISOString().slice(0, 10))
      .order("day", { ascending: true })
  ]);

  if (meRes.error) {
    console.warn("Pressure dashboard: student not found in DB, returning demo payload", meRes.error.message);
    // Student exists in users but not students yet — return demo payload
    const myRank = 1; const myXp = 0;
    const heatmap = buildHeatmap30([]);
    return res.json({
      studentId, now: new Date().toISOString(),
      dayEndsInSeconds: secondsLeft, dayEndsInLabel: timeLeftLabel,
      primaryAction: pickPrimaryAction({ todayCompletion: "missed" }),
      beatNextRank: { nextCompetitor: null, xpGap: 0, hint: "Complete tasks to earn XP" },
      dailyStatus: { key: "at_risk", label: "Start your first task today!" },
      streak: { days: 0, breaksInSeconds: secondsLeft, breaksInLabel: timeLeftLabel },
      heatmap30: heatmap, streakChainDays: [], breakpoints: [],
      othersMoving: { nearYouCompletedToday: 0, message: "Be the first to complete today's task!" },
      alerts: [], badges: [],
      rankRisk: { likelyDropMin: 0, likelyDropMax: 0, label: "Complete tasks to start ranking" },
      quickComparison: { tag: "new", label: "Welcome! Start your journey." },
      impactLine: { complete: "Complete today = earn XP and start your streak", skip: "Skipping = no XP earned" },
      new_user: true
    });
  }
  if (nearbyRes.error) {
    console.warn("Pressure dashboard: leaderboard RPC error, using empty nearby", nearbyRes.error.message);
  }

  const me = meRes.data;
  const todaySummary = todayRes.data || null;
  const nearby = nearbyRes.data || [];

  const myRow = nearby.find((r) => r.student_id === studentId);
  const myRank = myRow?.rank || null;
  const movement = Number(myRow?.movement || 0);

  const todayCompletion =
    todaySummary?.full_completion ? "completed" : (todaySummary?.completed_tasks_percent || 0) > 0 ? "partial" : "missed";

  const dailyStatusKey = classifyDailyStatus({ todayCompletion, movement });
  const dailyStatusLabel =
    dailyStatusKey === "gaining"
      ? "You are gaining rank today"
      : dailyStatusKey === "losing"
        ? "You are losing ground today"
        : "You are at risk today";

  const above = nearby.filter((r) => myRank && r.rank < myRank).sort((a, b) => a.rank - b.rank);
  const below = nearby.filter((r) => myRank && r.rank > myRank).sort((a, b) => a.rank - b.rank);
  const { nextCompetitor, xpGap } = computeXpGapToNext({ myRank, myXp: me.xp, rowsAbove: above });

  const heatRows = (heatRes.data || []).map((d) => ({
    day: d.day,
    status: d.full_completion ? "completed" : (d.completed_tasks_percent || 0) > 0 ? "partial" : "missed"
  }));

  const heatmap = buildHeatmap30(heatRows);
  const streakChainDays = computeStreakChain(heatmap);
  const breakpoints = heatmap.filter((d) => d.status === "missed").map((d) => d.day);

  // Peer activity tracking: how many of the nearby cohort completed today
  const nearbyIds = (nearby || []).map((r) => r.student_id).filter(Boolean);
  const peerIds = nearbyIds.filter((id) => id !== studentId);
  const peerSummaryRes = peerIds.length
    ? await supabase
        .from("student_daily_summary")
        .select("student_id, full_completion, completed_tasks_percent, xp_earned")
        .eq("day", today)
        .in("student_id", peerIds)
    : { data: [], error: null };

  if (peerSummaryRes.error) {
    console.warn("Peer summary error (non-fatal):", peerSummaryRes.error.message);
  }

  const peerSummary = peerSummaryRes.data || [];
  const nearYouCompletedToday = peerSummary.filter((p) => p.full_completion).length;

  // Rank drop estimation: check if below neighbors can overtake based on their current XP + today's earned XP
  const projectedBelowXp = new Map();
  for (const b of below) projectedBelowXp.set(b.student_id, Number(b.xp || 0));
  for (const p of peerSummary) {
    if (projectedBelowXp.has(p.student_id)) {
      projectedBelowXp.set(p.student_id, Number(projectedBelowXp.get(p.student_id) || 0) + Number(p.xp_earned || 0));
    }
  }
  const drop = estimateRankDrop({ myXp: me.xp, belowRows: below, xpIfInactive: 0, projectedBelowXp });

  const avgCompleted = 60; // placeholder until cohort aggregates are added
  const myCompleted = Number(todaySummary?.completed_tasks_percent || 0);
  const comparison = myCompleted >= avgCompleted ? { tag: "above_avg", label: "Above average today" } : { tag: "below_avg", label: "Below average today" };

  // "Top ranks updated recently" signal (based on latest snapshot timestamp)
  const snapRes = await supabase
    .from("leaderboard_rank_snapshots")
    .select("created_at")
    .eq("window", "all_time")
    .eq("metric", "xp")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const topRanksUpdatedRecently =
    !!snapRes.data?.created_at && Date.now() - new Date(snapRes.data.created_at).getTime() < 60 * 60 * 1000;

  const alertsRes = await supabase
    .from("student_alerts")
    .select("id, alert_type, title, message, severity, created_at, read_at")
    .eq("student_id", studentId)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(3);

  const badgesRes = await supabase
    .from("student_badges")
    .select("awarded_at, badges:badge_id(code, name, icon)")
    .eq("student_id", studentId)
    .order("awarded_at", { ascending: false })
    .limit(5);

  return res.json({
    studentId,
    now: new Date().toISOString(),
    dayEndsInSeconds: secondsLeft,
    dayEndsInLabel: timeLeftLabel,
    primaryAction: pickPrimaryAction({ todayCompletion }),
    beatNextRank: {
      nextCompetitor,
      xpGap,
      hint: nextCompetitor ? "Complete today’s task to overtake" : null
    },
    dailyStatus: { key: dailyStatusKey, label: dailyStatusLabel },
    streak: {
      days: me.streak_days || 0,
      breaksInSeconds: secondsLeft,
      breaksInLabel: timeLeftLabel
    },
    heatmap30: heatmap,
    streakChainDays,
    breakpoints,
    othersMoving: {
      nearYouCompletedToday,
      topRanksUpdatedRecently,
      message: "Others are progressing. You are falling behind."
    },
    alerts: alertsRes.data || [],
    badges: (badgesRes.data || []).map((r) => ({
      code: r.badges?.code,
      name: r.badges?.name,
      icon: r.badges?.icon
    })),
    rankRisk: {
      likelyDropMin: drop.min,
      likelyDropMax: drop.max,
      label: drop.max > 0 ? `Likely to drop ${drop.min}–${drop.max} ranks if inactive today` : "Stable if inactive today"
    },
    quickComparison: comparison,
    impactLine: {
      complete: "Completing today = +50 XP + streak safe",
      skip: "Skipping = no bonus + rank risk"
    }
  });
}

export async function getStudentBadges(req, res) {
  const { studentId } = req.params;

  const { data, error } = await supabase
    .from("student_badges")
    .select("awarded_at, metadata, badges:badge_id(id, code, name, description, icon)")
    .eq("student_id", studentId)
    .order("awarded_at", { ascending: false })
    .limit(20);

  if (error) {
    console.warn("Badges fetch error (non-fatal):", error.message);
    return res.json({ studentId, badges: [] });
  }

  const badges = (data || []).map((r) => ({
    code: r.badges?.code,
    name: r.badges?.name,
    description: r.badges?.description,
    icon: r.badges?.icon,
    awarded_at: r.awarded_at,
    metadata: r.metadata
  }));

  return res.json({ studentId, badges });
}

export async function getLeaderboard(_req, res) {
  const type = (_req.query.type || "global").toString();
  const window = (_req.query.window || "all_time").toString();
  const sort = (_req.query.sort || "xp").toString();
  const subjectId = _req.query.subjectId ? _req.query.subjectId.toString() : null;
  const page = Number.parseInt((_req.query.page || "1").toString(), 10);
  const limit = Number.parseInt((_req.query.limit || "25").toString(), 10);
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 25;
  const safePage = Number.isFinite(page) ? Math.max(page, 1) : 1;
  const offset = (safePage - 1) * safeLimit;

  // Preferred: DB RPC (fast ranking + movement)
  const rpcRes = await supabase.rpc("get_leaderboard", {
    p_type: type,
    p_window: window,
    p_sort: sort,
    p_subject_id: subjectId,
    p_limit: safeLimit,
    p_offset: offset
  });

  if (!rpcRes.error) {
    return res.json({
      type,
      window,
      sort,
      subjectId,
      page: safePage,
      limit: safeLimit,
      leaderboard: rpcRes.data || []
    });
  }

  // Fallback: legacy view (for older schema)
  const { data, error } = await supabase
    .from("leaderboard_view")
    .select("rank, student_id, student_name, xp, avg_score, leaderboard_points")
    .limit(100);

  if (error) {
    console.warn("Leaderboard fallback view error:", rpcRes.error?.message || error.message);
    return res.json({ leaderboard: [], type, window, sort, subjectId, page: safePage, limit: safeLimit, warning: "Leaderboard unavailable" });
  }

  return res.json({ leaderboard: data, legacy: true });
}

export async function getNearbyLeaderboard(req, res) {
  const { studentId } = req.params;
  const type = (req.query.type || "global").toString();
  const window = (req.query.window || "all_time").toString();
  const sort = (req.query.sort || "xp").toString();
  const subjectId = req.query.subjectId ? req.query.subjectId.toString() : null;

  const { data, error } = await supabase.rpc("get_leaderboard_nearby", {
    p_student_id: studentId,
    p_type: type,
    p_window: window,
    p_sort: sort,
    p_subject_id: subjectId
  });

  if (error) {
    console.warn("Nearby leaderboard RPC error (non-fatal):", error.message);
    // Return student at rank 1 with no nearby peers — new user
    return res.json({
      studentId,
      nearby: [{ rank: 1, student_id: studentId, student_name: "You", xp: 0, accuracy: 0, streak_days: 0, movement: 0 }],
      warning: "Leaderboard data unavailable"
    });
  }

  return res.json({ studentId, nearby: data || [] });
}
export async function getLearningMaterials(_req, res) {
  const { data, error } = await supabase
    .from("learning_content")
    .select("id, title, content_type, youtube_url, file_url, created_at, created_by")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.warn("Learning materials fetch error (non-fatal):", error.message);
    return res.json({ materials: [], warning: error.message });
  }

  // Fetch creator names separately to avoid FK join alias issues
  const creatorIds = [...new Set((data || []).map(m => m.created_by).filter(Boolean))];
  let nameById = {};
  if (creatorIds.length > 0) {
    const { data: usersData } = await supabase
      .from("users")
      .select("id, full_name")
      .in("id", creatorIds);
    (usersData || []).forEach(u => { nameById[u.id] = u.full_name; });
  }

  const materials = (data || []).map(m => ({
    ...m,
    creator_name: nameById[m.created_by] || "Unknown Evaluator"
  }));

  return res.json({ materials });
}
