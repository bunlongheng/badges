"use client";

import type { ReactNode } from "react";
import { BORDERS, SHAPES, SIZE_PRESETS, type Settings } from "@/lib/presets";

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
}: {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  reset: () => void;
}) {
  return (
    <div className="space-y-5">
      <Field label="Badge size">
        <div className="grid grid-cols-2 gap-2">
          {SIZE_PRESETS.map((s) => {
            const active = Math.abs(settings.sizeIn - s.inches) < 0.001;
            // Show the measurement in the active ruler unit only.
            const detail = settings.rulerUnit === "cm" ? `${s.cm} cm` : `${s.inches.toFixed(2)}"`;
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => update("sizeIn", s.inches)}
                className={[
                  "rounded-xl border p-3 text-left transition",
                  active
                    ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                    : "border-zinc-200 hover:border-zinc-300",
                ].join(" ")}
              >
                <div
                  className={[
                    "text-sm font-semibold",
                    active ? "text-brand-700" : "text-zinc-800",
                  ].join(" ")}
                >
                  {s.label}
                </div>
                <div className="mt-0.5 text-[11px] text-zinc-500">{detail}</div>
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Shape">
        <Segmented value={settings.shape} options={SHAPES} onChange={(v) => update("shape", v)} />
      </Field>

      <Field label="Border" hint={settings.border === "auto" ? "photo colour" : undefined}>
        <Segmented value={settings.border} options={BORDERS} onChange={(v) => update("border", v)} />
      </Field>

      <div className="space-y-3 border-t border-zinc-200 pt-4">
        <Toggle
          label="Show cut guides"
          checked={settings.cutGuides}
          onChange={(v) => update("cutGuides", v)}
        />
        <Toggle
          label="Show ruler & grid"
          checked={settings.showGrid}
          onChange={(v) => update("showGrid", v)}
        />
        <Toggle
          label="Extract File Names"
          checked={settings.showNames}
          onChange={(v) => update("showNames", v)}
        />
        {settings.showNames && (
          <div className="space-y-1.5 pl-0.5">
            <div className="flex items-baseline justify-between">
              <label className="text-[11px] font-medium text-zinc-500">Name size</label>
              <span className="text-[11px] tabular-nums text-zinc-400">
                {settings.nameSize.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min={3}
              max={16}
              step={0.5}
              value={settings.nameSize}
              onChange={(e) => update("nameSize", parseFloat(e.target.value))}
              className="h-1.5 w-full cursor-pointer accent-brand-600"
              aria-label="Name font size"
            />
          </div>
        )}
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
