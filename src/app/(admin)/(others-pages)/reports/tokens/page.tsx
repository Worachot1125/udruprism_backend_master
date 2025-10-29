
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/(admin)/(others-pages)/reports/tokens/page.tsx
"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

type By = "policy" | "user" | "department" | "faculty";
type ApiGroup = { id: string; name: string; total: number; monthly: { bucket: string; tokens: number }[] };
type ApiResp = {
    ok: true;
    by: By;
    interval: "day" | "month";
    from: string;
    to: string;
    buckets: string[];
    groups: ApiGroup[];
    grandTotal: number;
};

/* ---------------------- utils ---------------------- */
function toInputValue(d: Date) {
    // YYYY-MM-DDTHH:mm (สำหรับ datetime-local)
    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}
function parseInputValue(v?: string): string | undefined {
    if (!v) return undefined;
    const t = new Date(v);
    if (Number.isNaN(+t)) return undefined;
    return t.toISOString(); // ส่งเป็น ISO ให้ API
}
function toMMMYYYY(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

/* ---------------------- data hook ---------------------- */
function useTokenReport(
    by: By,
    fromISO?: string,
    toISO?: string,
    interval: "day" | "month" = "month",
) {
    const [data, setData] = React.useState<ApiResp | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const params = new URLSearchParams({ by, interval });
                if (fromISO) params.set("from", fromISO);
                if (toISO) params.set("to", toISO);
                const res = await fetch(`/api/reports/tokens?${params.toString()}`, { cache: "no-store" });
                const json = (await res.json()) as ApiResp | { ok: false; error: string };
                if (!res.ok || !(json as any).ok) throw new Error((json as any).error ?? "Fetch failed");
                if (!cancelled) setData(json as ApiResp);
            } catch (e: any) {
                if (!cancelled) setError(e?.message ?? "Unknown error");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [by, fromISO, toISO, interval]);

    return { data, loading, error };
}

