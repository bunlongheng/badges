"use client";

import { useState, type ReactNode } from "react";
import { BORDERS, FITS, MODES, SHAPES, SIZE_PRESETS, XL_BANDS, type Mode, type Settings } from "@/lib/presets";
import { computeLayout } from "@/lib/layout";

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

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-[11px] font-medium text-zinc-500">{label}</label>
        <span className="text-[11px] tabular-nums text-zinc-400">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="h-1.5 w-full cursor-pointer accent-brand-600"
        aria-label={label}
      />
    </div>
  );
}

export function Controls({
  settings,
  update,
  applyMode,
  reset,
  mobile = false,
}: {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  applyMode: (mode: Mode) => void;
  reset: () => void;
  /** phone: show only the mode presets, collapse the detailed controls */
  mobile?: boolean;
}) {
  const [advanced, setAdvanced] = useState(false);
  return (
    <div className="space-y-5">
      <Field label="Mode">
        <div className="grid grid-cols-3 gap-2">
          {MODES.map((m) => {
            const active = settings.mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => applyMode(m.id)}
                className={[
                  "flex items-center justify-center rounded-xl border py-2.5 text-sm font-semibold transition",
                  active
                    ? "border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500"
                    : "border-zinc-200 text-zinc-700 hover:border-zinc-400 hover:ring-1 hover:ring-zinc-300",
                ].join(" ")}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </Field>

      {/* Phone: keep the drawer short - hide the detailed controls behind a toggle. */}
      {mobile && (
        <button
          type="button"
          onClick={() => setAdvanced((a) => !a)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-200 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
        >
          {advanced ? "Hide settings" : "Customize settings"}
          <span className="text-[10px] text-zinc-400">{advanced ? "▲" : "▾"}</span>
        </button>
      )}

      {(!mobile || advanced) && (
        <>
      <Field label="Badge size">
        <div className="grid grid-cols-2 gap-2 min-[380px]:grid-cols-3">
          {/* XL (Extra Large): 3 full-width bands - a compact cell, biggest first. */}
          {(() => {
            const active = settings.bands > 0;
            return (
              <button
                type="button"
                onClick={() => update("bands", XL_BANDS)}
                className={[
                  "relative rounded-xl border p-2.5 text-left transition",
                  active
                    ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                    : "border-zinc-200 hover:border-zinc-400 hover:ring-1 hover:ring-zinc-300",
                ].join(" ")}
              >
                <span
                  title={`${XL_BANDS} per page`}
                  className={[
                    "absolute right-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
                    active ? "bg-brand-600 text-white" : "bg-zinc-100 text-zinc-500",
                  ].join(" ")}
                >
                  {XL_BANDS}
                </span>
                <div className={["text-sm font-semibold", active ? "text-brand-700" : "text-zinc-800"].join(" ")}>
                  XL
                </div>
                <div className="mt-0.5 text-[11px] text-zinc-500">3 bands</div>
              </button>
            );
          })()}
          {SIZE_PRESETS.map((s) => {
            // A diameter preset is active only in normal grid mode (bands off).
            const active = settings.bands === 0 && Math.abs(settings.sizeIn - s.inches) < 0.001;
            // Show the measurement in the active ruler unit only.
            const detail = settings.rulerUnit === "cm" ? `${s.cm} cm` : `${s.inches.toFixed(2)}"`;
            // How many badges of this size fit on one page (matches the sheet).
            const perPage = computeLayout({ ...settings, bands: 0, sizeIn: s.inches }).perPage;
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => {
                  update("bands", 0);
                  update("sizeIn", s.inches);
                }}
                className={[
                  "relative rounded-xl border p-2.5 text-left transition",
                  active
                    ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                    : "border-zinc-200 hover:border-zinc-400 hover:ring-1 hover:ring-zinc-300",
                ].join(" ")}
              >
                <span
                  title={`${perPage} per page`}
                  className={[
                    "absolute right-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
                    active ? "bg-brand-600 text-white" : "bg-zinc-100 text-zinc-500",
                  ].join(" ")}
                >
                  {perPage}
                </span>
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

      <Field
        label="Fit"
        hint={settings.fit === "contain" ? "whole logo" : "fill & crop"}
      >
        <Segmented value={settings.fit} options={FITS} onChange={(v) => update("fit", v)} />
      </Field>

      <Field label="Border" hint={settings.border === "auto" ? "photo colour" : undefined}>
        <Segmented value={settings.border} options={BORDERS} onChange={(v) => update("border", v)} />
      </Field>

      {/* Sticker-bomb controls appear when Bomb mode is on (see the Mode selector). */}
      {settings.bomb && (
        <div className="space-y-3 border-t border-zinc-200 pt-4">
          <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3">
            <button
              type="button"
              onClick={() => update("bombSeed", settings.bombSeed + 1)}
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-brand-600 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Shuffle
            </button>
            <Slider label="Rotation" value={settings.bombRotate} onChange={(v) => update("bombRotate", v)} />
            <Slider label="Spread" value={settings.bombScatter} onChange={(v) => update("bombScatter", v)} />
            <Slider label="Overlap" value={settings.bombOverlap} onChange={(v) => update("bombOverlap", v)} />
            <p className="text-[11px] leading-snug text-zinc-400">
              Scatters every image on one page. Pick a small size (Micro/Nano) for a dense bomb.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3 border-t border-zinc-200 pt-4">
        <Toggle
          label="Show cut guides"
          checked={settings.cutGuides}
          onChange={(v) => update("cutGuides", v)}
        />
        <div>
          <Toggle
            label="Double-sided (laminate)"
            checked={settings.doubleSided}
            onChange={(v) => update("doubleSided", v)}
          />
          {settings.doubleSided && (
            <p className="mt-1 pl-0.5 text-[11px] leading-snug text-zinc-400">
              PDF adds a mirrored back page, so each badge lands exactly behind
              itself. Preview shows FRONT + BACK. Print double-sided, flip on
              LONG edge, 100% scale (no fit-to-page).
            </p>
          )}
        </div>
        <Toggle
          label="Show ruler & grid"
          checked={settings.showGrid}
          onChange={(v) => update("showGrid", v)}
        />
        <Toggle
          label="Add padding"
          checked={settings.padding}
          onChange={(v) => update("padding", v)}
        />
        {settings.padding && (
          <div className="space-y-1.5 pl-0.5">
            <div className="flex items-baseline justify-between">
              <label className="text-[11px] font-medium text-zinc-500">Padding size</label>
              <span className="text-[11px] tabular-nums text-zinc-400">
                {settings.paddingPct}%
              </span>
            </div>
            <input
              type="range"
              min={2}
              max={25}
              step={1}
              value={settings.paddingPct}
              onChange={(e) => update("paddingPct", parseFloat(e.target.value))}
              className="h-1.5 w-full cursor-pointer accent-brand-600"
              aria-label="Padding size"
            />
          </div>
        )}
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
        </>
      )}
    </div>
  );
}
