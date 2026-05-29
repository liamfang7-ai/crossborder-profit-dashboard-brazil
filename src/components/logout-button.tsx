"use client";

import { useState } from "react";

export function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function logout() {
    setIsLoggingOut(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <button
      type="button"
      disabled={isLoggingOut}
      className="rounded-full border border-slate-200 px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-50 disabled:text-slate-300"
      onClick={() => void logout()}
    >
      {isLoggingOut ? "退出中..." : "退出登录"}
    </button>
  );
}
