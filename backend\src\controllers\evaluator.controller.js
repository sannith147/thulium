import { supabase } from "../lib/supabase.js";

// ─── Learning Content ────────────────────────────────────────────────────────

export async function createLearningContent(req, res) {
  const { title, content_type, youtube_url, file_url, assignment_payload, created_by } = req.body;

  if (!title || !content_type) {
    return res.status(400).json({ error: "title and content_type are required" });
  }
  if (!created_by) {
    return res.status(400).json({ error: "created_by is required" });
  }

  // Auto-sync evaluator row if it doesn't exist
  await supabase.from("evaluators").upsert({ id: created_by }, { onConflict: "id" });

  const { data, error } = await supabase
    .from("learning_content")
    .insert({
      title,
      content_type,
      youtube_url: youtube_url || null,
      file_url: file_url || null,
      assignment_payload: assignment_payload || null,
      created_by
    })
    .select()
    .single();

  if (error) {
    console.error("Create content error:", error.message, error.details);
    return res.status(400).json({ error: error.message });
  }

  return res.status(201).json({ content: data });
}

export async function updateLearningContent(req, res) {
  const { contentId } = req.params;
  const { title, content_type, youtube_url, file_url, assignment_payload, updated_by } = req.body;

  const { data, error } = await supabase
    .from("learning_content")
    .update({
      title,
      content_type,
      youtube_url: youtube_url || null,
      file_url: file_url || null,
      assignment_payload: assignment_payload || null
    })
    .eq("id", contentId)
    .eq("created_by", updated_by)
    .select()
    .single();

  if (error) {
    console.error("Update content error:", error.message);
    return res.status(400).json({ error: error.message });
  }

  return res.json({ content: data });
}

export async function deleteLearningContent(req, res) {
  const { contentId } = req.params;
  const { deleted_by } = req.query;

  try {
    // 1. Clear references in daily_tasks to avoid foreign key constraint errors
    await supabase
      .from("daily_tasks")
      .update({ assignment_id: null })
      .eq("assignment_id", contentId);

    // 2. Delete the content
    const { data, error } = await supabase
      .from("learning_content")
      .delete()
      .eq("id", contentId)
      .eq("created_by", deleted_by)
      .select();

    if (error) {
      console.error("Delete content error:", error.message);
      return res.status(400).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(403).json({ error: "Unauthorized: You can only delete your own content." });
    }

    return res.json({ deleted: true });
  } catch (err) {
    console.error("Unexpected delete error:", err);
    return res.status(500).json({ error: "Internal server error during deletion." });
  }
}

export async function getMyContent(req, res) {
  const { evaluatorId } = req.params;

  const { data, error } = await supabase
    .from("learning_content")
    .select("id, title, content_type, youtube_url, file_url, created_at, created_by")
    .eq("created_by", evaluatorId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Get my content error:", error.message);
    return res.status(400).json({ error: error.message });
  }

  return res.json({ contents: data || [] });
}

// ─── Exams ───────────────────────────────────────────────────────────────────

export async function createExam(req, res) {
  const { title, exam_type, duration_minutes, scheduled_at, questions, file_url, created_by } = req.body;

  if (!title || !exam_type || !duration_minutes || !scheduled_at) {
    return res.status(400).json({ error: "title, exam_type, duration_minutes, and scheduled_at are required" });
  }
  if (!created_by) {
    return res.status(400).json({ error: "created_by is required" });
  }

  // Auto-sync evaluator row
  await supabase.from("evaluators").upsert({ id: created_by }, { onConflict: "id" });

  let data, error;
  const fullResult = await supabase
    .from("exams")
    .insert({ title, exam_type, duration_minutes, scheduled_at, questions: questions || null, file_url: file_url || null, created_by })
    .select()
    .single();

  if (fullResult.error && fullResult.error.message?.includes("file_url")) {
    console.warn("exams.file_url missing — using fallback insert without file_url.");
    const fallback = await supabase
      .from("exams")
      .insert({ title, exam_type, duration_minutes, scheduled_at, questions: questions || null, created_by })
      .select()
      .single();
    data = fallback.data;
    error = fallback.error;
  } else {
    data = fullResult.data;
    error = fullResult.error;
  }

  if (error) {
    console.error("Create exam error:", error.message, error.details);
    return res.status(400).json({ error: error.message });
  }

  return res.status(201).json({ exam: data });
}

