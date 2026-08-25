import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Enter the Badges studio - a local-first, privacy-first badge sheet maker.",
};

export default function SignIn() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex justify-end p-4">
        <ThemeToggle />
      </div>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/30">
            <div className="flex flex-col items-center text-center">
              <Logo size={56} />
              <h1 className="mt-4 text-2xl font-bold tracking-tight">Welcome to Badges</h1>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                A local-first studio for print-ready badge, button &amp; sticker
                sheets. No account, no upload - your images never leave this
                device.
              </p>
            </div>

            <Link
              href="/"
              className="mt-7 flex h-11 w-full items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Enter the studio
            </Link>

            <div className="mt-5 flex items-center gap-3 text-xs text-zinc-400">
              <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
              private &amp; free
              <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            </div>

            <ul className="mt-5 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
              {[
                "Drop, paste, or upload any images",
                "Buttons, circles, stickers, name tags",
                "Export a crisp PDF or print directly",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 shrink-0 text-brand-500"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-6 text-center text-xs text-zinc-400">
            Open source ·{" "}
            <a
              href="https://github.com/bunlongheng/badges"
              className="underline hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              github.com/bunlongheng/badges
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
