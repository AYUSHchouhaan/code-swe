"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { Session } from "next-auth";

interface RepoHeaderProps {
  session: Session;
  search: string;
  onSearchChange: (value: string) => void;
}

export function RepoHeader({ session, search, onSearchChange }: RepoHeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur border-b border-zinc-200 dark:border-zinc-800 px-6 py-3 flex items-center justify-between gap-4">
      <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 shrink-0">
        GitHub Repositories
      </h1>


      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => router.push("/agent")}
          className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold py-1.5 px-4 rounded-lg transition-colors"
        >
          🤖 SWE Agent
        </button>

        {session.user?.image && (
          <img src={session.user.image} alt="avatar" className="w-8 h-8 rounded-full" />
        )}

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
