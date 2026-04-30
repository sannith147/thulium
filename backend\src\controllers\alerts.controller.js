import { isSupabaseConfigured, supabase } from "../lib/supabase.js";

export async function getStudentAlerts(req, res) {
  const { studentId } = req.params;
  if (!isSupabaseConfigured) return res.json({ studentId, alerts: [], demo: true });

  const { data, error } = await supabase
    .from("student_alerts")
    .select("id, alert_type, title, message, severity, created_at, read_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ studentId, alerts: data || [] });
}

export async function markAlertsRead(req, res) {
  const { studentId } = req.params;
  const { alertIds } = req.body || {};
  if (!isSupabaseConfigured) return res.json({ ok: true, demo: true });

  const ids = Array.isArray(alertIds) ? alertIds : [];
  if (!ids.length) return res.json({ ok: true, updated: 0 });

  const { error } = await supabase
    .from("student_alerts")
    .update({ read_at: new Date().toISOString() })
    .eq("student_id", studentId)
    .in("id", ids);

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ ok: true, updated: ids.length });
}

