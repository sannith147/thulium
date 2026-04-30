import { useEffect, useRef, useState } from "react";
import { Card } from "../../components/Card";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import {
  FileText, ClipboardList, Clock, ExternalLink, Play,
  CheckCircle2, ChevronRight, ChevronLeft, AlertCircle
} from "lucide-react";
import { Latex } from "../../components/Latex";

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function ExamsPage() {
  const { auth } = useAuth();
  const studentId = auth.id;
  const [exams, setExams] = useState([]);
  const [activeExam, setActiveExam] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Timer
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    fetchExams();
  }, []);

  // Start countdown timer when exam starts
  useEffect(() => {
    if (activeExam && !submitted) {
      const totalSeconds = (activeExam.duration_minutes || 30) * 60;
      setTimeLeft(totalSeconds);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            finishExam(true); // auto-submit on timeout
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [activeExam, submitted]);

  const fetchExams = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await api.get(`/student/exams/${studentId}`);
      setExams(res.data.exams || []);
    } catch (err) {
      console.error(err);
      setError("Could not load exams. Please check your connection.");
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  const startExam = (exam) => {
    clearInterval(timerRef.current);
    setActiveExam(exam);
    setCurrentQuestion(0);
    setAnswers({});
    setSubmitted(false);
    setResult(null);
    setError("");
  };

  const handleAnswer = (optionIdx) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion]: optionIdx }));
  };

  const finishExam = async (autoSubmit = false) => {
    if (!activeExam || submitting) return;
    clearInterval(timerRef.current);
    setSubmitting(true);
    setError("");

    const questions = activeExam.questions || [];
    let score = 0;
    let totalMarks = 0;
    questions.forEach((q, idx) => {
      const mark = q.marks || 1;
      totalMarks += mark;
      if (answers[idx] === q.correct) score += mark;
    });
    const accuracy = totalMarks > 0 ? (score / totalMarks) * 100 : 0;

    try {
      await api.post(`/student/exams/${activeExam.id}/submit`, {
        studentId,
        responses: {
          answers: Object.values(answers),
          score,
          total: totalMarks,
          accuracy
        },
        questionTimingsMs: []
      });
      setResult({ score, total: totalMarks, accuracy: accuracy.toFixed(1) });
      setSubmitted(true);
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.error?.includes("unique")) {
        // Already attempted — show a friendly message
        setError("You have already submitted this exam.");
        setSubmitted(true);
        setResult({ score: 0, total: questions.length, accuracy: "0.0", alreadyDone: true });
      } else {
        setError("Failed to submit. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ──────────────────── Exam Active State ─────────────────────────────────────
  if (activeExam) {
    if (submitted) {
      return (
        <Card title="Attempt Recorded">
          <div className="flex flex-col items-center py-12 text-center">
            <CheckCircle2 className="mb-4 h-16 w-16 text-emerald-500" />
            <h2 className="mb-1 text-2xl font-bold text-slate-100">
              {result?.alreadyDone ? "Already Submitted" : "Well Done!"}
            </h2>
            {result && !result.alreadyDone && (
              <div className="mb-6 grid grid-cols-3 gap-4">
                <div className="rounded-xl bg-slate-800/50 p-4">
                  <div className="text-2xl font-black text-indigo-400">{result.score}/{result.total}</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Score</div>
                </div>
                <div className="rounded-xl bg-slate-800/50 p-4">
                  <div className={`text-2xl font-black ${parseFloat(result.accuracy) >= 60 ? "text-emerald-400" : "text-rose-400"}`}>
                    {result.accuracy}%
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Accuracy</div>
                </div>
                <div className="rounded-xl bg-slate-800/50 p-4">
                  <div className="text-2xl font-black text-amber-400">+{parseFloat(result.accuracy) >= 80 ? "75" : parseFloat(result.accuracy) >= 60 ? "50" : "30"}</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">XP Earned</div>
                </div>
              </div>
            )}
            <p className="mb-6 text-sm text-slate-400">
              {result?.alreadyDone ? "You already submitted this exam." : `Your attempt for "${activeExam.title}" has been recorded.`}
            </p>
            <button
              onClick={() => setActiveExam(null)}
              className="rounded-lg bg-indigo-600 px-6 py-2.5 font-medium text-white hover:bg-indigo-500 mb-8"
            >
              Back to List
            </button>
            
            {result && !result.alreadyDone && activeExam.questions && (
              <div className="w-full text-left border-t border-slate-800 pt-8">
                <h3 className="text-lg font-bold text-slate-100 mb-4">Detailed Results</h3>
                <div className="space-y-4">
                  {activeExam.questions.map((q, idx) => {
                    const isCorrect = answers[idx] === q.correct;
                    const mark = q.marks || 1;
                    return (
                      <div key={idx} className={`rounded-xl p-4 ring-1 ${isCorrect ? 'bg-emerald-500/10 ring-emerald-500/20' : 'bg-rose-500/10 ring-rose-500/20'}`}>
                        <div className="flex justify-between items-start mb-3 gap-4">
                          <div className="font-medium text-slate-200 text-sm"><span className="text-slate-400 mr-2">Q{idx + 1}.</span><Latex displayMode={false}>{q.text}</Latex></div>
                          <div className={`text-xs font-bold whitespace-nowrap px-2 py-1 rounded ${isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                            {isCorrect ? mark : 0} / {mark} marks
                          </div>
                        </div>
                        <div className="text-sm mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/50 p-3 rounded-lg">
                          <div>
                            <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider mb-1">Your Answer</span>
                            <span className={isCorrect ? 'text-emerald-300 font-medium' : 'text-rose-300 font-medium'}>
                              {answers[idx] !== undefined ? q.options[answers[idx]] : 'Not Answered'}
                            </span>
                          </div>
                          {!isCorrect && (
                            <div>
                              <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider mb-1">Correct Answer</span>
                              <span className="text-emerald-300 font-medium">{q.options[q.correct]}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Card>
      );
    }

    const questions = activeExam.questions || [];
    const q = questions[currentQuestion];
    const isLowTime = timeLeft < 60;

    if (!q) {
      return (
        <Card title={activeExam.title}>
          <div className="py-10 text-center text-slate-500">
            No questions found for this exam.
            <br />
            <button onClick={() => setActiveExam(null)} className="mt-4 text-indigo-400 hover:underline">Back</button>
          </div>
        </Card>
      );
    }

    return (
      <Card title={activeExam.title}>
        {/* Progress + Timer bar */}
        <div className="mb-6 flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-indigo-400">
              Question {currentQuestion + 1} of {questions.length}
            </div>
            <div className="mt-1 h-1 w-48 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>
          <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-mono font-bold ${
            isLowTime ? "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20 animate-pulse" : "bg-slate-800/50 text-slate-300"
          }`}>
            <Clock className="h-4 w-4" />
            {formatTime(timeLeft)}
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* Question text */}
        <div className="mb-8 min-h-[80px] text-lg text-slate-100">
          <Latex displayMode={true}>{q.text}</Latex>
        </div>

        {/* Options */}
        <div className="grid gap-3 md:grid-cols-2">
          {(q.options || []).map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handleAnswer(idx)}
              className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                answers[currentQuestion] === idx
                  ? "border-indigo-500 bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/50"
                  : "border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                answers[currentQuestion] === idx
                  ? "border-indigo-400 bg-indigo-400 text-slate-950"
                  : "border-slate-700"
              }`}>
                {String.fromCharCode(65 + idx)}
              </div>
              <span className="text-sm">{opt}</span>
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="mt-10 flex items-center justify-between border-t border-slate-800 pt-6">
          <button
            disabled={currentQuestion === 0}
            onClick={() => setCurrentQuestion((q) => q - 1)}
            className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-100 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>

          {currentQuestion === questions.length - 1 ? (
            <button
              onClick={() => finishExam(false)}
              disabled={submitting}
              className="rounded-lg bg-emerald-600 px-8 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Finish & Submit"}
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestion((q) => q + 1)}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-8 py-2.5 text-sm font-bold text-white hover:bg-indigo-500"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Question navigator dots */}
        <div className="mt-6 flex flex-wrap gap-1.5 justify-center">
          {questions.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentQuestion(idx)}
              className={`h-2.5 w-2.5 rounded-full transition-all ${
                idx === currentQuestion ? "bg-indigo-500 scale-125" :
                answers[idx] !== undefined ? "bg-emerald-500" : "bg-slate-700"
              }`}
              title={`Q${idx + 1}`}
            />
          ))}
        </div>
      </Card>
    );
  }

  // ──────────────────── Exam List ──────────────────────────────────────────────
  return (
    <Card title="Practice Assignments & Exams">
      {!studentId && (
        <div className="mb-4 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-400">
          Please log in to view and attempt exams.
        </div>
      )}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="py-12 text-center text-rose-400 text-sm">{error}</div>
      ) : exams.length === 0 ? (
        <div className="py-16 text-center text-slate-500">
          <ClipboardList className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p>No exams or assignments scheduled yet.</p>
          <p className="mt-1 text-xs text-slate-600">Your evaluator will add them soon.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {exams.map((exam) => {
            const isFile = !!exam.file_url;
            const isAttempted = exam.attempted;
            return (
              <div key={exam.id} className={`flex flex-col rounded-xl bg-slate-900/50 p-5 ring-1 transition-all ${isAttempted ? "ring-emerald-500/20" : "ring-slate-800 hover:ring-indigo-500/30"}`}>
                <div className="mb-4 flex items-start justify-between">
                  <div className={`rounded-lg p-2 ${exam.exam_type === "daily" ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500"}`}>
                    {isFile ? <FileText className="h-5 w-5" /> : <ClipboardList className="h-5 w-5" />}
                  </div>
                  <div className="flex items-center gap-2">
                    {isAttempted && (
                      <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> Done
                      </span>
                    )}
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{exam.exam_type}</div>
                  </div>
                </div>

                <div className="mb-1 text-base font-bold text-slate-100">{exam.title}</div>
                <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {exam.duration_minutes}m</span>
                  <span>·</span>
                  <span>{new Date(exam.scheduled_at).toLocaleDateString()}</span>
                  <span>·</span>
                  <span className="text-indigo-400 font-medium">by {exam.creator_name}</span>
                  {!isFile && (
                    <>
                      <span>·</span>
                      <span>{(exam.questions || []).length} questions</span>
                    </>
                  )}
                </div>

                {isFile ? (
                  <a
                    href={exam.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto flex items-center justify-center gap-2 rounded-lg bg-slate-800 py-2.5 text-sm font-medium text-slate-200 transition-all hover:bg-slate-700"
                  >
                    View Assignment File <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <button
                    onClick={() => startExam(exam)}
                    className={`mt-auto flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold text-white transition-all ${
                      isAttempted
                        ? "bg-slate-700 hover:bg-slate-600"
                        : "bg-indigo-600 hover:bg-indigo-500"
                    }`}
                  >
                    {isAttempted ? "Retake Quiz" : "Start Quiz"} <Play className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
