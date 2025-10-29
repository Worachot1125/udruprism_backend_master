/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
// import { MoreDotIcon } from "@/icons";
import { useAnalyticsFilter } from "@/context/AnalyticsFilterContext";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

type TargetResp = {
  usageTotal: number;
  limit: number;
  percent: number;
  topPolicies: { name: string; total: number }[];
  period: { from: string | Date; to: string | Date };
  error?: string;
  message?: string;
};

const nf = (n: number) => n.toLocaleString();
const fmtDateTH = (d: Date) =>
  d.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });

function displayTo(to: Date) {
  return new Date(to.getTime() - 1);
}

function labelsFor(preset: string, from: Date, to: Date) {
  const span = `${fmtDateTH(from)} – ${fmtDateTH(displayTo(to))}`;
  const short: Record<string, string> = {
    last_day: "วันล่าสุด",
    last_7: "7 วันที่ผ่านมา",
    last_month: "เดือนที่ผ่านมา",
    last_quarter: "ไตรมาสที่ผ่านมา",
    last_year: "ปีก่อนหน้า",
    current_year: "ปีนี้",                 // 👈 ใหม่
    custom: `ช่วงที่กำหนด`,
  };
  const long: Record<string, string> = {
    last_day: `วันล่าสุด (${span})`,
    last_7: `ช่วง 7 วันที่ผ่านมา (${span})`,
    last_month: `ช่วงเดือนที่ผ่านมา (${span})`,
    last_quarter: `ช่วงไตรมาสที่ผ่านมา (${span})`,
    last_year: `ช่วงปีก่อนหน้า (${span})`,
    current_year: `ช่วงปีนี้ (${span})`,   // 👈 ใหม่
    custom: `ช่วงที่กำหนด (${span})`,
  };
  return { short: short[preset] ?? "ช่วงที่กำหนด", long: long[preset] ?? `ช่วงที่กำหนด (${span})` };
}

export default function MonthlyTarget() {
  const { preset, range } = useAnalyticsFilter();
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<TargetResp | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(
          `/api/token-usage/target?from=${encodeURIComponent(range.from.toISOString())}&to=${encodeURIComponent(
            range.to.toISOString()
          )}&group=policy`,
          { cache: "no-store" }
        );
        const j: TargetResp = await res.json();
        if (!res.ok) throw new Error(j?.message || `HTTP ${res.status}`);
        if (alive) {
          setData(j);
          setErr(null);
        }
      } catch (e: any) {
        if (alive) {
          setErr(e?.message || "Load failed");
          setData(null);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [range]);

  const percent = Math.min(100, Math.max(0, Number(data?.percent ?? 0)));
  const series = useMemo(() => [Number(percent.toFixed(2))], [percent]);

  const options: ApexOptions = useMemo(
    () => ({
      colors: ["#465FFF"],
      chart: { fontFamily: "Outfit, sans-serif", type: "radialBar", height: 330, sparkline: { enabled: true } },
      plotOptions: {
        radialBar: {
          startAngle: -85,
          endAngle: 85,
          hollow: { size: "80%" },
          track: { background: "#E4E7EC", strokeWidth: "100%", margin: 5 },
          dataLabels: {
            name: { show: false },
            value: {
              fontSize: "36px",
              fontWeight: "600",
              offsetY: -40,
              color: "#1D2939",
              formatter: (val) => `${Number(val).toFixed(2)}%`,
            },
          },
        },
      },
      fill: { type: "solid", colors: ["#465FFF"] },
      stroke: { lineCap: "round" },
      labels: ["Progress"],
    }),
    []
  );

  const label = labelsFor(preset, range.from, range.to);
  const top = data?.topPolicies ?? [];

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="px-5 pt-5 bg-white shadow-default rounded-2xl pb-11 dark:bg-gray-900 sm:px-6 sm:pt-6">
        <div className="flex justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Usage Target — {label.short}</h3>
            <p className="mt-1 font-normal text-gray-500 text-theme-sm dark:text-gray-400">
              เป้าหมายการใช้งานสำหรับ {label.long}
            </p>
          </div>
          <div className="relative inline-block">
            <button onClick={() => setIsOpen((s) => !s)} className="dropdown-toggle">
              {/* <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" /> */}
            </button>
            <Dropdown isOpen={isOpen} onClose={() => setIsOpen(false)} className="w-40 p-2">
              <DropdownItem onItemClick={() => setIsOpen(false)} className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300">
                View More
              </DropdownItem>
              <DropdownItem onItemClick={() => setIsOpen(false)} className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300">
                Delete
              </DropdownItem>
            </Dropdown>
          </div>
        </div>

        <div className="relative">
          <div className="max-h-[330px]">
            <ReactApexChart options={options} series={series} type="radialBar" height={330} />
          </div>
        </div>

        <p className="mt-3 text-center text-theme-sm text-gray-500 dark:text-gray-400">
          ระบบมีการใช้ Token ทั้งหมดไปแล้ว{" "}
          <span className="font-semibold text-gray-800 dark:text-white/90">{nf(data?.usageTotal ?? 0)}</span>{" "}
          ในช่วง <span className="font-semibold text-gray-800 dark:text-white/90">{label.long.replace(/^ช่วง|^วันล่าสุด /, '')}</span>{" "}
          คิดเป็น <span className="font-semibold text-gray-800 dark:text-white/90">{percent.toFixed(2)}%</span>{" "}
          ของ Token Limit ทั้งระบบ (Limit ={" "}
          <span className="font-semibold text-gray-800 dark:text-white/90">{nf(data?.limit ?? 0)}</span>).
        </p>

        {err && <p className="mt-2 text-center text-sm text-error-500">Error: {err}</p>}
      </div>

      {/* TOP 1–3 */}
      <div className="grid grid-cols-3 gap-2 px-4 py-3 sm:gap-4 sm:px-6 sm:py-5 bg-gray-50 dark:bg-white/[0.03] rounded-b-2xl border-t border-gray-200 dark:border-gray-800">
        {([0, 1, 2] as const).map((i) => {
          const item = top[i];
          const rankLabel = i === 0 ? "TOP 1" : i === 1 ? "TOP 2" : "TOP 3";
          return (
            <div key={i} className="min-w-0">
              <p className="mb-1 text-center text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {rankLabel}
              </p>
              {item ? (
                <>
                  <p className="mx-auto max-w-[95%] text-center text-[13px] font-semibold text-gray-800 dark:text-white/90 leading-snug line-clamp-2">
                    {item.name || "—"}
                  </p>
                  <p className="mt-1 text-center text-sm font-semibold text-gray-900 dark:text-white/90">
                    {nf(item.total)} <span className="font-normal text-gray-500 dark:text-gray-400">Token</span>
                  </p>
                </>
              ) : (
                <>
                  <p className="mx-auto max-w-[95%] text-center text-[13px] font-semibold text-gray-400 dark:text-gray-500">—</p>
                  <p className="mt-1 text-center text-sm font-semibold text-gray-400 dark:text-gray-500">0 <span className="font-normal">Token</span></p>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
