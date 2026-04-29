const XP_RULES = {
  video_watch: 10,
  videos_both_completed_bonus: 20,
  questions_solved: 30,
  full_daily_completion_bonus: 50
};

export function computeAccuracyBonusXp(accuracyPct) {
  const a = Number(accuracyPct);
  if (!Number.isFinite(a)) return 0;
  if (a >= 90) return 30;
  if (a >= 80) return 20;
  if (a >= 70) return 10;
  return 0;
}

export function computeStreakMultiplier(streakDays) {
  const s = Math.max(0, Math.floor(Number(streakDays) || 0));
  // Mild multiplier to avoid runaway inflation
  const capped = Math.min(s, 20);
  return 1 + capped * 0.02; // up to +40%
}

export function xpForEventType(eventType) {
  return XP_RULES[eventType] ?? 0;
}

export function computeDailyCompletionPercent({
  videosCompleted = 0,
  quizCompleted = false
} = {}) {
  const v = Math.max(0, Math.min(2, Number(videosCompleted) || 0));
  const videoPct = (v / 2) * 50; // videos = 50%
  const quizPct = quizCompleted ? 50 : 0; // quiz/questions = 50%
  return Math.max(0, Math.min(100, videoPct + quizPct));
}

