/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/analytics/UsersByGroupCard.tsx
"use client";

import { useEffect, useState } from "react";
import { useAnalyticsFilter } from "@/context/AnalyticsFilterContext";

type Row = { id: string | null; name: string; userCount: number; percent: number };

export default function UsersByGroupCard() {
  // NOTE: hook นี้จะ throw ถ้าไม่มี Provider ครอบไว้ แม้เราจะไม่ได้ใช้ค่าจากมันโดยตรง
  // ใช้เพื่อยืนยันว่าอยู่ใน <AnalyticsFilterProvider>
  useAnalyticsFilter();

  const [rows, setRows] = useState<Row[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const url = `/api/analytics/users-by?group=policy`;
        const res = await fetch(url, { cache: "no-store" });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.message || j?.error || `HTTP ${res.status}`);
        if (alive) {
          setRows(j.rows || []);
          setTotalUsers(j.totalUsers || 0);
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
  }, []); // snapshot ไม่ผูกช่วงเวลา

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Users by Policy</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Users ทั้งระบบ:{" "}
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {new Intl.NumberFormat().format(totalUsers)}
          </span>
        </p>
      </div>

      {err && <p className="mb-2 text-sm text-error-500">Error: {err}</p>}

      <div className="custom-scrollbar max-h-[340px] space-y-3 overflow-auto pr-1">
        {(rows ?? []).map((r, i) => (
          <div key={`${r.id}-${i}`} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300">{r.name || "—"}</span>
              <span className="text-gray-500 dark:text-gray-400">{r.percent.toFixed(0)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-2 rounded-full bg-brand-500 dark:bg-brand-400"
                style={{ width: `${Math.min(100, Math.max(0, r.percent))}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{r.userCount} users</div>
          </div>
        ))}
        {!loading && rows.length === 0 && <p className="text-sm text-gray-500">No data.</p>}
      </div>
    </div>
  );
}
