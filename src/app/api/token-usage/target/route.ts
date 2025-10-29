/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

const TU = `"public"."TokenUsage"`;
const U  = `"public"."User"`;
const P  = `"public"."Policy"`;

function parseDate(s: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
const toISO = (d: Date) => d.toISOString();

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const from = parseDate(url.searchParams.get("from"));
    const to   = parseDate(url.searchParams.get("to"));
    if (!from || !to) {
      return NextResponse.json({ error: "BAD_RANGE", message: "from/to required" }, { status: 400 });
    }

    const fISO = toISO(from);
    const tISO = toISO(to);

    // ------------------ SUM usage ------------------
    const usageQ = sql<{ n: string | number }>`
      SELECT COALESCE(SUM((t."inputTokens" + t."outputTokens" + t."cachedInputTokens")::bigint),0)::bigint AS n
      FROM ${sql.raw(TU)} t
      LEFT JOIN ${sql.raw(U)} u ON u."id" = t."userId"
      LEFT JOIN ${sql.raw(P)} p ON p."id" = u."policyId"
      WHERE (t."createdAt"::timestamptz) >= ${fISO}::timestamptz
        AND (t."createdAt"::timestamptz) <  ${tISO}::timestamptz
    `;
    const usageRes: any = await db.execute(usageQ);
    const usageTotal = Number((usageRes.rows ?? usageRes)[0]?.n ?? 0);

    // ------------------ SUM token limit ------------------
    const limitQ = sql<{ n: string | number }>`
      SELECT COALESCE(SUM("token_limit")::bigint,0)::bigint AS n FROM ${sql.raw(P)}
    `;
    const limitRes: any = await db.execute(limitQ);
    const limit = Number((limitRes.rows ?? limitRes)[0]?.n ?? 0);
    const percent = limit > 0 ? Math.min(100, (usageTotal / limit) * 100) : 0;

    // ------------------ TOP 3 policies ------------------
    const topQ = sql<{ name: string | null; total: string | number }>`
      SELECT COALESCE(p."name",'—') AS name,
             COALESCE(SUM((t."inputTokens" + t."outputTokens" + t."cachedInputTokens")::bigint),0)::bigint AS total
      FROM ${sql.raw(TU)} t
      LEFT JOIN ${sql.raw(U)} u ON u."id" = t."userId"
      LEFT JOIN ${sql.raw(P)} p ON p."id" = u."policyId"
      WHERE (t."createdAt"::timestamptz) >= ${fISO}::timestamptz
        AND (t."createdAt"::timestamptz) <  ${tISO}::timestamptz
      GROUP BY p."name"
      ORDER BY total DESC
      LIMIT 3
    `;
    const topRes: any = await db.execute(topQ);
    const topPolicies =
      (topRes.rows ?? topRes).map((r: any) => ({
        name: r.name ?? "—",
        total: Number(r.total ?? 0),
      }));

    return NextResponse.json({
      usageTotal,
      limit,
      percent,
      topPolicies,
      period: { from: fISO, to: tISO },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "TARGET_QUERY_FAILED", message: err?.message || String(err) },
      { status: 500 }
    );
  }
}
