// src/app/api/analytics/usage-vs-limit/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * คำนิยาม:
 * - token limit (ทั้งระบบ) = SUM("public"."Policy"."token_limit")  (ค่าคงที่ของปีนั้น)
 * - token usage (ต่อเดือน/ไตรมาส/ปี) = SUM(inputTokens + outputTokens + cachedInputTokens)
 *   ที่มาจาก "public"."TokenUsage"
 */

type SumRow = { n: string | number };
type MonthRow = { m: number; n: string | number };
type QuarterRow = { q: number; n: string | number };

function toInt(n: string | number | null | undefined) {
  return typeof n === "number" ? n : Number(n || 0);
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const year = Number(url.searchParams.get("year") || new Date().getFullYear());
    const interval = (url.searchParams.get("interval") || "monthly").toLowerCase() as
      | "monthly"
      | "quarterly"
      | "annually";

    // 1) limit ทั้งระบบ (รวมทุก policy)
    const limitQ = sql<SumRow>`SELECT COALESCE(SUM("token_limit")::bigint,0)::bigint AS n
                               FROM "public"."Policy"`;
    const limitRes: any = await db.execute(limitQ);
    const systemLimit = toInt((limitRes.rows ?? limitRes)[0]?.n);

    // 2) usage ตาม interval
    let labels: string[] = [];
    let usageSeries: number[] = [];
    let limitSeries: number[] = [];

    if (interval === "monthly") {
      const usageQ = sql<MonthRow>`
        SELECT EXTRACT(MONTH FROM "createdAt")::int AS m,
               COALESCE(SUM(("inputTokens" + "outputTokens" + "cachedInputTokens")::bigint),0)::bigint AS n
        FROM "public"."TokenUsage"
        WHERE EXTRACT(YEAR FROM "createdAt")::int = ${year}
        GROUP BY m
      `;
      const uRes: any = await db.execute(usageQ);
      const map = new Map<number, number>();
      for (const row of (uRes.rows ?? uRes) as MonthRow[]) map.set(row.m, toInt(row.n));

      labels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      usageSeries = Array.from({ length: 12 }, (_, i) => map.get(i + 1) ?? 0);
      limitSeries  = Array.from({ length: 12 }, () => systemLimit);
    } else if (interval === "quarterly") {
      const usageQ = sql<QuarterRow>`
        SELECT EXTRACT(QUARTER FROM "createdAt")::int AS q,
               COALESCE(SUM(("inputTokens" + "outputTokens" + "cachedInputTokens")::bigint),0)::bigint AS n
        FROM "public"."TokenUsage"
        WHERE EXTRACT(YEAR FROM "createdAt")::int = ${year}
        GROUP BY q
      `;
      const uRes: any = await db.execute(usageQ);
      const map = new Map<number, number>();
      for (const row of (uRes.rows ?? uRes) as QuarterRow[]) map.set(row.q, toInt(row.n));

      labels = ["Q1","Q2","Q3","Q4"];
      usageSeries = [1,2,3,4].map(q => map.get(q) ?? 0);
      limitSeries  = Array.from({ length: 4 }, () => systemLimit);
    } else {
      // annually → 1 จุด
      const usageQ = sql<SumRow>`
        SELECT COALESCE(SUM(("inputTokens" + "outputTokens" + "cachedInputTokens")::bigint),0)::bigint AS n
        FROM "public"."TokenUsage"
        WHERE EXTRACT(YEAR FROM "createdAt")::int = ${year}
      `;
      const uRes: any = await db.execute(usageQ);
      const totalUsage = toInt((uRes.rows ?? uRes)[0]?.n);

      labels = [String(year)];
      usageSeries = [totalUsage];
      limitSeries  = [systemLimit];
    }

    return NextResponse.json({
      year,
      interval,
      labels,
      series: {
        usage: usageSeries,    // เส้น usage (ต่อเดือน/ไตรมาส/ปี)
        limit: limitSeries,    // เส้น limit คงที่ของระบบ
      },
      maxY: Math.max(systemLimit, ...(usageSeries ?? [0])),
    });
  } catch (e: any) {
    return NextResponse.json({ error: "USAGE_LIMIT_QUERY_FAILED", message: e?.message || String(e) }, { status: 500 });
  }
}
