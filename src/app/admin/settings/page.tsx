"use client";

import { useRef, useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { format } from "date-fns";

// ─── Types ───────────────────────────────────────────────────────────────────

const ITEM_TYPES = ["book", "vinyl", "toy", "notebook"] as const;
const CONDITIONS = ["mint", "near_mint", "good", "fair", "poor"] as const;
type ItemType = (typeof ITEM_TYPES)[number];
type Condition = (typeof CONDITIONS)[number];

interface ImportRow {
  type: ItemType;
  title: string;
  description?: string;
  condition?: Condition;
  imageUrl?: string;
  attributes?: Record<string, unknown>;
  [key: string]: unknown;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseCSV(text: string): ImportRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row");
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line, i) => {
    const vals = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) ?? [];
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (vals[idx] ?? "").trim().replace(/^"|"$/g, "");
    });
    if (!obj.type || !obj.title) throw new Error(`Row ${i + 2}: missing required fields "type" and "title"`);
    const attributes: Record<string, unknown> = {};
    for (const k of Object.keys(obj)) {
      if (!["type","title","description","condition","imageUrl"].includes(k)) {
        attributes[k] = obj[k];
      }
    }
    return {
      type: obj.type as ItemType,
      title: obj.title,
      description: obj.description || undefined,
      condition: (obj.condition as Condition) || "good",
      imageUrl: obj.imageUrl || undefined,
      attributes,
    };
  });
}

function parseJSON(text: string): ImportRow[] {
  const parsed = JSON.parse(text);
  const arr = Array.isArray(parsed) ? parsed : parsed.items ?? [parsed];
  if (!arr.length) throw new Error("JSON contains no items");
  return arr.map((item: Record<string, unknown>, i: number) => {
    if (!item.type || !item.title) throw new Error(`Item ${i + 1}: missing "type" or "title"`);
    return item as ImportRow;
  });
}

function validate(rows: ImportRow[]): { valid: ImportRow[]; errors: string[] } {
  const errors: string[] = [];
  const valid: ImportRow[] = [];
  rows.forEach((row, i) => {
    const n = i + 1;
    if (!ITEM_TYPES.includes(row.type)) {
      errors.push(`Row ${n} "${row.title}": invalid type "${row.type}". Must be one of: ${ITEM_TYPES.join(", ")}`);
      return;
    }
    if (row.condition && !CONDITIONS.includes(row.condition)) {
      errors.push(`Row ${n} "${row.title}": invalid condition "${row.condition}". Must be one of: ${CONDITIONS.join(", ")}`);
      return;
    }
    valid.push({ ...row, attributes: row.attributes ?? {} });
  });
  return { valid, errors };
}

// ─── Confirmation Modal ───────────────────────────────────────────────────────

