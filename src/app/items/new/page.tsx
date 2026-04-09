"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";

const TYPES = ["book", "vinyl", "toy", "notebook"] as const;
const CONDITIONS = ["mint", "near_mint", "good", "fair", "poor"] as const;

const ATTR_FIELDS: Record<string, { key: string; label: string }[]> = {
  book: [
    { key: "isbn", label: "ISBN" },
    { key: "author", label: "Author" },
    { key: "genre", label: "Genre" },
    { key: "year", label: "Year" },
    { key: "publisher", label: "Publisher" },
  ],
  vinyl: [
    { key: "artist", label: "Artist" },
    { key: "label", label: "Label" },
    { key: "year", label: "Year" },
    { key: "genre", label: "Genre" },
    { key: "rpm", label: "RPM" },
  ],
  toy: [
    { key: "ageRating", label: "Age rating" },
    { key: "manufacturer", label: "Manufacturer" },
    { key: "material", label: "Material" },
    { key: "category", label: "Category" },
  ],
  notebook: [
    { key: "pages", label: "Pages" },
    { key: "ruling", label: "Ruling" },
    { key: "brand", label: "Brand" },
    { key: "size", label: "Size" },
  ],
};

export default function NewItemPage() {
  const router = useRouter();
  const [type, setType] = useState<(typeof TYPES)[number]>("book");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] =
    useState<(typeof CONDITIONS)[number]>("good");
  const [imageUrl, setImageUrl] = useState("");
  const [attrs, setAttrs] = useState<Record<string, string>>({});

  const create = api.items.create.useMutation({
    onSuccess: (item) => {
      toast.success("Item created");
      router.push(`/items/${item.id}`);
    },
    onError: (e) => toast.error(e.message || "Failed to create item"),
  });

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-3xl font-bold tracking-tight">Add new item</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate({
            type,
            title,
            description,
            condition,
            imageUrl,
            attributes: attrs,
          });
        }}
        className="mt-8 space-y-5"
      >
        <Field label="Type">
          <div className="flex gap-2 flex-wrap">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t);
                  setAttrs({});
                }}
                className={`rounded-full px-4 py-1.5 text-sm capitalize border ${
                  type === t
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-transparent"
                    : "border-neutral-300 dark:border-neutral-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Title">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2"
          />
        </Field>

        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Condition">
            <select
              value={condition}
              onChange={(e) =>
                setCondition(e.target.value as (typeof CONDITIONS)[number])
              }
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2"
            >
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c.replace("_", " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Image URL">
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2"
            />
          </Field>
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 bg-white dark:bg-neutral-900">
          <div className="font-semibold mb-3 capitalize">{type} details</div>
          <div className="grid grid-cols-2 gap-3">
            {ATTR_FIELDS[type].map((f) => (
              <div key={f.key}>
                <label className="text-xs text-neutral-500">{f.label}</label>
                <input
                  value={attrs[f.key] || ""}
                  onChange={(e) =>
                    setAttrs({ ...attrs, [f.key]: e.target.value })
                  }
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 mt-1"
                />
              </div>
            ))}
          </div>
        </div>

        {create.error && (
          <div className="text-sm text-rose-600">{create.error.message}</div>
        )}

        <button
          type="submit"
          disabled={create.isPending}
          className="rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-6 py-3 font-medium disabled:opacity-50"
        >
          {create.isPending ? "Creating…" : "Create item"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      {children}
    </div>
  );
}
