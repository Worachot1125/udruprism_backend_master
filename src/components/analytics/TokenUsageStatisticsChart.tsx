/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/ecommerce/TokenUsageStatisticsChart.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

type Mode = "monthly" | "quarterly" | "annually";

type ApiResp = {
  ok: boolean;
  labels: string[];
  usage: number[]; // sum(input+output+cached)
  limit: number[]; // sum(token_limit)
  years?: number[];
  error?: string;
};

const nf = (n: number) => new Intl.NumberFormat().format(n);

function niceCeil(maxVal: number, step: number) {
  if (maxVal <= 0) return step;
  return Math.ceil(maxVal / step) * step;
}
function computeYAxisMax(limit: number[], usage: number[]) {
  const maxLimit = Math.max(0, ...limit);
  const maxUsage = Math.max(0, ...usage);
  const leftStep = maxLimit > 1_000_000 ? 100_000 : maxLimit > 500_000 ? 50_000 : 25_000;
  const rightStep = maxUsage > 50_000 ? 10_000 : maxUsage > 10_000 ? 5_000 : 2_000;
  return {
    yLeftMax: niceCeil(maxLimit * 1.02, leftStep),
    yRightMax: niceCeil(maxUsage * 1.2, rightStep),
  };
}

const MODE_LABEL: Record<Mode, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  annually: "Annually",
};

export default function TokenUsageStatisticsChart() {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [mode, setMode] = useState<Mode>("monthly");
  const [data, setData] = useState<ApiResp | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const url = `/api/analytics/token-usage-vs-limit?year=${year}&mode=${mode}`;
        const res = await fetch(url, { cache: "no-store" });
        const j: ApiResp = await res.json();
        if (!res.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${res.status}`);
        if (alive) setData(j);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Load failed");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [year, mode]);

  const selectableYears = useMemo(() => {
    if (data?.years?.length) return data.years!;
    const now = new Date().getFullYear();
    return [now - 1, now, now + 1];
  }, [data?.years]);

  const labels = data?.labels ?? [];
  const usage = data?.usage ?? [];
  const limit = data?.limit ?? [];
  const { yLeftMax, yRightMax } = useMemo(
    () => computeYAxisMax(limit, usage),
    [limit, usage]
  );

  const options: ApexOptions = useMemo(
    () => ({
      chart: {
        type: "line",
        height: 420,
        fontFamily: "Outfit, sans-serif",
        animations: { enabled: false },
        redrawOnParentResize: false,
        redrawOnWindowResize: false,
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      // ทำเส้น "ตรงและชัด" + สีตรงกับเลเจนด์
      stroke: {
        curve: "straight",
        width: [6, 4], // usage, limit
        colors: ["#3B5BFF", "#9CB9FF"],
        opacity: 100,
      },
      colors: ["#3B5BFF", "#9CB9FF"], // series order: usage, limit
      markers: {
        size: 4,
        strokeWidth: 2,
        strokeColors: "#ffffffff",
        hover: { sizeOffset: 2 },
      },
      legend: {
        show: true,
        position: "top",
        horizontalAlign: "left",
        fontSize: "13px",
      },
      grid: {
        yaxis: { lines: { show: true } },
        xaxis: { lines: { show: false } },
      },
      xaxis: {
        categories: labels,
        axisBorder: { show: false },
        axisTicks: { show: false },
        tooltip: { enabled: false },
      },
      // ซ้าย = Limit (แสดง), ขวา = Usage (ซ่อนไว้)
      yaxis: [
        {
          seriesName: "Token limit",
          title: { text: "Limit" },
          min: 0,
          max: yLeftMax || 1,
          tickAmount: 8,
          labels: { formatter: (v) => nf(Math.max(0, Math.round(v))) },
        },
        {
          seriesName: "Token usage",
          show: false,
          opposite: true,
          min: 0,
          max: yRightMax || 1,
          tickAmount: 8,
          labels: { show: false },
        },
      ],
      tooltip: {
        shared: true,
        intersect: false,
        y: {
          formatter: (val, ctx) => {
            const isUsage = ctx?.seriesIndex === 0;
            return `${isUsage ? "Token usage" : "Token limit"}: ${nf(
              Math.max(0, Math.round(val))
            )} ${isUsage ? "Token" : "Token (limit)"}`;
          },
        },
      },
    }),
    [labels, yLeftMax, yRightMax]
  );

  // ใช้ chart.type="line" แล้ว ไม่ต้อง set type ใน series
  const series = useMemo(
    () => [
      { name: "Token usage", data: usage, yAxisIndex: 1 as const },
      { name: "Token limit", data: limit, yAxisIndex: 0 as const },
    ],
    [usage, limit]
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Token Usage vs Limit ({year})
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Comparison between Token Limit and Token Usage of the system
          </p>
          {err && <p className="mt-2 text-sm text-error-500">Failed to load: {err}</p>}
        </div>

        <div className="flex items-center gap-3">
          <select
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
          >
            {selectableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <div className="flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-800">
            {(["monthly", "quarterly", "annually"] as Mode[]).map((m) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`px-3 py-1.5 text-sm rounded-md ${
                    active
                      ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                  }`}
                >
                  {MODE_LABEL[m]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[1000px] xl:min-w-full">
          <ReactApexChart options={options} series={series as any} type="line" height={420} />
        </div>
      </div>

      {!loading && (
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="inline-block mr-4">
            Max limit: <b>{nf(Math.max(0, ...limit))}</b>
          </span>
          <span className="inline-block">
            Max usage: <b>{nf(Math.max(0, ...usage))}</b>
          </span>
        </div>
      )}
    </div>
  );
}
