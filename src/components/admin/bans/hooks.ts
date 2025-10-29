"use client";
import * as React from "react";
import { addMinutes, addDays } from "date-fns";
import type { SelectionState } from "@/components/admin/common/selection";
import { toggleOne } from "@/components/admin/common/selection"; 

export type DurationKey = "30m" | "1h" | "2h" | "1d" | "7d" | "∞" | "custom";

export const computeEndAt = (d: DurationKey, customLocal?: string): string | undefined => {
  const now = new Date();
  switch (d) {
    case "30m":
      return addMinutes(now, 30).toISOString();
    case "1h":
      return addMinutes(now, 60).toISOString();
    case "2h":
      return addMinutes(now, 120).toISOString();
    case "1d":
      return addDays(now, 1).toISOString();
    case "7d":
      return addDays(now, 7).toISOString();
    case "custom":
      return customLocal ? new Date(customLocal).toISOString() : undefined;
    default:
      return undefined; 
  }
};

const dtFmt = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});
export const formatDateTime = (iso?: string | null) => (iso ? dtFmt.format(new Date(iso)) : "∞");

export const rangeText = (page: number, pageSize: number, total: number) => {
  if (!total) return "Showing 0–0 of 0";
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return `Showing ${start}–${end} of ${total}`;
};

export const useHeaderCheckboxState = (sel: SelectionState, ids: string[]) => {
  const selectedCount = React.useMemo(() => {
    if (sel.mode === "none") return 0;
    if (sel.mode === "some") {
      let c = 0;
      for (const id of ids) if (sel.picked.has(id)) c++;
      return c;
    }
    return ids.length - Array.from(sel.excluded).filter((id) => ids.includes(id)).length;
  }, [sel, ids]);

  const checked = selectedCount > 0 && selectedCount === ids.length;
  const indeterminate = selectedCount > 0 && selectedCount < ids.length;
  return { selectedCount, checked, indeterminate };
};

export const useIndeterminate = (ref: React.RefObject<HTMLInputElement>, indeterminate: boolean) => {
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate, ref]); 
};

export const handleCheck =
  (id: string, setSel: React.Dispatch<React.SetStateAction<SelectionState>>) =>
  (e: React.ChangeEvent<HTMLInputElement>) => {
    setSel((s: SelectionState) => toggleOne(id, e.target.checked, s));
  };