export async function getExams(req, res) {
  const { evaluatorId } = req.query; // Add this line
  
  let data, error;
  const query = supabase
    .from("exams")
    .select("id, title, exam_type, duration_minutes, scheduled_at, file_url, created_at, created_by")
    .order("scheduled_at", { ascending: false });

  if (evaluatorId) {
    query.eq("created_by", evaluatorId);
  }

  const fullResult = await query;

  if (fullResult.error && fullResult.error.message?.includes("file_url")) {
    const fallback = await supabase
      .from("exams")
      .select("id, title, exam_type, duration_minutes, scheduled_at, created_at, created_by")
      .order("scheduled_at", { ascending: false });
    data = fallback.data;
    error = fallback.error;
  } else {
    data = fullResult.data;
    error = fullResult.error;
  }

  if (error) {
    console.error("Get exams error:", error.message);
    return res.status(400).json({ error: error.message });
  }

  return res.json({ exams: data || [] });
}

export async function deleteExam(req, res) {
  const { examId } = req.params;
  const { deleted_by } = req.query;

  const { data, error } = await supabase
    .from("exams")
    .delete()
    .eq("id", examId)
    .eq("created_by", deleted_by)
    .select();

  if (error) {
    console.error("Delete exam error:", error.message);
    return res.status(400).json({ error: error.message });
  }

  if (!data || data.length === 0) {
    return res.status(403).json({ error: "Unauthorized: You can only delete your own exams." });
  }

  return res.json({ deleted: true });
}

// ─── Analytics & Insights ────────────────────────────────────────────────────

export async function getStudentAnalytics(req, res) {
  const { studentId } = req.params;

  const { data, error } = await supabase
    .from("student_analytics_view")
    .select("student_id, student_name, accuracy, activity_days, tests_completed, xp")
    .eq("student_id", studentId)
    .single();

  if (error) {
    console.warn("Student analytics error:", error.message);
    // Return blank analytics for this student rather than crashing
    return res.json({
      analytics: {
        student_id: studentId,
        student_name: "Unknown",
        accuracy: 0,
        activity_days: 0,
        tests_completed: 0,
        xp: 0
      }
    });
  }

  return res.json({ analytics: data });
}

export async function getLeaderboardInsights(_req, res) {
  const [analyticsRes, flagsRes] = await Promise.all([
    supabase
      .from("student_analytics_view")
      .select("student_id, student_name, accuracy, activity_days, tests_completed, xp")
      .limit(200),
    supabase
      .from("student_flags")
      .select("student_id, flag_type, severity, created_at, resolved_at")
      .is("resolved_at", null)
      .order("severity", { ascending: false })
      .limit(200)
  ]);

  if (flagsRes.error) {
    console.warn("Flags fetch error (non-fatal):", flagsRes.error.message);
  }
  if (analyticsRes.error) {
    console.warn("Analytics fetch error (non-fatal):", analyticsRes.error.message);
  }

  const analytics = analyticsRes.data || [];
  const openFlags = flagsRes.data || [];

  const inactive = analytics.filter((s) => (s.activity_days || 0) === 0).slice(0, 50);
  const highEffortLowAccuracy = analytics
    .filter((s) => (s.tests_completed || 0) >= 3 && (s.accuracy || 0) < 40)
    .slice(0, 50);
  const highAccuracyLowActivity = analytics
    .filter((s) => (s.accuracy || 0) >= 85 && (s.activity_days || 0) <= 2)
    .slice(0, 50);

  return res.json({ inactive, highEffortLowAccuracy, highAccuracyLowActivity, openFlags });
}

