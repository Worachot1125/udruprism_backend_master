/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useAnalyticsFilter } from "@/context/AnalyticsFilterContext";
import { useState } from "react";

export default function FiltersPanel() {
  const { preset, setPreset, range, setRange } = useAnalyticsFilter();
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);

  const isCustom = preset === "custom";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="grid grid-cols-12 gap-3 items-end">
        <div className="col-span-12 sm:col-span-3">
          <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">Interval</label>
          <select
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            value={preset}
            onChange={(e) => setPreset(e.target.value as any)}
          >
            <option value="last_day">Last day</option>
            <option value="last_7">Last 7 days</option>
            <option value="last_month">Last month</option>
            <option value="last_quarter">Last quarter</option>
            <option value="last_year">Last year</option>
            <option value="current_year">Current year</option> {/* 👈 ใหม่ */}
            <option value="custom">Custom range</option>
          </select>
        </div>

        {isCustom && (
          <>
            <div className="col-span-12 sm:col-span-3">
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">From</label>
              <input
                type="datetime-local"
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                value={toLocalInput(from)}
                onChange={(e) => setFrom(new Date(e.target.value))}
              />
            </div>

            <div className="col-span-12 sm:col-span-3">
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">To</label>
              <input
                type="datetime-local"
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                value={toLocalInput(to)}
                onChange={(e) => setTo(new Date(e.target.value))}
              />
            </div>
          </>
        )}

        <div className="col-span-12 sm:col-span-3 flex gap-3">
          <button
            className="rounded-lg bg-brand-500 px-4 py-2 text-white hover:bg-brand-600"
            onClick={() => {
              if (isCustom) setRange({ from, to });
            }}
          >
            Apply
          </button>
          <button
            className="rounded-lg border border-gray-200 px-4 py-2 text-gray-700 dark:border-gray-700 dark:text-gray-200"
            onClick={() => {
              // reset -> last_month
              setPreset("last_month");
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}
