"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

import { GlassPanel } from "@/components/glass/GlassPanel";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "queued", label: "Queued" },
  { value: "understanding", label: "Understanding" },
  { value: "resolving_preview", label: "Resolving preview" },
  { value: "cloning", label: "Cloning" },
  { value: "starting_app", label: "Starting app" },
  { value: "running", label: "Running" },
  { value: "judging", label: "Judging" },
  { value: "reported", label: "Reported" },
  { value: "blocked", label: "Blocked" },
  { value: "error", label: "Error" },
];

const SUITE_OPTIONS = [
  { value: "", label: "All suites" },
  { value: "luggage-carousel", label: "Luggage carousel" },
];

const TEST_CASE_OPTIONS = [
  { value: "", label: "All cases" },
  { value: "QA-01", label: "QA-01" },
  { value: "QA-02", label: "QA-02" },
  { value: "QA-03", label: "QA-03" },
  { value: "QA-04", label: "QA-04" },
  { value: "QA-05", label: "QA-05" },
  { value: "QA-06", label: "QA-06" },
];

const selectClass =
  "w-full rounded-lg border border-glass-border bg-white/[0.04] px-3 py-2 text-sm text-text-primary outline-none transition-colors duration-150 focus:border-white/20";

const inputClass =
  "w-full rounded-lg border border-glass-border bg-white/[0.04] px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors duration-150 focus:border-white/20";

export function RunsFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      startTransition(() => {
        const query = params.toString();
        router.push(query ? `/?${query}` : "/");
      });
    },
    [router, searchParams],
  );

  return (
    <GlassPanel
      padding="sm"
      className={`sticky top-[65px] z-40 mb-6 ${pending ? "opacity-70" : ""}`}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-xs text-text-muted">Status</span>
          <select
            className={selectClass}
            value={searchParams.get("status") ?? ""}
            onChange={(e) => updateParam("status", e.target.value)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-text-muted">Repo</span>
          <input
            type="text"
            className={inputClass}
            placeholder="luggage-carousel"
            defaultValue={searchParams.get("repo") ?? ""}
            onBlur={(e) => {
              const next = e.target.value.trim();
              const current = searchParams.get("repo") ?? "";
              if (next !== current) updateParam("repo", next);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-text-muted">Suite</span>
          <select
            className={selectClass}
            value={searchParams.get("suite") ?? ""}
            onChange={(e) => updateParam("suite", e.target.value)}
          >
            {SUITE_OPTIONS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-text-muted">Test case</span>
          <select
            className={selectClass}
            value={searchParams.get("testCase") ?? ""}
            onChange={(e) => updateParam("testCase", e.target.value)}
          >
            {TEST_CASE_OPTIONS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </GlassPanel>
  );
}
