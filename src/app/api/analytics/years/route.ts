/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

const T_USAGE = `"public"."TokenUsage"`;

export async function GET() {
  try {
    type Row = { y: number };
    const q = sql<Row>`
      SELECT DISTINCT EXTRACT(YEAR FROM ${sql.raw(T_USAGE)}."createdAt"::timestamptz)::int AS y
      FROM ${sql.raw(T_USAGE)}
      ORDER BY 1
    `;
    const r: any = await db.execute(q);
    const ys = (r.rows ?? r).map((x: Row) => x.y);
    const list = ys.length ? ys : [new Date().getFullYear()];
    return NextResponse.json({ years: list }, { status: 200 });
  } catch (err: any) {
    // ถ้า error ก็ fallback ปีปัจจุบัน
    return NextResponse.json(
      { years: [new Date().getFullYear()], note: err?.message || String(err) },
      { status: 200 }
    );
  }
}
