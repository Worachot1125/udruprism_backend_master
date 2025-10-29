/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * คืนรายการปีที่มีข้อมูล พร้อมยอดรวมของปีนั้น
 * ใช้ประกอบ dropdown ปีในกราฟ
 */
export async function GET() {
  try {
    const q = sql<{ y: number; total: string | number }>`
      SELECT
        EXTRACT(YEAR FROM "createdAt")::int AS y,
        COALESCE(
          SUM( ("inputTokens" + "outputTokens" + "cachedInputTokens")::bigint ),
          0
        )::bigint AS total
      FROM "public"."TokenUsage"
      GROUP BY y
      ORDER BY y DESC
    `;
    const r: any = await db.execute(q);
    const rows = (r?.rows ?? r) as { y: number; total: string | number }[];

    return NextResponse.json({
      years: rows.map((it) => ({ year: it.y, total: Number(it.total || 0) })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "YEARS_QUERY_FAILED", message: err?.message || String(err) },
      { status: 500 }
    );
  }
}
