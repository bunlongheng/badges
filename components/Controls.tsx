"use client";

import type { ReactNode } from "react";
import {
  BADGE_STYLES,
  FITS,
  PAPERS,
  SHAPES,
  SIZE_PRESETS,
  type Settings,
} from "@/lib/presets";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {label}
        </label>
        {hint && <span className="text-xs tabular-nums text-zinc-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-flow-col gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800/70">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={[
            "rounded-md px-2 py-1.5 text-xs font-medium transition",
            value === o.id
              ? "bg-white text-brand-700 shadow-sm dark:bg-zinc-950 dark:text-brand-300"
              : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between text-sm"
    >
      <span className="text-zinc-700 dark:text-zinc-300">{label}</span>
      <span
        className={[
          "relative inline-flex h-5 w-9 items-center rounded-full transition",
          checked ? "bg-brand-600" : "bg-zinc-300 dark:bg-zinc-700",
        ].join(" ")}
      >
        <span
          className={[
            "inline-block h-4 w-4 transform rounded-full bg-white shadow transition",
            checked ? "translate-x-4" : "translate-x-0.5",
          ].join(" ")}
        />
      </span>
    </button>
  );
}

export function Controls({
  settings,
  update,
  reset,
  maxCols,
}: {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  reset: () => void;
  maxCols: number;
}) {
  return (
    <div className="space-y-5">
      <Field label="Paper">
        <select
          value={settings.paperId}
          onChange={(e) => update("paperId", e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-brand-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          {PAPERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Badge size" hint={`${settings.sizeIn}"`}>
        <div className="flex flex-wrap gap-1.5">
          {SIZE_PRESETS.map((s) => (
            <button
              key={s.inches}
              type="button"
              onClick={() => update("sizeIn", s.inches)}
              className={[
                "rounded-md border px-2 py-1 text-xs font-medium transition",
                settings.sizeIn === s.inches
                  ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                  : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400",
              ].join(" ")}
            >
              {s.label}
            </button>
          ))}
        </div>
        <input
          type="range"
          min={0.75}
          max={5}
          step={0.125}
          value={settings.sizeIn}
          onChange={(e) => update("sizeIn", parseFloat(e.target.value))}
          className="mt-2 w-full"
        />
      </Field>

      <Field label="Columns" hint={`${Math.min(settings.columns, maxCols)} of max ${maxCols}`}>
        <input
          type="range"
          min={1}
          max={8}
          step={1}
          value={settings.columns}
          onChange={(e) => update("columns", parseInt(e.target.value, 10))}
          className="w-full"
        />
      </Field>

      <div className="grid grid-cols-1 gap-4">
        <Field label="Shape">
          <Segmented value={settings.shape} options={SHAPES} onChange={(v) => update("shape", v)} />
        </Field>
        <Field label="Image fit">
          <Segmented value={settings.fit} options={FITS} onChange={(v) => update("fit", v)} />
        </Field>
        <Field label="Style">
          <Segmented value={settings.style} options={BADGE_STYLES} onChange={(v) => update("style", v)} />
        </Field>
      </div>

      <Field label="Gap" hint={`${settings.gapIn}"`}>
        <input
          type="range"
          min={0}
          max={0.5}
          step={0.05}
          value={settings.gapIn}
          onChange={(e) => update("gapIn", parseFloat(e.target.value))}
          className="w-full"
        />
      </Field>

      <Field label="Page margin" hint={`${settings.marginIn}"`}>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.marginIn}
          onChange={(e) => update("marginIn", parseFloat(e.target.value))}
          className="w-full"
        />
      </Field>

      <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <Toggle
          label="Repeat to fill page"
          checked={settings.repeat}
          onChange={(v) => update("repeat", v)}
        />
        <Toggle
          label="Show cut guides"
          checked={settings.cutGuides}
          onChange={(v) => update("cutGuides", v)}
        />
      </div>

      <button
        type="button"
        onClick={reset}
        className="w-full rounded-lg border border-zinc-200 py-2 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        Reset to defaults
      </button>
    </div>
  );
}
