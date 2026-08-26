import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

export function Header({ actions, center }: { actions?: ReactNode; center?: ReactNode }) {
  return (
    <header className="no-print sticky top-0 z-30 border-b border-zinc-200/80 bg-white/80 backdrop-blur">
      <div className="relative mx-auto flex h-14 max-w-[1800px] items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Image src="/icon.png" alt="Badges" width={30} height={30} className="rounded-lg" priority />
          <span className="text-lg font-semibold tracking-tight">Badges</span>
        </Link>
        {center && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 sm:block">
            <div className="pointer-events-auto">{center}</div>
          </div>
        )}
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
        <a
          href="https://github.com/bunlongheng/badges"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub repository"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-100"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.73 1.27 3.4.97.1-.75.4-1.27.73-1.56-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.2-3.1-.12-.29-.52-1.46.11-3.05 0 0 .98-.31 3.2 1.18a11.1 11.1 0 0 1 5.83 0c2.22-1.49 3.2-1.18 3.2-1.18.63 1.59.23 2.76.11 3.05.75.81 1.2 1.84 1.2 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
          </svg>
        </a>
      </div>
    </header>
  );
}
