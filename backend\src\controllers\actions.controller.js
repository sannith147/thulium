import { supabase } from "../lib/supabase.js";
import {
  computeAccuracyBonusXp,
  computeDailyCompletionPercent,
  computeStreakMultiplier,
  xpForEventType
} from "../services/xpService.js";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function upsertDailySummary({ studentId, day, patch }) {
  const existingRes = await supabase
    .from("student_daily_summary")
    .select("*")
    .eq("student_id", studentId)
    .eq("day", day)
    .maybeSingle();

  if (existingRes.error) return { error: existingRes.error };

  const existing = existingRes.data || {
    student_id: studentId,
    day,
    videos_completed: 0,
    questions_attempted: 0,
    questions_correct: 0,
    full_completion: false,
    completed_tasks_percent: 0,
    xp_earned: 0
  };

  const next = { ...existing, ...patch, updated_at: new Date().toISOString() };
  const quizCompleted = (next.questions_attempted || 0) > 0;
  next.completed_tasks_percent = computeDailyCompletionPercent({
    videosCompleted: next.videos_completed,
    quizCompleted
  });
  next.full_completion = next.videos_completed >= 2 && quizCompleted;

  const upsertRes = await supabase
    .from("student_daily_summary")
    .upsert(next, { onConflict: "student_id,day" })
    .select()
    .single();

  return upsertRes;
}

async function insertXpEvent({ studentId, eventType, xp, metadata }) {
  return supabase
    .from("xp_events")
    .insert({ student_id: studentId, event_type: eventType, xp, metadata })
    .select()
    .single();
}

async function addXpToStudent({ studentId, xpDelta }) {
  const currentRes = await supabase.from("students").select("xp, streak_days").eq("id", studentId).single();
  if (currentRes.error) return { error: currentRes.error };
  const current = currentRes.data;
  const multiplier = computeStreakMultiplier(current.streak_days || 0);
  const effective = Math.round((Number(xpDelta) || 0) * multiplier);
  const nextXp = (current.xp || 0) + effective;
  const updateRes = await supabase
    .from("students")
    .update({ xp: nextXp, last_active_date: todayIsoDate() })
    .eq("id", studentId)
    .select("xp, streak_days, last_active_date")
    .single();
  return { ...updateRes, effectiveXp: effective };
}

export async function markVideoWatched(req, res) {
  const { studentId } = req.params;
  const { videoIndex } = req.body;

  const day = todayIsoDate();
  const currentDayRes = await supabase
    .from("student_daily_summary")
    .select("videos_completed")
    .eq("student_id", studentId)
    .eq("day", day)
    .maybeSingle();

  if (currentDayRes.error) return res.status(400).json({ error: currentDayRes.error.message });

  const prevVideos = currentDayRes.data?.videos_completed || 0;
  const nextVideos = Math.min(2, Math.max(prevVideos, Number(videoIndex) ? Math.min(2, Math.max(1, videoIndex)) : prevVideos + 1));

  const dailyRes = await upsertDailySummary({ studentId, day, patch: { videos_completed: nextVideos } });
  if (dailyRes.error) return res.status(400).json({ error: dailyRes.error.message });

  const baseXp = xpForEventType("video_watch");
  const xpRes = await insertXpEvent({ studentId, eventType: "video_watch", xp: baseXp, metadata: { day, videoIndex } });
  if (xpRes.error) return res.status(400).json({ error: xpRes.error.message });

  const addRes = await addXpToStudent({ studentId, xpDelta: baseXp });
  if (addRes.error) return res.status(400).json({ error: addRes.error.message });

  if (prevVideos < 2 && nextVideos === 2) {
    const bonusXp = xpForEventType("videos_both_completed_bonus");
    await insertXpEvent({ studentId, eventType: "videos_both_completed_bonus", xp: bonusXp, metadata: { day } });
    await addXpToStudent({ studentId, xpDelta: bonusXp });
  }

  return res.json({ ok: true, daySummary: dailyRes.data, xp: addRes.data, effectiveXp: addRes.effectiveXp });
}

export async function submitQuestions(req, res) {
  const { studentId } = req.params;
  const { attempted = 0, correct = 0, accuracyPct = null, source = "quiz" } = req.body;

  const day = todayIsoDate();
  const dailyRes = await upsertDailySummary({
    studentId,
    day,
    patch: {
      questions_attempted: Number(attempted) || 0,
      questions_correct: Number(correct) || 0
    }
  });
  if (dailyRes.error) return res.status(400).json({ error: dailyRes.error.message });

  const baseXp = xpForEventType("questions_solved");
  await insertXpEvent({ studentId, eventType: "questions_solved", xp: baseXp, metadata: { day, source } });
  await addXpToStudent({ studentId, xpDelta: baseXp });

  const bonusXp = computeAccuracyBonusXp(accuracyPct);
  if (bonusXp > 0) {
    await insertXpEvent({ studentId, eventType: "accuracy_bonus", xp: bonusXp, metadata: { day, accuracyPct } });
    await addXpToStudent({ studentId, xpDelta: bonusXp });
  }

  const full = dailyRes.data?.full_completion;
  if (full) {
    const { data: existingBonus } = await supabase
      .from("xp_events")
      .select("id")
      .eq("student_id", studentId)
      .eq("event_type", "full_daily_completion_bonus")
      .gte("occurred_at", new Date(`${day}T00:00:00.000Z`).toISOString())
      .lt("occurred_at", new Date(`${day}T23:59:59.999Z`).toISOString())
      .limit(1);

    if (!existingBonus?.length) {
      const fullXp = xpForEventType("full_daily_completion_bonus");
      await insertXpEvent({ studentId, eventType: "full_daily_completion_bonus", xp: fullXp, metadata: { day } });
      await addXpToStudent({ studentId, xpDelta: fullXp });
    }
  }

  return res.json({ ok: true, daySummary: dailyRes.data });
}
