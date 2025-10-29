/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/analytics/UsageVsPolicyLimitCard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useAnalyticsFilter } from "@/context/AnalyticsFilterContext";

/** สร้างช่วงเวลา fallback = last month (ขอบล่างรวม, ขอบบนไม่รวม) */
function fallbackRange(): { from: Date; to: Date } {
  const now = new Date();
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { from: firstOfLastMonth, to: firstOfThisMonth };
}

type Row = {
  id: string | null;
  name: string;
  total: number; // usage ของ policy
  limit: number; // limit รวมทั้งระบบ (ค่าเดียวทุกแถว)
  percent: number; // total/limit * 100
};
type Meta = { policyCount: number; usageTotal: number; limitTotal: number };

export default function UsageVsPolicyLimitCard() {
  // NOTE: hook นี้จะ throw ถ้าไม่มี Provider ครอบไว้
  const { range } = useAnalyticsFilter();

  // กำหนด "ช่วงเวลาที่ใช้จริง" — ถ้า range ไม่ครบให้ fallback (ปกติจะครบเสมอ)
  const effRange = useMemo(() => {
    if (range?.from && range?.to) return { from: range.from, to: range.to };
    return fallbackRange();
  }, [range?.from, range?.to]);

  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState<Meta>({ policyCount: 0, usageTotal: 0, limitTotal: 0 });
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const url = `/api/analytics/usage-vs-policy-limit?from=${effRange.from.toISOString()}&to=${effRange.to.toISOString()}`;
        const res = await fetch(encodeURI(url), { cache: "no-store" });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.message || j?.error || `HTTP ${res.status}`);
        if (alive) {
          setRows(j.rows || []);
          setMeta(j.meta || { policyCount: 0, usageTotal: 0, limitTotal: 0 });
          setErr(null);
        }
      } catch (e: any) {
        if (alive) setErr(e?.message || "Load failed");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [effRange.from, effRange.to]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-5 sm:p-6">
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
          Token usage vs Policy limit
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Policies: <span className="font-medium">{meta.policyCount}</span> • Usage:{" "}
          <span className="font-medium">{new Intl.NumberFormat().format(meta.usageTotal)}</span> • Limit:{" "}
          <span className="font-medium">{new Intl.NumberFormat().format(meta.limitTotal)}</span>
        </p>
      </div>

      {err && <p className="mb-2 text-sm text-error-500">Error: {err}</p>}

      <div className="max-h-[340px] space-y-4 overflow-auto pr-1 custom-scrollbar">
        {(rows ?? []).map((r, i) => (
          <div key={`${r.id}-${i}`}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300">{r.name || "—"}</span>
              <span className="text-gray-500 dark:text-gray-400">{r.percent.toFixed(0)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-2 rounded-full bg-brand-500 dark:bg-brand-400"
                style={{ width: `${Math.min(100, Math.max(0, r.percent))}%` }}
              />
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {new Intl.NumberFormat().format(r.total)} / {new Intl.NumberFormat().format(r.limit)} tokens
            </div>
          </div>
        ))}
        {!loading && rows.length === 0 && <p className="text-sm text-gray-500">No data.</p>}
        {loading && <p className="text-sm text-gray-500">กำลังโหลดข้อมูล…</p>}
      </div>
    </div>
  );
}
