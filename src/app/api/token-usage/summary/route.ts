/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

type SumRow = { inputtokens: string|number; outputtokens: string|number; reasoningtokens: string|number; cachedinputtokens: string|number; };

const T = `"public"."TokenUsage"`;
const U = `"public"."User"`;
const P = `"public"."Policy"`;

const toNum = (v: any) => Number(v ?? 0);

function parseDate(s: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const from = parseDate(url.searchParams.get("from"));
    const to = parseDate(url.searchParams.get("to"));
    // group อนาคตอาจใช้ filter เพิ่มได้ ตอนนี้ “All” เสมอ
    // const group = url.searchParams.get("group") as "policy"|"department"|"faculty"|null;

    const base = sql<SumRow>`SELECT
      COALESCE(SUM("inputTokens")::bigint,0)       AS inputtokens,
      COALESCE(SUM("outputTokens")::bigint,0)      AS outputtokens,
      COALESCE(SUM("reasoningTokens")::bigint,0)   AS reasoningtokens,
      COALESCE(SUM("cachedInputTokens")::bigint,0) AS cachedinputtokens
      FROM ${sql.raw(T)}
    `;

    let q = base;
    if (from && to) {
      q = sql<SumRow>`
        SELECT
          COALESCE(SUM("inputTokens")::bigint,0)       AS inputtokens,
          COALESCE(SUM("outputTokens")::bigint,0)      AS outputtokens,
          COALESCE(SUM("reasoningTokens")::bigint,0)   AS reasoningtokens,
          COALESCE(SUM("cachedInputTokens")::bigint,0) AS cachedinputtokens
        FROM ${sql.raw(T)}
        WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
      `;
    }

    const r: any = await db.execute(q);
    const row = (r.rows ?? r)[0] as SumRow;

    return NextResponse.json({
      current: {
        inputTokens: toNum(row.inputtokens),
        outputTokens: toNum(row.outputtokens),
        reasoningTokens: toNum(row.reasoningtokens),
        cachedInputTokens: toNum(row.cachedinputtokens),
      },
      previous: null,
      trend: { inputTokens: null, outputTokens: null, reasoningTokens: null, cachedInputTokens: null },
    });
  } catch (err: any) {
    return NextResponse.json({ error: "SUMMARY_QUERY_FAILED", message: err?.message || String(err) }, { status: 500 });
  }
}
