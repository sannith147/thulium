import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../Card";
import { UploadContentModal } from "./UploadContentModal";
import { Play, ClipboardList, FileText, Pencil, Trash2, Plus, ExternalLink } from "lucide-react";
import { Latex } from "../Latex";

const TYPE_ICON = { video: Play, assignment: ClipboardList, reading: FileText };
const TYPE_COLOR = {
  video: "bg-rose-500/10 text-rose-400",
  assignment: "bg-amber-500/10 text-amber-400",
  reading: "bg-indigo-500/10 text-indigo-400"
};

export function MyContentPanel() {
  const { auth } = useAuth();
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const fetchContents = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/evaluator/content/${auth.id}`);
      setContents(res.data?.contents || []);
    } catch (err) {
      console.error("Failed to fetch contents:", err);
      setContents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth.id) fetchContents();
  }, [auth.id]);

  const handleEdit = (item) => {
    setEditItem(item);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditItem(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    setDeleting(item.id);
    try {
      await api.delete(`/evaluator/content/${item.id}?deleted_by=${auth.id}`);
      setContents((prev) => prev.filter((c) => c.id !== item.id));
    } catch (err) {
      alert("Failed to delete: " + (err.response?.data?.error || err.message));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <Card title="My Uploaded Content">
        <div className="mb-3 flex justify-end">
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
          >
            <Plus className="h-3.5 w-3.5" />
            New Upload
          </button>
        </div>

        {loading ? (
          <div className="flex h-24 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : contents.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            No content uploaded yet. Click "New Upload" to add your first material.
          </div>
        ) : (
          <div className="space-y-2">
            {contents.map((item) => {
              const Icon = TYPE_ICON[item.content_type] || FileText;
              const colorClass = TYPE_COLOR[item.content_type] || TYPE_COLOR.reading;
              const link = item.content_type === "video" ? item.youtube_url : item.file_url;

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg bg-slate-800/50 p-3 ring-1 ring-slate-700"
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-100">
                      <Latex>{item.title}</Latex>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span className="uppercase">{item.content_type}</span>
                      <span>·</span>
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {link && (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded p-1.5 text-slate-500 hover:bg-slate-700 hover:text-slate-200"
                        title="Open"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {item.created_by === auth.id && (
                      <>
                        <button
                          onClick={() => handleEdit(item)}
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-700 hover:text-indigo-400"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          disabled={deleting === item.id}
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-700 hover:text-rose-400 disabled:opacity-40"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <UploadContentModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditItem(null); }}
        onContentCreated={fetchContents}
        editContent={editItem}
      />
    </>
  );
}
