"use client";

import { useState } from "react";

type LoginFormProps = {
  configError: string;
};

export function LoginForm({ configError }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(configError);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (configError) {
      setError(configError);
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "用户名或密码错误");
        return;
      }

      window.location.href = "/";
    } catch {
      setError("用户名或密码错误");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-slate-700">用户名</span>
        <input
          value={username}
          autoComplete="username"
          className="h-11 w-full rounded-lg border border-slate-200 px-3 text-base outline-none focus:border-slate-400"
          onChange={(event) => setUsername(event.target.value)}
        />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-slate-700">密码</span>
        <input
          value={password}
          type="password"
          autoComplete="current-password"
          className="h-11 w-full rounded-lg border border-slate-200 px-3 text-base outline-none focus:border-slate-400"
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {error ? (
        <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isSubmitting || Boolean(configError)}
        className="h-11 w-full rounded-lg bg-slate-950 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isSubmitting ? "登录中..." : "登录"}
      </button>
    </form>
  );
}
