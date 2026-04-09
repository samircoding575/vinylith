"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const register = api.users.register.useMutation({
    onSuccess: async () => {
      toast.success("Account created — welcome!");
      await signIn("credentials", { email, password, redirect: false });
      router.push("/dashboard");
    },
    onError: (e) => toast.error(e.message || "Registration failed"),
  });

  return (
    <div className="mx-auto max-w-sm px-6 py-20">
      <h1 className="text-3xl font-bold tracking-tight">Create account</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          register.mutate({ name, email, password });
        }}
        className="mt-8 space-y-4"
      >
        <input
          required
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2"
        />
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Password (min 6 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2"
        />
        {register.error && (
          <div className="text-sm text-rose-600">{register.error.message}</div>
        )}
        <button
          disabled={register.isPending}
          className="w-full rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-6 py-3 font-medium disabled:opacity-50"
        >
          {register.isPending ? "Creating…" : "Create account"}
        </button>
      </form>
    </div>
  );
}
