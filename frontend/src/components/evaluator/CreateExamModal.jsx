import React, { useState } from "react";
import { Modal } from "../Modal";
import { api } from "../../services/api";
import { ClipboardList, Clock, Calendar, Plus, Trash2, FileUp, List, Sigma } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Latex } from "../Latex";

export function CreateExamModal({ isOpen, onClose, onExamCreated }) {
  const { auth } = useAuth();
  const [title, setTitle] = useState("");
  const [examType, setExamType] = useState("daily");
  const [creationMode, setCreationMode] = useState("manual"); // manual | upload
  const [fileUrl, setFileUrl] = useState("");
  const [duration, setDuration] = useState(30);
  const [scheduledAt, setScheduledAt] = useState(new Date().toISOString().slice(0, 16));
  const [questions, setQuestions] = useState([{ id: 1, text: "", options: ["", "", "", ""], correct: 0, marks: 1 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewIdx, setPreviewIdx] = useState(null);

  const addQuestion = () => {
    setQuestions([...questions, { id: questions.length + 1, text: "", options: ["", "", "", ""], correct: 0, marks: 1 }]);
  };

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index, field, value) => {
    const newQuestions = [...questions];
    if (field === "text") {
      newQuestions[index].text = value;
    } else if (field === "option") {
      newQuestions[index].options[value.optionIndex] = value.text;
    } else if (field === "correct") {
      newQuestions[index].correct = value;
    } else if (field === "marks") {
      newQuestions[index].marks = Number(value);
    }
    setQuestions(newQuestions);
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const payload = {
        title,
        exam_type: examType,
        duration_minutes: duration,
        scheduled_at: new Date(scheduledAt).toISOString(),
        created_by: auth.id
      };

      if (creationMode === "manual") {
        payload.questions = questions;
      } else {
        payload.file_url = fileUrl;
        payload.questions = null;
      }

      await api.post("/evaluator/exams", payload);
      onExamCreated?.();
      onClose();
      // Reset form
      setTitle("");
      setFileUrl("");
      setQuestions([{ id: 1, text: "", options: ["", "", "", ""], correct: 0, marks: 1 }]);
    } catch (err) {
      console.error("Failed to create exam:", err);
      setError(err.response?.data?.error || "Failed to create. Check if SQL patch was applied.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Create New ${examType === 'daily' ? 'Assignment' : 'Exam'}`}>
      <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-2">
        {error && (
          <div className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-400 ring-1 ring-rose-500/20">{error}</div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-wider text-slate-500">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={examType === 'daily' ? "e.g. Calculus Practice" : "e.g. Weekly Mock Test - 05"}
              className="w-full rounded-lg bg-slate-950 p-2.5 text-sm text-slate-100 outline-none ring-1 ring-slate-800 focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-wider text-slate-500">Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setExamType("daily")}
                className={`flex-1 rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                  examType === "daily" ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-500 hover:bg-slate-800"
                }`}
              >
                Daily Assignment
              </button>
              <button
                onClick={() => setExamType("weekly")}
                className={`flex-1 rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                  examType === "weekly" ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-500 hover:bg-slate-800"
                }`}
              >
                Weekly Exam
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium uppercase tracking-wider text-slate-500">Creation Mode</label>
          <div className="flex gap-2">
            <button
              onClick={() => setCreationMode("manual")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
                creationMode === "manual" ? "bg-slate-800 text-indigo-400 ring-1 ring-indigo-500/50" : "bg-slate-900/50 text-slate-500 hover:bg-slate-800"
              }`}
            >
              <List className="h-4 w-4" />
              Manual Entry
            </button>
            <button
              onClick={() => setCreationMode("upload")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
                creationMode === "upload" ? "bg-slate-800 text-indigo-400 ring-1 ring-indigo-500/50" : "bg-slate-900/50 text-slate-500 hover:bg-slate-800"
              }`}
            >
              <FileUp className="h-4 w-4" />
              Upload PDF/File
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-wider text-slate-500">Duration (Minutes)</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full rounded-lg bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-slate-100 outline-none ring-1 ring-slate-800 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-wider text-slate-500">Schedule Date & Time</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full rounded-lg bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-slate-100 outline-none ring-1 ring-slate-800 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {creationMode === "upload" ? (
          <div className="space-y-2 rounded-xl bg-slate-800/30 p-4 ring-1 ring-slate-800">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">PDF / File URL</label>
            <input
              type="text"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://drive.google.com/file/..."
              className="w-full rounded-lg bg-slate-950 p-2.5 text-sm text-slate-100 outline-none ring-1 ring-slate-800 focus:ring-indigo-500"
            />
            <p className="text-[10px] text-slate-500 italic">Students will be able to download/view this file during the session.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-slate-300">Questions ({questions.length})</h4>
                <div className="flex items-center gap-1 rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-bold text-indigo-400 ring-1 ring-indigo-500/20">
                  <Sigma className="h-3 w-3" />
                  LATEX ENABLED
                </div>
              </div>
              <button 
                onClick={addQuestion}
                className="flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300"
              >
                <Plus className="h-3 w-3" />
                Add Question
              </button>
            </div>

            {questions.map((q, idx) => (
              <div key={idx} className="relative space-y-3 rounded-xl bg-slate-800/30 p-4 ring-1 ring-slate-800">
                <button 
                  onClick={() => removeQuestion(idx)}
                  className="absolute right-2 top-2 text-slate-500 hover:text-rose-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase text-slate-600">Question {idx + 1}</label>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold uppercase text-slate-600">Marks</label>
                        <input
                          type="number"
                          min="1"
                          value={q.marks || 1}
                          onChange={(e) => updateQuestion(idx, "marks", e.target.value)}
                          className="w-16 rounded bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none ring-1 ring-slate-800 focus:ring-indigo-500"
                        />
                      </div>
                      <button 
                        onClick={() => setPreviewIdx(previewIdx === idx ? null : idx)}
                        className="text-[10px] font-bold text-indigo-400 hover:underline"
                      >
                        {previewIdx === idx ? "Hide Preview" : "Show LaTeX Preview"}
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={q.text}
                    onChange={(e) => updateQuestion(idx, "text", e.target.value)}
                    placeholder="Type here. Use $...$ for inline or $$...$$ for block math."
                    className="w-full rounded-lg bg-slate-950 p-2.5 text-sm text-slate-100 outline-none ring-1 ring-slate-800 focus:ring-indigo-500 font-mono"
                    rows={2}
                  />
                  {previewIdx === idx && (
                    <div className="mt-2 rounded-lg bg-slate-900 p-3 ring-1 ring-slate-800 text-sm">
                      <Latex displayMode={true}>{q.text || "No text to preview"}</Latex>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <input 
                          type="radio" 
                          name={`correct-${idx}`} 
                          checked={q.correct === optIdx}
                          onChange={() => updateQuestion(idx, "correct", optIdx)}
                          className="h-3 w-3 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label className="text-[10px] font-bold uppercase text-slate-600">Option {String.fromCharCode(65 + optIdx)}</label>
                      </div>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateQuestion(idx, "option", { optionIndex: optIdx, text: e.target.value })}
                        className="w-full rounded-lg bg-slate-950 p-2 text-xs text-slate-100 outline-none ring-1 ring-slate-800 focus:ring-indigo-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-slate-800 mt-4">
        <button 
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-100"
        >
          Cancel
        </button>
        <button 
          onClick={handleSubmit}
          disabled={loading || !title.trim()}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? "Creating..." : `Create ${examType === 'daily' ? 'Assignment' : 'Exam'}`}
          <ClipboardList className="h-4 w-4" />
        </button>
      </div>
    </Modal>
  );
}