function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
  loading,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{message}</p>
        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-full border border-neutral-300 dark:border-neutral-700 px-5 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-full bg-rose-600 text-white px-5 py-2 text-sm font-medium hover:bg-rose-700 disabled:opacity-50"
          >
            {loading ? "Deleting…" : "Yes, delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Import Panel ─────────────────────────────────────────────────────────────

function ImportPanel({ onDone }: { onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportRow[] | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const bulkImport = api.admin.bulkImport.useMutation({
    onSuccess: (res) => {
      if (res.inserted > 0) toast.success(`Imported ${res.inserted} item${res.inserted > 1 ? "s" : ""} successfully`);
      if (res.failed > 0) toast.error(`${res.failed} item${res.failed > 1 ? "s" : ""} failed to import`);
      setPreview(null);
      setValidationErrors([]);
      if (fileRef.current) fileRef.current.value = "";
      onDone();
    },
    onError: (e) => toast.error(e.message || "Import failed"),
  });

  const handleFile = async (file: File) => {
    setParseError(null);
    setPreview(null);
    setValidationErrors([]);
    try {
      const text = await file.text();
      const rows = file.name.endsWith(".json") ? parseJSON(text) : parseCSV(text);
      const { valid, errors } = validate(rows);
      setPreview(valid);
      setValidationErrors(errors);
    } catch (e) {
      setParseError((e as Error).message);
    }
  };

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
      <h2 className="text-xl font-semibold">Import items</h2>
      <p className="text-sm text-neutral-500 mt-1">
        Upload a <strong>CSV</strong> or <strong>JSON</strong> file. Required fields:{" "}
        <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">type</code>,{" "}
        <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">title</code>. Optional:{" "}
        <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">description</code>,{" "}
        <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">condition</code>,{" "}
        <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">imageUrl</code>, any extra columns become attributes.
      </p>

      {/* Template download */}
      <div className="mt-3 flex gap-2">
        <a
          href={`data:text/csv;charset=utf-8,type,title,description,condition,imageUrl,artist,genre,year\nvinyl,My Record,A great album,good,,Miles Davis,jazz,1960`}
          download="vinylith-template.csv"
          className="text-xs underline text-neutral-500 hover:text-neutral-800 dark:hover:text-white"
        >
          Download CSV template
        </a>
        <span className="text-neutral-300 dark:text-neutral-700">·</span>
        <a
          href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify([{type:"vinyl",title:"My Record",description:"A great album",condition:"good",attributes:{artist:"Miles Davis",genre:"jazz",year:1960}}],null,2))}`}
          download="vinylith-template.json"
          className="text-xs underline text-neutral-500 hover:text-neutral-800 dark:hover:text-white"
        >
          Download JSON template
        </a>
      </div>

      {/* Drop zone */}
      <label
        className="mt-4 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 p-10 cursor-pointer hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      >
        <span className="text-3xl">📂</span>
        <span className="text-sm text-neutral-500">Drag & drop a file here, or click to browse</span>
        <span className="text-xs text-neutral-400">.csv or .json</span>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.json"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </label>

      {/* Parse error */}
      {parseError && (
        <div className="mt-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-4 text-sm text-rose-700 dark:text-rose-300">
          <strong>Parse error:</strong> {parseError}
        </div>
      )}

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="mt-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4">
          <div className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-2">
            {validationErrors.length} row{validationErrors.length > 1 ? "s" : ""} skipped (invalid):
          </div>
          <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
            {validationErrors.map((e, i) => <li key={i}>• {e}</li>)}
          </ul>
        </div>
      )}

      {/* Preview table */}
      {preview && preview.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-medium mb-2">
            Preview — {preview.length} valid row{preview.length > 1 ? "s" : ""} ready to import
          </div>
          <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800 max-h-64">
            <table className="w-full text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800 sticky top-0">
                <tr>
                  {["type","title","condition","attributes"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-neutral-500 capitalize">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-t border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <td className="px-3 py-2 capitalize">{row.type}</td>
                    <td className="px-3 py-2 max-w-[200px] truncate">{row.title}</td>
                    <td className="px-3 py-2 capitalize">{row.condition ?? "good"}</td>
                    <td className="px-3 py-2 text-neutral-400 max-w-[200px] truncate">
                      {Object.keys(row.attributes ?? {}).join(", ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={() => {
                bulkImport.mutate({
                  rows: preview.map((r) => ({
                    type: r.type,
                    title: r.title,
                    description: r.description,
                    condition: r.condition ?? "good",
                    imageUrl: r.imageUrl,
                    attributes: r.attributes ?? {},
                  })),
                });
              }}
              disabled={bulkImport.isPending}
              className="rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-6 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {bulkImport.isPending
                ? `Importing… (this may take a moment)`
                : `Import ${preview.length} item${preview.length > 1 ? "s" : ""}`}
            </button>
            <button
              onClick={() => { setPreview(null); setValidationErrors([]); if (fileRef.current) fileRef.current.value = ""; }}
              className="rounded-full border border-neutral-300 dark:border-neutral-700 px-5 py-2.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Management Table ─────────────────────────────────────────────────────────

function ManagementTable() {
  const utils = api.useUtils();
  const { data, isLoading, refetch } = api.admin.listAll.useQuery();
  const [confirm, setConfirm] = useState<{ id: string; title: string } | null>(null);
  const [filter, setFilter] = useState("");

  const deleteItem = api.admin.deleteItem.useMutation({
    onSuccess: (res) => {
      toast.success(`"${res.title}" deleted`);
      setConfirm(null);
      utils.admin.listAll.invalidate();
      utils.items.list.invalidate();
    },
    onError: (e) => {
      toast.error(e.message || "Delete failed");
      setConfirm(null);
    },
  });

  const filtered = (data ?? []).filter((item) =>
    filter === "" ||
    item.title.toLowerCase().includes(filter.toLowerCase()) ||
    item.type.toLowerCase().includes(filter.toLowerCase())
  );

  const typeColor: Record<string, string> = {
    book: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    vinyl: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    toy: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
    notebook: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  };

  return (
    <>
      {confirm && (
        <ConfirmModal
          title="Delete item?"
          message={`Are you sure you want to permanently delete "${confirm.title}"? This will also remove all borrowing records and condition logs for this item. This action cannot be undone.`}
          loading={deleteItem.isPending}
          onConfirm={() => deleteItem.mutate({ id: confirm.id })}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl font-semibold">All items</h2>
            <p className="text-sm text-neutral-500 mt-0.5">{data?.length ?? 0} total</p>
          </div>
          <div className="flex gap-2">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by title or type…"
              className="rounded-full border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 px-4 py-2 text-sm w-56"
            />
            <button
              onClick={() => refetch()}
              className="rounded-full border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              ↻
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-10 text-center text-neutral-500 text-sm">
            {filter ? "No items match your filter." : "No items in the database yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  <th className="pb-3 text-left font-medium text-neutral-500">Type</th>
                  <th className="pb-3 text-left font-medium text-neutral-500">Title</th>
                  <th className="pb-3 text-left font-medium text-neutral-500 hidden sm:table-cell">Condition</th>
                  <th className="pb-3 text-left font-medium text-neutral-500 hidden md:table-cell">Key attributes</th>
                  <th className="pb-3 text-left font-medium text-neutral-500 hidden lg:table-cell">Added</th>
                  <th className="pb-3 text-right font-medium text-neutral-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition">
                    <td className="py-3 pr-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${typeColor[item.type] ?? ""}`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="py-3 pr-3 font-medium max-w-[200px] truncate">{item.title}</td>
                    <td className="py-3 pr-3 text-neutral-500 capitalize hidden sm:table-cell">
                      {item.condition.replace("_", " ")}
                    </td>
                    <td className="py-3 pr-3 text-neutral-400 text-xs hidden md:table-cell max-w-[180px] truncate">
                      {Object.entries(item.attributes ?? {})
                        .slice(0, 3)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" · ") || "—"}
                    </td>
                    <td className="py-3 pr-3 text-neutral-400 text-xs hidden lg:table-cell whitespace-nowrap">
                      {format(new Date(item.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => setConfirm({ id: item.id, title: item.title })}
                        className="rounded-full border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 px-3 py-1 text-xs hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const utils = api.useUtils();

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-3 py-1 text-xs font-medium mb-3">
          🔒 Admin only
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Settings & Data Management</h1>
        <p className="text-neutral-500 mt-1">Import items in bulk or manage existing records.</p>
      </div>

      <div className="space-y-8">
        <ImportPanel onDone={() => utils.admin.listAll.invalidate()} />
        <ManagementTable />
      </div>
    </div>
  );
}
