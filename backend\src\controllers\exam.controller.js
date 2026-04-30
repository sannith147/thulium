import { supabase } from "../lib/supabase.js";
import { detectTooFastAnswers } from "../services/antiCheatService.js";
import { computeAccuracyBonusXp, xpForEventType } from "../services/xpService.js";

export async function getExams(req, res) {
  const { studentId } = req.params;

  // Try full query first, fall back to safe columns if file_url is missing
  let data, error;
  const fullResult = await supabase
    .from("exams")
    .select("id, title, exam_type, duration_minutes, scheduled_at, file_url, questions, created_at, created_by")
    .order("scheduled_at", { ascending: false });

  if (fullResult.error) {
    if (fullResult.error.message?.includes("file_url")) {
      // Schema not patched yet — query without file_url
      console.warn("exams.file_url missing — run patch.sql. Using fallback query.");
      const fallback = await supabase
        .from("exams")
        .select("id, title, exam_type, duration_minutes, scheduled_at, questions, created_at, created_by")
        .order("scheduled_at", { ascending: false });
      data = fallback.data;
      error = fallback.error;
    } else {
      data = fullResult.data;
      error = fullResult.error;
    }
  } else {
    data = fullResult.data;
    error = fullResult.error;
  }

  if (error) {
    console.error("Fetch exams error:", error.message);
    return res.status(400).json({ error: error.message });
  }

  const examsData = data || [];
  const examIds = examsData.map((e) => e.id);
  let attemptedIds = new Set();

  if (examIds.length > 0) {
    const { data: attempts } = await supabase
      .from("exam_attempts")
      .select("exam_id")
      .eq("student_id", studentId)
      .in("exam_id", examIds);

    attemptedIds = new Set((attempts || []).map((a) => a.exam_id));
  }

  // Fetch creator names
  const creatorIds = [...new Set(examsData.map(e => e.created_by).filter(Boolean))];
  let nameById = {};
  if (creatorIds.length > 0) {
    const { data: usersData } = await supabase
      .from("users")
      .select("id, full_name")
      .in("id", creatorIds);
    (usersData || []).forEach(u => { nameById[u.id] = u.full_name; });
  }

  const exams = examsData.map((e) => ({
    ...e,
    attempted: attemptedIds.has(e.id),
    creator_name: nameById[e.created_by] || "Unknown Evaluator"
  }));

  return res.json({ studentId, exams });
}

export async function submitExamAttempt(req, res) {
  const { examId } = req.params;
  const { studentId, responses, questionTimingsMs = [] } = req.body;

  if (!studentId || !responses) {
    return res.status(400).json({ error: "studentId and responses are required" });
  }

  const tooFast = detectTooFastAnswers(questionTimingsMs);
  if (tooFast) {
    await supabase.from("student_flags").insert({ student_id: studentId, ...tooFast });
  }

  const { data, error } = await supabase
    .from("exam_attempts")
    .upsert(
      {
        exam_id: examId,
        student_id: studentId,
        responses: { ...responses, questionTimingsMs },
        score: responses.score || 0,
        accuracy: responses.accuracy || 0
      },
      { onConflict: "exam_id,student_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("Submit exam error:", error.message);
    return res.status(400).json({ error: error.message });
  }

  // XP award for completing quiz attempt
  const baseXp = xpForEventType("questions_solved");
  const bonusXp = computeAccuracyBonusXp(responses.accuracy);

  await supabase.from("xp_events").insert([
    { student_id: studentId, event_type: "questions_solved", xp: baseXp, metadata: { examId } },
    ...(bonusXp > 0
      ? [{ student_id: studentId, event_type: "accuracy_bonus", xp: bonusXp, metadata: { examId, accuracy: responses.accuracy } }]
      : [])
  ]);

  // Update student total XP
  const { data: student } = await supabase.from("students").select("xp").eq("id", studentId).single();
  if (student) {
    await supabase
      .from("students")
      .update({ xp: (student.xp || 0) + baseXp + bonusXp, last_active_date: new Date().toISOString().slice(0, 10) })
      .eq("id", studentId);
  }

  return res.status(201).json({ attempt: data, xpEarned: baseXp + bonusXp });
}
