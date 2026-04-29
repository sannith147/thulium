import React, { useState, useEffect } from "react";
import { Modal } from "../Modal";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { Link, FilePlus, Video, ClipboardList, Info, Pencil } from "lucide-react";

export function UploadContentModal({ isOpen, onClose, onContentCreated, editContent = null }) {
  const { auth } = useAuth();
  const isEditing = !!editContent;

  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState("video");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill form when editing
  useEffect(() => {
    if (editContent) {
      setTitle(editContent.title || "");
      setContentType(editContent.content_type || "video");
      setYoutubeUrl(editContent.youtube_url || "");
      setFileUrl(editContent.file_url || "");
    } else {
      setTitle("");
      setContentType("video");
      setYoutubeUrl("");
      setFileUrl("");
    }
    setError("");
  }, [editContent, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError("");

    const payload = {
      title,
      content_type: contentType,
      youtube_url: contentType === "video" ? youtubeUrl : null,
      file_url: contentType !== "video" ? fileUrl : null,
    };

    try {
      if (isEditing) {
        await api.put(`/evaluator/content/${editContent.id}`, {
          ...payload,
          updated_by: auth.id
        });
      } else {
        await api.post("/evaluator/content", {
          ...payload,
          created_by: auth.id
        });
      }
      onContentCreated?.();
      onClose();
    } catch (err) {
      console.error("Failed to save content:", err);
      setError(err.response?.data?.error || "Failed to save content. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? "Edit Content" : "Upload Learning Content"}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-400 ring-1 ring-rose-500/20">{error}</div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Introduction to Graph Theory"
            className="w-full rounded-lg bg-slate-950 p-2.5 text-sm text-slate-100 outline-none ring-1 ring-slate-800 focus:ring-indigo-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Content Type</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "video", label: "Video", icon: Video },
              { id: "assignment", label: "Assignment", icon: ClipboardList },
              { id: "reading", label: "Reading", icon: FilePlus }
            ].map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setContentType(type.id)}
                className={`flex flex-col items-center justify-center gap-2 rounded-lg border p-3 transition-all ${
                  contentType === type.id
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                    : "border-slate-800 bg-slate-900/50 text-slate-500 hover:border-slate-700"
                }`}
              >
                <type.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {contentType === "video" ? (
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">YouTube URL</label>
            <div className="relative">
              <Video className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="url"
                required
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full rounded-lg bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-slate-100 outline-none ring-1 ring-slate-800 focus:ring-indigo-500"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {contentType === "assignment" ? "Assignment File URL" : "Resource Link / File URL"}
            </label>
            <div className="relative">
              <Link className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                required
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full rounded-lg bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-slate-100 outline-none ring-1 ring-slate-800 focus:ring-indigo-500"
              />
            </div>
            <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
              <Info className="h-3 w-3" />
              Provide a direct link to the file (Google Drive, Dropbox, etc.)
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? "Saving..." : isEditing ? "Save Changes" : "Upload Content"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
