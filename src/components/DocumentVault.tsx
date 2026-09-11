"use client";

import { useEffect, useRef, useState } from "react";
import { DOC_TYPES, DOC_TYPE_LABELS, type DocType } from "@/lib/doc-types";

interface Doc {
  id: string;
  name: string;
  docType: string;
  mimeType: string;
  size: number;
  aiClassified: boolean;
  createdAt: string;
  url: string | null;
}

interface Uploading {
  id: string;
  name: string;
  error?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z";
  return "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z";
}

export default function DocumentVault() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<Uploading[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/documents")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setDocs(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function uploadFile(file: File) {
    const tempId = `${file.name}-${file.size}-${file.lastModified}`;
    setUploads((u) => [...u, { id: tempId, name: file.name }]);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/documents", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Upload failed (${res.status})`);
      }
      const doc: Doc = await res.json();
      setDocs((prev) => [doc, ...prev]);
      setOpenFolders((f) => ({ ...f, [doc.docType]: true }));
      setUploads((u) => u.filter((x) => x.id !== tempId));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setUploads((u) => u.map((x) => (x.id === tempId ? { ...x, error: msg } : x)));
    }
  }

  function handleFiles(list: FileList | null) {
    if (!list) return;
    Array.from(list).forEach(uploadFile);
  }

  async function refile(id: string, docType: DocType) {
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, docType, aiClassified: false } : d)));
    setOpenFolders((f) => ({ ...f, [docType]: true }));
    await fetch("/api/documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, docType }),
    });
  }

  async function remove(id: string) {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    setDocs((prev) => prev.filter((d) => d.id !== id));
    await fetch("/api/documents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  // Group into folders, preserving DOC_TYPES order and only showing non-empty ones.
  const byType: Record<string, Doc[]> = {};
  for (const d of docs) (byType[d.docType] ||= []).push(d);
  const folders = DOC_TYPES.filter((t) => byType[t]?.length);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-100">Document Vault</h2>
        <p className="text-sm text-slate-400 mt-1">
          Drop in a settlement statement, W-9, receipt — anything. It gets read and filed into the
          right folder automatically.
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/30 border border-red-700 rounded-lg px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileInput.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors mb-6 ${
          dragOver ? "border-emerald-500 bg-emerald-900/10" : "border-slate-700 bg-slate-900/40 hover:border-slate-600"
        }`}
      >
        <input
          ref={fileInput}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.docx"
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
        />
        <svg className="w-10 h-10 mx-auto mb-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-slate-300 font-medium">Drop files here or click to upload</p>
        <p className="text-xs text-slate-500 mt-1">PDF, images, or Word — up to 15 MB each</p>
      </div>

      {/* In-flight uploads */}
      {uploads.length > 0 && (
        <div className="space-y-2 mb-6">
          {uploads.map((u) => (
            <div key={u.id} className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3">
              {u.error ? (
                <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 truncate">{u.name}</p>
                <p className={`text-xs ${u.error ? "text-red-400" : "text-slate-500"}`}>
                  {u.error || "Reading & filing with AI…"}
                </p>
              </div>
              {u.error && (
                <button onClick={() => setUploads((s) => s.filter((x) => x.id !== u.id))} className="text-slate-500 hover:text-slate-300 text-lg">&times;</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Folders */}
      {loading ? (
        <div className="text-slate-500 py-8">Loading documents…</div>
      ) : folders.length === 0 && uploads.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p className="text-sm">No documents yet. Upload one above to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {folders.map((type) => {
            const items = byType[type];
            const open = openFolders[type] ?? false;
            return (
              <div key={type} className="rounded-xl border border-slate-700 bg-slate-800 overflow-hidden">
                <button
                  onClick={() => setOpenFolders((f) => ({ ...f, [type]: !open }))}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-750"
                >
                  <svg className="w-5 h-5 text-amber-400/80 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                  </svg>
                  <span className="text-sm font-semibold text-slate-200 flex-1">{DOC_TYPE_LABELS[type]}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-900 text-slate-400">{items.length}</span>
                  <svg className={`w-4 h-4 text-slate-500 transition-transform ${open ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {open && (
                  <div className="border-t border-slate-700 divide-y divide-slate-700/60">
                    {items.map((d) => (
                      <div key={d.id} className="flex items-center gap-3 px-4 py-2.5">
                        <svg className="w-5 h-5 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d={fileIcon(d.mimeType)} />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-200 truncate">{d.name}</span>
                            {d.aiClassified && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/30 text-emerald-400 flex-shrink-0">AI filed</span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500">
                            {new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {formatSize(d.size)}
                          </span>
                        </div>

                        {/* Re-file */}
                        <select
                          value={d.docType}
                          onChange={(e) => refile(d.id, e.target.value as DocType)}
                          title="Move to folder"
                          className="text-xs border border-slate-600 rounded px-2 py-1 bg-slate-900 text-slate-300 max-w-[9rem]"
                        >
                          {DOC_TYPES.map((t) => (
                            <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>
                          ))}
                        </select>

                        {d.url && (
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-emerald-500 hover:text-emerald-400 whitespace-nowrap"
                          >
                            View
                          </a>
                        )}
                        <button
                          onClick={() => remove(d.id)}
                          className="text-red-400 hover:text-red-300 text-lg leading-none flex-shrink-0"
                          title="Delete"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
