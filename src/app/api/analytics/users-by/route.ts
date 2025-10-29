/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * GET /api/analytics/users-by?group=policy
 * ตอบ:
 * {
 *   rows: { id: string|null, name: string, userCount: number, percent: number }[],
 *   totalUsers: number
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const group = (url.searchParams.get("group") || "policy").toLowerCase();

    if (group !== "policy") {
      return NextResponse.json(
        { rows: [], totalUsers: 0, message: "Only policy group is supported." },
        { status: 200 }
      );
    }

    // รวมจำนวนผู้ใช้ทั้งหมด
    const totalUsersQ = sql<{ n: string | number }>`
      SELECT COUNT(*)::bigint AS n
      FROM "public"."User"
    `;
    const totalUsersR: any = await db.execute(totalUsersQ);
    const totalUsers = Number((totalUsersR.rows ?? totalUsersR)[0]?.n || 0);

    // นับผู้ใช้ในแต่ละ policy
    const rowsQ = sql<{
      id: string | null;
      name: string | null;
      usercount: string | number;
    }>`
      SELECT p."id" AS id,
             p."name" AS name,
             COALESCE(COUNT(u."id")::bigint, 0) AS usercount
      FROM "public"."Policy" p
      LEFT JOIN "public"."User" u ON u."policyId" = p."id"
      GROUP BY p."id", p."name"
      ORDER BY p."name" ASC
    `;
    const rowsR: any = await db.execute(rowsQ);

    const rows = (rowsR.rows ?? rowsR).map((r: any) => {
      const userCount = Number(r.usercount || 0);
      const percent =
        totalUsers > 0 ? Math.max(0, Math.min(100, (userCount / totalUsers) * 100)) : 0;
      return {
        id: r.id ?? null,
        name: r.name ?? "—",
        userCount,
        percent,
      };
    });

    return NextResponse.json({ rows, totalUsers });
  } catch (err: any) {
    return NextResponse.json(
      { error: "USERS_BY_POLICY_QUERY_FAILED", message: err?.message || String(err) },
      { status: 500 }
    );
  }
}
