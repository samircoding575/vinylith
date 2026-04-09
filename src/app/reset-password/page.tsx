"use client";

import { Suspense, use, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import Link from "next/link";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);

  const reset = api.auth.resetPassword.useMutation({
    onSuccess: () => setDone(true),
  });

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-neutral-500">Invalid reset link.</p>
        <Link href="/forgot-password" className="mt-4 inline-block underline text-sm">
          Request a new one
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="text-4xl mb-4">✅</div>
        <h1 className="text-2xl font-bold">Password updated!</h1>
        <p className="mt-2 text-neutral-500">You can now sign in with your new password.</p>
        <button
          onClick={() => router.push("/login")}
          className="mt-6 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-6 py-2.5 text-sm font-medium"
        >
          Sign in
        </button>
      </div>
    );
  }

  const mismatch = confirm && password !== confirm;

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Set new password</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (password !== confirm) return;
          reset.mutate({ token, password });
        }}
        className="mt-8 space-y-4"
      >
        <div>
          <input
            type="password"
            required
            minLength={6}
            placeholder="New password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2"
          />
        </div>
        <div>
          <input
            type="password"
            required
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={`w-full rounded-lg border px-3 py-2 bg-white dark:bg-neutral-950 ${
              mismatch
                ? "border-rose-400"
                : "border-neutral-300 dark:border-neutral-700"
            }`}
          />
          {mismatch && (
            <p className="text-xs text-rose-500 mt-1">Passwords don't match</p>
          )}
        </div>
        {reset.error && (
          <div className="text-sm text-rose-600">{reset.error.message}</div>
        )}
        <button
          disabled={reset.isPending || !!mismatch}
          className="w-full rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-6 py-3 font-medium disabled:opacity-50"
        >
          {reset.isPending ? "Updating…" : "Update password"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-sm px-6 py-20">
      <Suspense fallback={<div className="text-neutral-500">Loading…</div>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
