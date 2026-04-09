"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";

const ROLES = ["pending", "member", "librarian", "admin", "deactivated"] as const;
type Role = (typeof ROLES)[number];

const ROLE_COLORS: Record<Role, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  member: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  librarian: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
  admin: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  deactivated: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};

export default function AdminUsersPage() {
  const utils = api.useUtils();
  const { data: users, isLoading } = api.adminUsers.listAll.useQuery();
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");

  const setRole = api.adminUsers.setRole.useMutation({
    onSuccess: (u) => {
      toast.success(`${u.name} is now ${u.role}`);
      utils.adminUsers.listAll.invalidate();
    },
    onError: (e) => toast.error(e.message || "Failed to update role"),
  });

  const deleteUser = api.adminUsers.deleteUser.useMutation({
    onSuccess: (r) => {
      toast.success(`${r.name} deleted`);
      setConfirmDelete(null);
      utils.adminUsers.listAll.invalidate();
    },
    onError: (e) => toast.error(e.message || "Failed to delete user"),
  });

  const filtered =
    roleFilter === "all" ? users : users?.filter((u) => u.role === roleFilter);

  const pendingCount = users?.filter((u) => u.role === "pending").length ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          {pendingCount > 0 && (
            <p className="text-amber-600 dark:text-amber-400 text-sm mt-1">
              {pendingCount} member{pendingCount !== 1 ? "s" : ""} awaiting approval
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", ...ROLES] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                roleFilter === r
                  ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-transparent"
                  : "border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && filtered?.length === 0 && (
        <div className="text-center text-neutral-500 py-16">No users found.</div>
      )}

      <div className="space-y-2">
        {filtered?.map((user) => (
          <div
            key={user.id}
            className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{user.name}</div>
              <div className="text-sm text-neutral-500 truncate">{user.email}</div>
            </div>
            <div className="flex items-center gap-3 flex-wrap shrink-0">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[user.role as Role]}`}>
                {user.role}
              </span>
              <select
                value={user.role}
                onChange={(e) =>
                  setRole.mutate({ userId: user.id, role: e.target.value as Role })
                }
                disabled={setRole.isPending}
                className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2 py-1 text-sm disabled:opacity-50"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setConfirmDelete({ id: user.id, name: user.name })}
                className="rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 px-3 py-1 text-sm hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-neutral-200 dark:border-neutral-800">
            <h2 className="text-lg font-semibold">Delete user?</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
              This will permanently delete{" "}
              <span className="font-medium text-neutral-900 dark:text-white">
                {confirmDelete.name}
              </span>{" "}
              and all their data. This cannot be undone.
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-full border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteUser.mutate({ userId: confirmDelete.id })}
                disabled={deleteUser.isPending}
                className="rounded-full bg-rose-600 text-white px-4 py-2 text-sm font-medium hover:bg-rose-700 disabled:opacity-50"
              >
                {deleteUser.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
