/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

function parseDate(s: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * GET /api/analytics/usage-vs-policy-limit?from=ISO&to=ISO
 * ตอบ:
 * {
 *   rows: { id, name, total, limitTotal, percent }[],
 *   meta: { policyCount, usageTotal, limitTotal }
 * }
 *
 * percent = total(policy) / limitTotal(all policies) * 100
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const from = parseDate(url.searchParams.get("from"));
    const to = parseDate(url.searchParams.get("to"));
    if (!from || !to) {
      return NextResponse.json(
        { error: "MISSING_RANGE", message: "from/to is required" },
        { status: 400 }
      );
    }

    // รวม limit ทั้งระบบ + จำนวน policy
    const limitAggQ = sql<{ policycount: string | number; limittotal: string | number }>`
      SELECT COUNT(*)::bigint AS policycount,
             COALESCE(SUM(p."token_limit")::bigint, 0) AS limittotal
      FROM "public"."Policy" p
    `;
    const limitAggR: any = await db.execute(limitAggQ);
    const policyCount = Number((limitAggR.rows ?? limitAggR)[0]?.policycount || 0);
    const limitTotal = Number((limitAggR.rows ?? limitAggR)[0]?.limittotal || 0);

    // usage ต่อ policy (ภายในช่วงเวลา)
    const usagePerPolicyQ = sql<{
      id: string | null;
      name: string | null;
      total: string | number;
    }>`
      SELECT p."id" AS id,
             p."name" AS name,
             COALESCE(SUM( (COALESCE(t."inputTokens",0) + COALESCE(t."outputTokens",0) + COALESCE(t."cachedInputTokens",0)) )::bigint, 0) AS total
      FROM "public"."Policy" p
      LEFT JOIN "public"."User" u ON u."policyId" = p."id"
      LEFT JOIN "public"."TokenUsage" t
         ON t."userId" = u."id"
        AND t."createdAt" >= ${from} AND t."createdAt" < ${to}
      GROUP BY p."id", p."name"
      ORDER BY p."name" ASC
    `;
    const usagePerPolicyR: any = await db.execute(usagePerPolicyQ);
    const rows = (usagePerPolicyR.rows ?? usagePerPolicyR).map((r: any) => {
      const total = Number(r.total || 0);
      const percent =
        limitTotal > 0 ? Math.max(0, Math.min(100, (total / limitTotal) * 100)) : 0;
      return {
        id: r.id ?? null,
        name: r.name ?? "—",
        total,
        limit: limitTotal, // ส่งมาด้วย เพื่อให้ front โชว์ a / b
        percent,
      };
    });

    const usageTotal = rows.reduce((s: number, x: any) => s + (x.total || 0), 0);

    return NextResponse.json({
      rows,
      meta: { policyCount, usageTotal, limitTotal },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "USAGE_VS_LIMIT_QUERY_FAILED", message: err?.message || String(err) },
      { status: 500 }
    );
  }
}
