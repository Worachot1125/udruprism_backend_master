// src/context/AnalyticsFilterContext.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

export type IntervalPreset =
  | "last_day"
  | "last_7"
  | "last_month"
  | "last_quarter"
  | "last_year"
  | "current_year"
  | "custom";

export type Range = { from: Date; to: Date };

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function computeRange(preset: IntervalPreset): Range {
  const now = new Date();

  switch (preset) {
    case "last_day": {
      const to = startOfDay(now);
      const from = addDays(to, -1);
      return { from, to };
    }
    case "last_7": {
      const to = startOfDay(now);
      const from = addDays(to, -7);
      return { from, to };
    }
    case "last_month": {
      const to = new Date(now.getFullYear(), now.getMonth(), 1);
      const from = new Date(to.getFullYear(), to.getMonth() - 1, 1);
      return { from, to };
    }
    case "last_quarter": {
      const m = now.getMonth();
      const qStartMonth = Math.floor(m / 3) * 3; // current quarter start
      const to = new Date(now.getFullYear(), qStartMonth, 1);
      const from = new Date(to.getFullYear(), to.getMonth() - 3, 1);
      return { from, to };
    }
    case "last_year": {
      const to = new Date(now.getFullYear(), 0, 1);
      const from = new Date(now.getFullYear() - 1, 0, 1);
      return { from, to };
    }
    case "current_year": {
      const from = new Date(now.getFullYear(), 0, 1);
      const to = new Date(now.getFullYear() + 1, 0, 1);
      return { from, to };
    }
    case "custom":
    default: {
      const to = new Date(now.getFullYear(), now.getMonth(), 1);
      const from = new Date(to.getFullYear(), to.getMonth() - 1, 1);
      return { from, to };
    }
  }
}

// ➜ ลบฟิลด์ `value` ออก เพราะไม่ได้ใช้งาน
type Ctx = {
  preset: IntervalPreset;
  setPreset: (p: IntervalPreset) => void;
  range: Range;
  setRange: React.Dispatch<React.SetStateAction<Range>>;
};

const C = createContext<Ctx | null>(null);

export function AnalyticsFilterProvider({ children }: { children: React.ReactNode }) {
  const [preset, setPreset] = useState<IntervalPreset>("last_month");
  const [range, setRange] = useState<Range>(() => computeRange("last_month"));

  const contextValue = useMemo<Ctx>(
    () => ({
      preset,
      setPreset: (p: IntervalPreset) => {
        setPreset(p);
        if (p !== "custom") setRange(computeRange(p));
      },
      range,
      setRange,
    }),
    [preset, range]
  );

  return <C.Provider value={contextValue}>{children}</C.Provider>;
}

export function useAnalyticsFilter() {
  const v = useContext(C);
  if (!v) throw new Error("useAnalyticsFilter must be used within AnalyticsFilterProvider");
  return v;
}
