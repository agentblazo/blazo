import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blazo",
  description: "Open-source observability for AI agents.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
              <Link href="/" className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="text-lg font-semibold tracking-tight">Blazo</span>
              </Link>
              <span className="text-xs uppercase tracking-widest text-slate-400">
                agent observability
              </span>
              <nav className="ml-auto flex items-center gap-1">
                <Link
                  href="/"
                  className="rounded px-2 py-1 text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                >
                  Overview
                </Link>
                <Link
                  href="/runs"
                  className="rounded px-2 py-1 text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                >
                  Runs
                </Link>
                <Link
                  href="/errors"
                  className="rounded px-2 py-1 text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                >
                  Errors
                </Link>
                <Link
                  href="/logs"
                  className="rounded px-2 py-1 text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                >
                  Logs
                </Link>
                <Link
                  href="/settings"
                  className="rounded px-2 py-1 text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                >
                  Settings
                </Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
