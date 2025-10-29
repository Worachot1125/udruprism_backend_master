/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

export type Preset =
  | "last_day"
  | "last_7"
  | "last_month"
  | "last_quarter"
  | "last_year"
  | "custom";

export type Range = { from: Date; to: Date }; // [from, to) ขอบบนไม่รวม

type Ctx = {
  value: { preset: Preset; range: Range };
  /** เปลี่ยน preset แล้วคำนวณช่วงให้เอง (ถ้า custom จะใช้ customRange ล่าสุด) */
  setPreset: (p: Preset) => void;
  /** ตั้งค่าช่วง custom และสลับ preset เป็น custom */
  setCustomRange: (r: Range) => void;
  /** รีเซ็ตกลับ Last month */
  reset: () => void;
};

const DateRangeCtx = createContext<Ctx | null>(null);
export function useDateRange() {
  const c = useContext(DateRangeCtx);
  if (!c) throw new Error("useDateRange outside provider");
  return c;
}

/** สร้างช่วง [from, to) สำหรับ preset ต่างๆ */
function getPresetRange(p: Preset, now = new Date()): Range {
  const end = new Date(now); // ขอบบนไม่รวม
  const start = new Date(now);

  switch (p) {
    case "last_day": {
      start.setDate(start.getDate() - 1);
      break;
    }
    case "last_7": {
      start.setDate(start.getDate() - 7);
      break;
    }
    case "last_month": {
      start.setMonth(start.getMonth() - 1);
      break;
    }
    case "last_quarter": {
      start.setMonth(start.getMonth() - 3);
      break;
    }
    case "last_year": {
      start.setFullYear(start.getFullYear() - 1);
      break;
    }
    case "custom": {
      // ถูกแทนที่ด้วย customRange ภายนอก
      break;
    }
  }
  return { from: start, to: end };
}

export function DateRangeProvider({ children }: { children: React.ReactNode }) {
  const [preset, setPresetState] = useState<Preset>("last_month");
  const [range, setRange] = useState<Range>(getPresetRange("last_month"));
  const [customRange, setCustomRangeState] = useState<Range>(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return { from: weekAgo, to: now };
  });

  const api: Ctx = useMemo(
    () => ({
      value: { preset, range },
      setPreset: (p: Preset) => {
        setPresetState(p);
        if (p === "custom") {
          setRange({ ...customRange });
        } else {
          setRange(getPresetRange(p));
        }
      },
      setCustomRange: (r: Range) => {
        setCustomRangeState(r);
        setPresetState("custom");
        setRange({ ...r });
      },
      reset: () => {
        const r = getPresetRange("last_month");
        setPresetState("last_month");
        setRange(r);
      },
    }),
    [preset, range, customRange]
  );

  return <DateRangeCtx.Provider value={api}>{children}</DateRangeCtx.Provider>;
}
