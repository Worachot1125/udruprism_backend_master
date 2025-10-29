/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

// ตารางแบบ fully-qualified
const T_USAGE = `"public"."TokenUsage"`;
const T_POLICY = `"public"."Policy"`;

// ปลอดภัยกับพารามิเตอร์: ใช้ template ของ drizzle แทนการต่อสตริง
function parseMode(m: string | null): "monthly" | "quarterly" | "annually" {
  if (m === "quarterly") return "quarterly";
  if (m === "annually") return "annually";
  return "monthly";
}
function parseYear(y: string | null) {
  const n = Number(y);
  return Number.isFinite(n) && n >= 1970 && n <= 9999 ? n : new Date().getFullYear();
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const mode = parseMode(url.searchParams.get("mode"));
    const year = parseYear(url.searchParams.get("year"));

    // ขอบเขตรายปีเป็น [from, to)
    const from = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
    const to = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));

    // ----- รวม token usage ต่อ bucket -----
    // รวม (input+output+cached) ต่อเดือน/ไตรมาส/ปี
    const bucket =
      mode === "monthly" ? "month" :
      mode === "quarterly" ? "quarter" : "year";

    type Row = { bucket: string; total: string | number };
    const qUsage = sql<Row>`
      SELECT
        to_char(date_trunc(${sql.raw(`'${bucket}'`)}, ${sql.raw(T_USAGE)}."createdAt"::timestamptz), ${
          // รูปแบบ label ให้อ่านง่าย
          mode === "monthly"
            ? sql.raw(`'Mon'`)
            : mode === "quarterly"
            ? sql.raw(`'"Q"Q'`)
            : sql.raw(`'YYYY'`)
        }) AS bucket,
        COALESCE(SUM((
          ${sql.raw(T_USAGE)}."inputTokens"
        + ${sql.raw(T_USAGE)}."outputTokens"
        + ${sql.raw(T_USAGE)}."cachedInputTokens"
        )::bigint),0)::bigint AS total
      FROM ${sql.raw(T_USAGE)}
      WHERE ${sql.raw(T_USAGE)}."createdAt"::timestamptz >= ${from}::timestamptz
        AND ${sql.raw(T_USAGE)}."createdAt"::timestamptz <  ${to}::timestamptz
      GROUP BY 1
      ORDER BY 1
    `;
    const rUsage: any = await db.execute(qUsage);
    const rows: Row[] = (rUsage.rows ?? rUsage) as any[];

    // เตรียม labels ตามโหมด
    const labels =
      mode === "monthly"
        ? ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
        : mode === "quarterly"
        ? ["Q1","Q2","Q3","Q4"]
        : [String(year)];

    // map -> array เต็มความยาว
    const usageMap = new Map(rows.map((r) => [r.bucket, Number(r.total || 0)]));
    const usage = labels.map((lb) => usageMap.get(lb) ?? 0);

    // ----- รวม token limit ทั้งระบบ -----
    // สมมุติ: โครงสร้าง policy มีคอลัมน์ "token_limit"
    type SumRow = { n: string | number };
    const qLimit = sql<SumRow>`
      SELECT COALESCE(SUM("token_limit")::bigint,0)::bigint AS n
      FROM ${sql.raw(T_POLICY)}
    `;
    const rLimit: any = await db.execute(qLimit);
    const sumLimit = Number(((rLimit.rows ?? rLimit)[0] as SumRow)?.n || 0);
    const limit = new Array(labels.length).fill(sumLimit);

    return NextResponse.json(
      { labels, usage, limit },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "TOKEN_USAGE_VS_LIMIT_FAILED", message: err?.message || String(err) },
      { status: 500 }
    );
  }
}
