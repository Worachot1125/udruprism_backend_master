/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/api/reports/tokens/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql, type SQL } from "drizzle-orm";

type By = "policy" | "user" | "department" | "faculty";
type Interval = "day" | "month";

const pick = <T extends string>(
    v: string | null,
    list: readonly T[],
    def: T,
): T => ((list as readonly string[]).includes(v ?? "") ? (v as T) : def);

export const revalidate = 0;

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const by = pick(url.searchParams.get("by"), ["policy", "user", "department", "faculty"], "policy");
        const interval = pick(url.searchParams.get("interval"), ["day", "month"], "month");

        const toParam = url.searchParams.get("to");
        const fromParam = url.searchParams.get("from");
        const to = toParam ? new Date(toParam) : new Date();
        const from =
            fromParam
                ? new Date(fromParam)
                : new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1);

        if (isNaN(+from) || isNaN(+to)) {
            return NextResponse.json({ ok: false, error: "INVALID_DATE" }, { status: 400 });
        }

        // ----- dynamic SQL parts -----
        const joinSql: SQL = (() => {
            switch (by) {
                case "policy":
                    return sql.raw(`LEFT JOIN "Policy" g ON g.id = u."policyId"`);
                case "user":
                    return sql.raw(``);
                case "department":
                    // NOTE: คอลัมน์ในตาราง User ชื่อ "department" (uuid)
                    return sql.raw(`LEFT JOIN "Department" g ON g.id = u."department"`);
                case "faculty":
                    return sql.raw(`
            LEFT JOIN "Department" d ON d.id = u."department"
            LEFT JOIN "Faculty"   g ON g.id = d."facultyId"
          `);
            }
        })();

        // id (cast เป็น text ทุกกรณี)
        const idExpr: SQL = (() => {
            switch (by) {
                case "policy":
                    return sql.raw(`COALESCE(CAST(u."policyId" AS text), '__NONE__')`);
                case "user":
                    return sql.raw(`CAST(u.id AS text)`);
                case "department":
                    return sql.raw(`COALESCE(CAST(u."department" AS text), '__NONE__')`);
                case "faculty":
                    return sql.raw(`COALESCE(CAST(g.id AS text), '__NONE__')`);
            }
        })();

        const nameExpr: SQL = (() => {
            switch (by) {
                case "policy":
                    return sql.raw(`COALESCE(g.name, 'Unassigned')`);
                case "user":
                    return sql.raw(
                        `COALESCE(NULLIF(trim(concat_ws(' ', u.firstname, u.lastname)), ''), u.email)`,
                    );
                case "department":
                    return sql.raw(`COALESCE(g.name, 'Unassigned')`);
                case "faculty":
                    return sql.raw(`COALESCE(g.name, 'Unassigned')`);
            }
        })();

        const bucketExpr = sql.raw(`date_trunc('${interval}', m."createdAt")`);

        // ----- main query -----
        const q = sql`
      SELECT
        ${bucketExpr} AS bucket,
        ${idExpr}     AS gid,
        ${nameExpr}   AS gname,
        SUM(m.token)::bigint AS tokens
      FROM "Message" m
      JOIN "Chat"  c ON c.id = m."chatId"
      JOIN "User"  u ON u.id = c."userId"
      ${joinSql}
      WHERE m."createdAt" >= ${from}
        AND m."createdAt" <= ${to}
      GROUP BY 1,2,3
      ORDER BY 1 ASC, 4 DESC
    `;

        const res: any = await db.execute(q);
        const rawRows: any[] = Array.isArray(res) ? res : "rows" in res ? (res.rows as any[]) : [];

        type Row = { bucket: string | Date; gid: string | null; gname: string | null; tokens: string | number | null };
        const rows = rawRows as Row[];

        // normalize
        const data = rows.map((r) => ({
            bucket: new Date(r.bucket as any).toISOString(),
            id: (r.gid ?? "__NONE__") as string,
            name: (r.gname ?? "Unassigned") as string,
            tokens:
                r.tokens == null ? 0 : typeof r.tokens === "string" ? parseInt(r.tokens, 10) || 0 : (r.tokens as number),
        }));

        const buckets = Array.from(new Set(data.map((d) => d.bucket))).sort();

        const groupMap = new Map<
            string,
            { id: string; name: string; total: number; monthly: { bucket: string; tokens: number }[] }
        >();

        for (const r of data) {
            if (!groupMap.has(r.id)) groupMap.set(r.id, { id: r.id, name: r.name, total: 0, monthly: [] });
            groupMap.get(r.id)!.total += r.tokens;
        }

        for (const [id, g] of groupMap) {
            const byBucket = new Map(buckets.map((b) => [b, 0]));
            for (const r of data) if (r.id === id) byBucket.set(r.bucket, (byBucket.get(r.bucket) ?? 0) + r.tokens);
            g.monthly = buckets.map((b) => ({ bucket: b, tokens: byBucket.get(b) ?? 0 }));
        }

        const groups = Array.from(groupMap.values()).sort((a, b) => b.total - a.total);
        const grandTotal = groups.reduce((s, g) => s + g.total, 0);

        return NextResponse.json({
            ok: true as const,
            by,
            interval,
            from: from.toISOString(),
            to: to.toISOString(),
            buckets,
            groups,
            grandTotal,
        });
    } catch (e: any) {
        // ให้ข้อความ error โผล่ใน dev
        console.error("[/api/reports/tokens] error:", e?.message ?? e);
        return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
    }
}
