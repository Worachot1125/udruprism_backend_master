/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/ecommerce/MonthlySalesChart.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

type MonthlyPoint = { monthIndex?: number; total: number };
type MonthlyResp = { points: MonthlyPoint[]; error?: string; message?: string };
type YearsResp = { years: { year: number; total: number }[]; error?: string; message?: string };
type TargetResp = { limit: number; error?: string; message?: string };

const nf = (n: number) => n.toLocaleString();
const MONTHS = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleString("en-US", { month: "short" })
);

export default function MonthlySalesChart() {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [yearList, setYearList] = useState<number[]>([]);
  const [dataByMonth, setDataByMonth] = useState<number[]>(Array(12).fill(0));
  const [limit, setLimit] = useState<number>(0);
  const [err, setErr] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/token-usage/years", { cache: "no-store" });
        const j: YearsResp = await res.json();
        if (!res.ok) throw new Error(j?.message || `HTTP ${res.status}`);
        const ys = (j.years ?? []).map((x) => x.year);
        if (alive) {
          setYearList(ys);
          if (ys.length) setYear(ys[0]);
        }
      } catch (e: any) {
        if (alive) setErr(e?.message || "Load years failed");
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const from = new Date(year, 0, 1).toISOString();
        const to = new Date(year + 1, 0, 1).toISOString();

        const r1 = await fetch(
          `/api/token-usage/monthly?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
          { cache: "no-store" }
        );
        const m: MonthlyResp = await r1.json();
        if (!r1.ok) throw new Error(m?.message || `HTTP ${r1.status}`);

        const buckets = Array(12).fill(0) as number[];
        (m.points ?? []).forEach((p) => {
          if (typeof p.monthIndex === "number") {
            const idx = Math.max(0, Math.min(11, p.monthIndex));
            buckets[idx] += Number(p.total || 0);
          }
        });

        const r2 = await fetch(
          `/api/token-usage/target?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
          { cache: "no-store" }
        );
        const t: TargetResp = await r2.json();
        if (!r2.ok) throw new Error(t?.message || `HTTP ${r2.status}`);

        if (alive) {
          setDataByMonth(buckets);
          setLimit(Number(t.limit) || 0);
          setErr(null);
        }
      } catch (e: any) {
        if (alive) {
          setErr(e?.message || "Load monthly failed");
          setDataByMonth(Array(12).fill(0));
          setLimit(0);
        }
      }
    })();
    return () => { alive = false; };
  }, [year]);

  const series = useMemo(
    () => [{ name: "Token usage", data: dataByMonth }],
    [dataByMonth]
  );

  const yMax = useMemo(() => {
    const maxData = Math.max(0, ...dataByMonth);
    const scaleByData = maxData > 0 ? Math.ceil(maxData * 1.25) : 10;
    return Math.max(scaleByData, 10);
  }, [dataByMonth]);

  const options: ApexOptions = useMemo(() => {
    // สร้างชุด annotation เสมอ (แม้จะว่าง) เพื่อกัน error .images
    const yaxisAnn =
      limit > 0 && limit <= yMax
        ? [
            {
              y: limit,
              borderColor: "#94a3b8",
              label: {
                borderColor: "#94a3b8",
                style: { color: "#0f172a", background: "#e2e8f0", fontSize: "11px" },
                text: `Token limit: ${nf(limit)}`,
              },
            },
          ]
        : [];

    return {
      colors: ["#465fff"],
      chart: { fontFamily: "Outfit, sans-serif", type: "bar", height: 180, toolbar: { show: false } },
      plotOptions: {
        bar: { horizontal: false, columnWidth: "39%", borderRadius: 5, borderRadiusApplication: "end" },
      },
      dataLabels: { enabled: false },
      stroke: { show: true, width: 4, colors: ["transparent"] },
      xaxis: {
        categories: MONTHS,
        tickPlacement: "on",
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      legend: { show: true, position: "top", horizontalAlign: "left", fontFamily: "Outfit" },
      yaxis: {
        min: 0,
        max: yMax,
        labels: { formatter: (v) => nf(v) },
        title: { text: undefined },
      },
      grid: { yaxis: { lines: { show: true } } },
      fill: { opacity: 1 },
      tooltip: {
        x: { show: true },
        y: { formatter: (val: number) => `${nf(val)} Token` },
      },
      // <-- ตรงนี้สำคัญ: ส่ง annotations เป็น object เสมอ
      annotations: {
        yaxis: yaxisAnn,
        xaxis: [],
        points: [],
        texts: [],
        images: [],
      },
    } as ApexOptions;
  }, [yMax, limit]);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Token Usage by Month ({year})
          </h3>

          <select
            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {(yearList.length ? yearList : [year]).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {limit > 0 && limit > yMax && (
            <span className="ml-2 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-white/10 dark:text-white/80">
              Limit: {nf(limit)} (off-scale)
            </span>
          )}
        </div>

        {/* <div className="relative inline-block">
          <button onClick={() => setIsOpen((s) => !s)} className="dropdown-toggle">
            <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" />
          </button>
          <Dropdown isOpen={isOpen} onClose={() => setIsOpen(false)} className="w-40 p-2">
            <DropdownItem
              onItemClick={() => setIsOpen(false)}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              View More
            </DropdownItem>
            <DropdownItem
              onItemClick={() => setIsOpen(false)}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              Delete
            </DropdownItem>
          </Dropdown>
        </div> */}
      </div>

      {err && <p className="mt-2 text-sm text-error-500">Failed to load monthly usage: {err}</p>}

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="-ml-5 min-w-[650px] xl:min-w-full pl-2">
          <ReactApexChart options={options} series={series} type="bar" height={180} />
        </div>
      </div>
    </div>
  );
}