/* ---------------------- Chart block ---------------------- */
function TokenChart({ data }: { data: ApiResp }) {
    // แสดง top N เส้น เพื่อความอ่านง่าย
    const TOP_N = 6;
    const top = data.groups.slice(0, TOP_N);
    const categories =
        data.interval === "month"
            ? data.buckets.map(toMMMYYYY)
            : data.buckets.map((b) => new Date(b).toLocaleDateString());

    const series = top.map((g) => ({
        name: g.name,
        data: g.monthly.map((m) => m.tokens),
    }));

    const options: ApexOptions = {
        chart: {
            type: "area",
            height: 340,
            toolbar: { show: false },
            fontFamily: "Outfit, sans-serif",
            animations: { enabled: false }, // ปิด animation ลดกระพริบ
        },
        legend: { show: true, position: "top", horizontalAlign: "left" },
        dataLabels: { enabled: false },
        stroke: { curve: "straight", width: 2 },
        fill: { type: "gradient", gradient: { opacityFrom: 0.55, opacityTo: 0 } },
        markers: { size: 0, hover: { size: 6 } },
        grid: { xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
        xaxis: { type: "category", categories, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { style: { fontSize: "12px", colors: ["#6B7280"] } }, title: { text: "" } },
        tooltip: { shared: true, intersect: false, y: { formatter: (val) => `${val} tokens` } },
    };

    // กำหนดกรอบกว้างคงที่ + ใช้สกอลล์แนวนอนแทนการยืด/หด
    return (
        <div className="overflow-x-auto">
            <div style={{ width: Math.max(980, categories.length * 120) }}>
                <ReactApexChart options={options} series={series} type="area" height={340} />
            </div>
        </div>
    );
}

/* ---------------------- Table block (sortable) ---------------------- */
type SortKey = "name" | "total" | "pct";
type SortDir = "asc" | "desc";

function SortIndicator({ active, dir }: { active: boolean; dir: SortDir }) {
    return (
        <span className="inline-block align-middle ml-1 opacity-70">
            {active ? (dir === "asc" ? "▲" : "▼") : "▵"}
        </span>
    );
}

function TokenTable({
    data,
    sortKey,
    sortDir,
    onChangeSort,
}: {
    data: ApiResp;
    sortKey: SortKey;
    sortDir: SortDir;
    onChangeSort: (k: SortKey) => void;
}) {
    const rows = React.useMemo(() => {
        const list = data.groups.slice();
        list.sort((a, b) => {
            if (sortKey === "name") {
                return sortDir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
            }
            const aVal = sortKey === "total" ? a.total : data.grandTotal ? a.total / data.grandTotal : 0;
            const bVal = sortKey === "total" ? b.total : data.grandTotal ? b.total / data.grandTotal : 0;
            return sortDir === "asc" ? aVal - bVal : bVal - aVal;
        });
        return list;
    }, [data.groups, data.grandTotal, sortKey, sortDir]);

    const thBase = "px-3 py-2 text-left select-none cursor-pointer";
    return (
        <div className="rounded-xl border overflow-x-auto mt-4">
            <table className="min-w-[720px] w-full text-sm">
                <thead className="border-b bg-gray-50">
                    <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        <th className={thBase} onClick={() => onChangeSort("name")}>
                            Name <SortIndicator active={sortKey === "name"} dir={sortDir} />
                        </th>
                        <th className={`${thBase} text-right`} onClick={() => onChangeSort("total")}>
                            Tokens <SortIndicator active={sortKey === "total"} dir={sortDir} />
                        </th>
                        <th className={`${thBase} text-right`} onClick={() => onChangeSort("pct")}>
                            % of total <SortIndicator active={sortKey === "pct"} dir={sortDir} />
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((g, i) => {
                        const pct = data.grandTotal ? (g.total / data.grandTotal) * 100 : 0;
                        return (
                            <tr key={g.id} className="border-b">
                                <td className="px-3 py-2">{i + 1}</td>
                                <td className="px-3 py-2">{g.name}</td>
                                <td className="px-3 py-2 text-right">{g.total.toLocaleString()}</td>
                                <td className="px-3 py-2 text-right">{pct.toFixed(1)}%</td>
                            </tr>
                        );
                    })}
                    {!rows.length && (
                        <tr>
                            <td className="px-3 py-6 text-center text-gray-500" colSpan={4}>
                                No data in selected range.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

/* ---------------------- Page ---------------------- */
export default function TokenReportsPage() {
    // tab
    const [by, setBy] = React.useState<By>("policy");

    // interval granularity
    const [interval, setInterval] = React.useState<"day" | "month">("month");

    // filter: date-time range (มี apply เพื่อกัน fetch ถี่ ๆ ตอนกำลังพิมพ์)
    const defaultFrom = React.useMemo(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 12);
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);
    const defaultTo = React.useMemo(() => new Date(), []);

    const [fromInput, setFromInput] = React.useState<string>(toInputValue(defaultFrom));
    const [toInput, setToInput] = React.useState<string>(toInputValue(defaultTo));
    const [appliedFrom, setAppliedFrom] = React.useState<string | undefined>(parseInputValue(fromInput));
    const [appliedTo, setAppliedTo] = React.useState<string | undefined>(parseInputValue(toInput));

    const applyFilters = () => {
        const fISO = parseInputValue(fromInput);
        const tISO = parseInputValue(toInput);
        // guard: ถ้า from > to ให้สลับให้ถูก
        if (fISO && tISO && new Date(fISO) > new Date(tISO)) {
            setAppliedFrom(tISO);
            setAppliedTo(fISO);
        } else {
            setAppliedFrom(fISO);
            setAppliedTo(tISO);
        }
    };
    const resetFilters = () => {
        setFromInput(toInputValue(defaultFrom));
        setToInput(toInputValue(defaultTo));
        setInterval("month");
        setAppliedFrom(parseInputValue(toInputValue(defaultFrom)));
        setAppliedTo(parseInputValue(toInputValue(defaultTo)));
    };

    // sortable table
    const [sortKey, setSortKey] = React.useState<SortKey>("total");
    const [sortDir, setSortDir] = React.useState<SortDir>("desc");
    const changeSort = (k: SortKey) => {
        if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else {
            setSortKey(k);
            setSortDir(k === "name" ? "asc" : "desc"); // เริ่มต้น: ชื่อ=asc, ตัวเลข=desc
        }
    };

    const { data, loading, error } = useTokenReport(by, appliedFrom, appliedTo, interval);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <h1 className="text-xl font-semibold">Token Usage Reports</h1>

                {/* tabs */}
                <div className="inline-flex rounded-lg border p-1 bg-white">
                    {(["policy", "user", "department", "faculty"] as By[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setBy(tab)}
                            className={`px-3 py-1 text-sm rounded-md ${by === tab ? "bg-indigo-600 text-white" : "hover:bg-gray-100"}`}
                            title={tab === "policy" ? "By Policy" : tab === "user" ? "By User" : tab === "department" ? "By Department" : "By Faculty"}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 items-end">
                <label className="text-sm">
                    From
                    <input
                        type="datetime-local"
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                        value={fromInput}
                        onChange={(e) => setFromInput(e.target.value)}
                    />
                </label>
                <label className="text-sm">
                    To
                    <input
                        type="datetime-local"
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                        value={toInput}
                        onChange={(e) => setToInput(e.target.value)}
                    />
                </label>
                <label className="text-sm">
                    Interval
                    <select
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                        value={interval}
                        onChange={(e) => setInterval(e.target.value as "day" | "month")}
                    >
                        <option value="day">Day</option>
                        <option value="month">Month</option>
                    </select>
                </label>
                <div className="flex gap-2 xl:col-span-2">
                    <button
                        onClick={applyFilters}
                        className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm shadow-sm hover:bg-indigo-700"
                    >
                        Apply
                    </button>
                    <button
                        onClick={resetFilters}
                        className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* States */}
            {loading && <div className="text-sm text-gray-500">Loading…</div>}
            {error && <div className="text-sm text-rose-600">Error: {error}</div>}

            {/* Content */}
            {data && (
                <>
                    <div className="text-xs text-gray-500">
                        Interval: <b>{data.interval}</b> • Range:{" "}
                        <b>
                            {new Date(data.from).toLocaleString()} - {new Date(data.to).toLocaleString()}
                        </b>{" "}
                        • Total tokens: <b>{data.grandTotal.toLocaleString()}</b>
                    </div>

                    <TokenChart data={data} />

                    <TokenTable
                        data={data}
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onChangeSort={changeSort}
                    />
                </>
            )}
        </div>
    );
}
