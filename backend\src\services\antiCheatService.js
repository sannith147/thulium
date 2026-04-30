export function detectTooFastAnswers(questionTimingsMs = []) {
  const timings = Array.isArray(questionTimingsMs) ? questionTimingsMs.map((t) => Number(t)).filter(Number.isFinite) : [];
  if (!timings.length) return null;
  const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
  // < 3 seconds average per question is suspicious for timed exams
  if (avg < 3000) {
    return { flag_type: "too_fast_answers", severity: 3, details: { avg_ms: avg, count: timings.length } };
  }
  return null;
}

export function detectAbnormalAccuracy({ accuracyPct, attemptCount }) {
  const a = Number(accuracyPct);
  const n = Number(attemptCount);
  if (!Number.isFinite(a) || !Number.isFinite(n)) return null;
  if (n >= 5 && a >= 98) {
    return { flag_type: "abnormal_accuracy", severity: 4, details: { accuracy: a, attempts: n } };
  }
  return null;
}

