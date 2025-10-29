/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * คืนรายเดือนภายในช่วงเวลา [from, to)
 * total = SUM(inputTokens + outputTokens + cachedInputTokens)
 * ออกมาเป็น monthIndex (0..11) + total
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        { error: "BAD_RANGE", message: "from/to is required" },
        { status: 400 }
      );
    }

    // group by เดือน (1..12) แล้วส่งกลับเป็น 0..11
    const q = sql<{
      m: number; // 1..12
      total: string | number;
    }>`
      SELECT
        EXTRACT(MONTH FROM "createdAt")::int AS m,
        COALESCE(
          SUM( ("inputTokens" + "outputTokens" + "cachedInputTokens")::bigint ),
          0
        )::bigint AS total
      FROM "public"."TokenUsage"
      WHERE "createdAt" >= ${new Date(from)}
        AND "createdAt" <  ${new Date(to)}
      GROUP BY m
      ORDER BY m ASC
    `;

    const r: any = await db.execute(q);
    const rows = (r?.rows ?? r) as { m: number; total: string | number }[];

    // map เป็น monthIndex 0..11
    const points = rows.map((row) => ({
      monthIndex: Math.max(0, Math.min(11, (row.m || 1) - 1)),
      total: Number(row.total || 0),
    }));

    return NextResponse.json({ points });
  } catch (err: any) {
    return NextResponse.json(
      { error: "MONTHLY_QUERY_FAILED", message: err?.message || String(err) },
      { status: 500 }
    );
  }
}
