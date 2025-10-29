/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useEffect, useMemo, useState } from "react";
import Badge from "../ui/badge/Badge";
import { ArrowDownIcon, ArrowUpIcon } from "@/icons";
import { useAnalyticsFilter } from "@/context/AnalyticsFilterContext";

/* ---------- Icons ---------- */
const iconBase = "text-gray-800 size-6 dark:text-white/90";

function CoinArrowInIcon({ className }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className ?? iconBase}>
      <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.1" />
      <path d="M12 6v8m0 0l-3-3m3 3l3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="12" cy="18" rx="5.5" ry="1.8" fill="currentColor" opacity="0.15" />
    </svg>
  );
}
function CoinArrowOutIcon({ className }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className ?? iconBase}>
      <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.1" />
      <path d="M12 18V10m0 0l-3 3m3-3l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="12" cy="6" rx="5.5" ry="1.8" fill="currentColor" opacity="0.15" />
    </svg>
  );
}
function NeuroChipIcon({ className }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className ?? iconBase}>
      <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" opacity="0.1" />
      <path d="M9 9h6v6H9z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function CoinStackIcon({ className }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className ?? iconBase}>
      <ellipse cx="12" cy="6.5" rx="7" ry="3" fill="currentColor" opacity="0.12" />
      <path d="M19 6.5c0 1.66-3.13 3-7 3s-7-1.34-7-3m14 4.5c0 1.66-3.13 3-7 3s-7-1.34-7-3m14 4.5c0 1.66-3.13 3-7 3s-7-1.34-7-3" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Types ---------- */
type Summary = {
  scope: string;
  current: {
    inputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    cachedInputTokens: number;
  };
  trend: {
    inputTokens: number | null;
    outputTokens: number | null;
    reasoningTokens: number | null;
    cachedInputTokens: number | null;
  };
  diagnostics?: any;
};

type Props = {
  /** override API path if needed */
  apiPath?: string; // default: /api/token-usage/summary
  /** show compact numbers (e.g., 12.3K) */
  compact?: boolean;
};

/* ---------- Formatters ---------- */
const nfFull = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const nfCompactFmt = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });
const pctFmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

const clampPct = (v: number) => Math.max(-9999, Math.min(9999, v));

/* ---------- Trend Badge ---------- */
function TrendBadge({ value }: { value: number | null }) {
  if (value === null || Number.isNaN(value)) return null;
  const v = clampPct(value);
  const positive = v >= 0;
  return (
    <Badge color={positive ? "success" : "error"} size="sm" aria-live="polite">
      {positive ? <ArrowUpIcon aria-label="Increase" /> : <ArrowDownIcon aria-label="Decrease" className="text-error-500" />}
      {pctFmt.format(Math.abs(v))}%
    </Badge>
  );
}

/* ---------- Skeleton ---------- */
const CardSkeleton = () => (
  <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
    <div className="flex justify-between">
      <div className="h-12 w-12 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
      <div className="h-6 w-16 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
    </div>
    <div className="mt-5">
      <div className="h-4 w-24 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
      <div className="mt-3 h-7 w-28 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
    </div>
  </div>
);

/* ---------- Main ---------- */
export const EcommerceMetrics: React.FC<Props> = ({ apiPath = "/api/token-usage/summary", compact = false }) => {
  const { range } = useAnalyticsFilter();
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    // guard: no range yet
    if (!range?.from || !range?.to) return;

    const ctrl = new AbortController();
    let alive = true;

    (async () => {
      setLoading(true);
      setErrMsg(null);
      try {
        const qs = `from=${encodeURIComponent(range.from.toISOString())}&to=${encodeURIComponent(range.to.toISOString())}`;
        const res = await fetch(`${apiPath}?${qs}`, { cache: "no-store", signal: ctrl.signal });
        const text = await res.text();
        let j: any = {};
        try {
          j = text ? JSON.parse(text) : {};
        } catch {
          throw new Error("Invalid JSON");
        }
        if (!res.ok) throw new Error(j?.message || j?.error || `HTTP ${res.status}`);
        if (alive) setData(j as Summary);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        if (alive) setErrMsg(e?.message || "Load failed");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [range?.from, range?.to, apiPath]);

  const cards = useMemo(
    () => [
      { label: "Input tokens", value: data?.current.inputTokens ?? 0, trend: data?.trend.inputTokens ?? null, Icon: CoinArrowInIcon },
      { label: "Output tokens", value: data?.current.outputTokens ?? 0, trend: data?.trend.outputTokens ?? null, Icon: CoinArrowOutIcon },
      { label: "Reasoning tokens", value: data?.current.reasoningTokens ?? 0, trend: data?.trend.reasoningTokens ?? null, Icon: NeuroChipIcon },
      { label: "Cached input tokens", value: data?.current.cachedInputTokens ?? 0, trend: data?.trend.cachedInputTokens ?? null, Icon: CoinStackIcon },
    ],
    [data]
  );

  const formatNum = (n: number) => (compact ? nfCompactFmt.format(n) : nfFull.format(n));

  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">
        {loading ? "Loading token summary…" : "Token summary loaded"}
      </p>

      {errMsg && (
        <p className="mb-3 text-sm text-error-500" role="alert">
          Failed to load token summary: {errMsg}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-3">
        {loading && !data
          ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={`sk-${i}`} />)
          : cards.map(({ label, value, trend, Icon }) => (
              <div key={label} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                <div className="flex justify-between">
                  <div className="flex items-center justify-center w-12 h-12 mr-2 rounded-xl bg-gray-100 px-3 dark:bg-gray-800">
                    <Icon className={iconBase} />
                  </div>
                  {!loading && <TrendBadge value={trend} />}
                </div>

                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                    <h4 className="mt-2 text-xl font-bold text-gray-800 dark:text-white/90">
                      {loading ? "—" : formatNum(value)}
                    </h4>
                  </div>
                </div>
              </div>
            ))}
      </div>
    </>
  );
};