export async function getOpenFlags(_req, res) {
  const flagsRes = await supabase
    .from("student_flags")
    .select("id, student_id, flag_type, severity, details, created_at, resolved_at")
    .is("resolved_at", null)
    .order("severity", { ascending: false })
    .limit(200);

  if (flagsRes.error) return res.status(400).json({ error: flagsRes.error.message });

  const studentIds = [...new Set((flagsRes.data || []).map((f) => f.student_id))];
  const usersRes = studentIds.length
    ? await supabase.from("users").select("id, full_name").in("id", studentIds)
    : { data: [], error: null };

  if (usersRes.error) return res.status(400).json({ error: usersRes.error.message });

  const nameById = new Map((usersRes.data || []).map((u) => [u.id, u.full_name]));
  const flags = (flagsRes.data || []).map((f) => ({
    ...f,
    student_name: nameById.get(f.student_id) || "Unknown"
  }));

  return res.json({ flags });
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export async function getDashboardOverview(req, res) {
  const { evaluatorId } = req.query;

  const [studentsRes, activeRes, analyticsRes, myExamsAnalyticsRes] = await Promise.all([
    supabase.from("students").select("id", { count: "exact" }),
    supabase
      .from("student_sessions")
      .select("student_id", { count: "exact", head: true })
      .gte("started_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    supabase.from("student_performance_summary").select("accuracy, xp"),
    evaluatorId 
      ? supabase
          .from("exam_attempts")
          .select("accuracy, score, exams!inner(created_by)")
          .eq("exams.created_by", evaluatorId)
      : Promise.resolve({ data: [] })
  ]);

  const analytics = analyticsRes.data || [];
  const totalAccuracy = analytics.reduce((acc, curr) => acc + Number(curr.accuracy || 0), 0);
  const avgAccuracy = analytics.length ? (totalAccuracy / analytics.length).toFixed(1) : 0;
  const totalXp = analytics.reduce((sum, r) => sum + Number(r.xp || 0), 0);
  const avgXp = analytics.length ? Math.round(totalXp / analytics.length) : 0;

  // Personal stats
  const myAnalytics = myExamsAnalyticsRes.data || [];
  const myTotalAccuracy = myAnalytics.reduce((acc, curr) => acc + Number(curr.accuracy || 0), 0);
  const myAvgAccuracy = myAnalytics.length ? (myTotalAccuracy / myAnalytics.length).toFixed(1) : 0;

  return res.json({
    totalStudents: (studentsRes.data || []).length,
    activeToday: activeRes.count || 0,
    avgAccuracy: Number(avgAccuracy),
    avgXp,
    myAvgAccuracy: evaluatorId ? Number(myAvgAccuracy) : null,
    totalExamsAttempted: myAnalytics.length
  });
}

export async function getDashboardActivity(_req, res) {
  const { data, error } = await supabase.rpc("get_engagement_heatmap");

  if (error) {
    console.warn("Engagement heatmap RPC error (non-fatal):", error.message);
    return res.json({ activity: [] });
  }

  return res.json({ activity: data || [] });
}

export async function getDashboardSegmentation(_req, res) {
  const { data, error } = await supabase.rpc("get_student_segmentation_counts");

  if (error) {
    console.warn("Segmentation RPC error (non-fatal):", error.message);
    return res.json({ segments: [] });
  }

  return res.json({ segments: data || [] });
}

// ─── Students ────────────────────────────────────────────────────────────────

export async function getStudentsList(req, res) {
  const { search, sortBy, sortOrder = "desc" } = req.query;

  let query = supabase.from("student_analytics_view").select("*");

  if (search) {
    query = query.ilike("student_name", `%${search}%`);
  }
  if (sortBy) {
    query = query.order(sortBy, { ascending: sortOrder === "asc" });
  }

  const { data, error } = await query.limit(100);

  if (error) {
    console.error("Get students list error (non-fatal):", error.message);
    return res.json({ students: [] });
  }

  return res.json({ students: data || [] });
}

// ─── Broadcast ───────────────────────────────────────────────────────────────

export async function broadcastMessage(req, res) {
  const { studentIds, message, evaluatorId } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ error: "message is required" });
  }
  if (!studentIds?.length) {
    return res.status(400).json({ error: "studentIds must be a non-empty array" });
  }

  const messages = studentIds.map((studentId) => ({
    student_id: studentId,
    evaluator_id: evaluatorId,
    message
  }));

  const { error } = await supabase.from("student_notifications").insert(messages);

  if (error) {
    console.warn("Broadcast to notifications failed, falling back to chat_messages:", error.message);
    // Fallback if table doesn't exist yet
    const chatFallback = studentIds.map((studentId) => ({
      student_id: studentId,
      evaluator_id: evaluatorId,
      sender_role: "evaluator",
      message
    }));
    await supabase.from("chat_messages").insert(chatFallback);
  }

  return res.json({ success: true, sent: messages.length });
}

