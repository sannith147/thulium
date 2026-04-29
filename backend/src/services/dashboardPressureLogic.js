import { getSecondsUntilEndOfDay, formatCountdown } from "../utils/time.js";

export { getSecondsUntilEndOfDay, formatCountdown };

export function classifyDailyStatus({ todayCompletion = "missed", movement = 0 } = {}) {
  if (todayCompletion === "completed") return "gaining";
  if (todayCompletion === "partial") return movement >= 0 ? "at_risk" : "losing";
  return "at_risk";
}

export function pickPrimaryAction({ todayCompletion = "missed" } = {}) {
  if (todayCompletion === "completed") {
    return { key: "resume", title: "Resume learning", cta: "Start Now", targetPath: "/student/exams" };
  }
  if (todayCompletion === "partial") {
    return { key: "finish_video", title: "Finish remaining video", cta: "Start Now", targetPath: "/student/dashboard" };
  }
  return { key: "quiz", title: "Complete today’s quiz", cta: "Start Now", targetPath: "/student/exams" };
}

export function estimateRankDrop({
  myXp = 0,
  belowRows = [],
  xpIfInactive = 0,
  projectedBelowXp = null
} = {}) {
  const projectedXp = myXp + xpIfInactive;
  const overtakes = belowRows.filter((r) => {
    const belowProjected = projectedBelowXp?.get?.(r.student_id);
    const belowXp = Number.isFinite(Number(belowProjected)) ? Number(belowProjected) : Number(r.xp || 0);
    return belowXp > projectedXp;
  }).length;
  if (overtakes <= 0) return { min: 0, max: 0 };
  return { min: Math.min(2, overtakes), max: Math.min(5, overtakes) };
}

export function computeXpGapToNext({ myRank, myXp, rowsAbove = [] } = {}) {
  const next = rowsAbove.find((r) => Number(r.rank) === Number(myRank) - 1) || rowsAbove[0];
  if (!next) return { nextCompetitor: null, xpGap: null };
  const gap = Math.max(1, Number(next.xp || 0) - Number(myXp || 0) + 1);
  return { nextCompetitor: { id: next.student_id, name: next.student_name, xp: next.xp, rank: next.rank }, xpGap: gap };
}

export function buildHeatmap30(days) {
  // days: [{ day: 'YYYY-MM-DD', status: 'completed'|'partial'|'missed' }]
  const byDay = new Map();
  for (const d of days || []) byDay.set(d.day, d.status);

  const out = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const dt = new Date(today);
    dt.setDate(today.getDate() - i);
    const iso = dt.toISOString().slice(0, 10);
    out.push({ day: iso, status: byDay.get(iso) || "missed" });
  }
  return out;
}

