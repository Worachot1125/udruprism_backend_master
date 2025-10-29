// app/api/admin/admin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { admin as adminTbl, prefixEnum } from "@/lib/schema";
import { sql, and, asc, count, eq, ilike, or, type SQL } from "drizzle-orm";

/* ====================== UI Types ====================== */
export type UIAdmin = {
  id: string;
  email: string;
  prefix?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  department?: string | null;
};

export type ListResp = {
  ok: boolean;
  items: UIAdmin[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  error?: string;
};

/* ====================== helpers ====================== */
function toInt(v: string | null, def: number) {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}

type Prefix = (typeof prefixEnum.enumValues)[number];
function toPrefix(v: unknown): Prefix | null {
  if (v == null) return null;
  if (typeof v !== "string") return null;
  const s = v.trim();
  return (prefixEnum.enumValues as readonly string[]).includes(s)
    ? (s as Prefix)
    : null;
}

/* ====================== GET ====================== */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, toInt(searchParams.get("page"), 1));
    const pageSize = Math.min(100, toInt(searchParams.get("pageSize"), 20));
    const q = (searchParams.get("q") ?? "").trim();

    const whereParts: SQL<unknown>[] = [];

    const fullNameExpr = sql<string>`
      concat_ws(
        ' ',
        nullif(trim(${adminTbl.prefix}::text), ''),
        nullif(trim(${adminTbl.firstname}), ''),
        nullif(trim(${adminTbl.lastname}), '')
      )
    `;

    if (q) {
      const like = `%${q}%`;
      const orConds: SQL<unknown>[] = [
        ilike(adminTbl.email, like),
        ilike(adminTbl.firstname, like),
        ilike(adminTbl.lastname, like),
        ilike(sql`${adminTbl.prefix}::text`, like),
        ilike(fullNameExpr, like),
        ilike(adminTbl.department, like), 
      ];
      const orExpr = orConds.length ? or(...orConds) : undefined;
      if (orExpr) whereParts.push(orExpr);
    }

    const whereClause: SQL<unknown> | undefined =
      whereParts.length ? and(...whereParts) : undefined;

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(adminTbl)
      .where(whereClause);

    const pageCount = Math.max(1, Math.ceil((Number(total) || 0) / pageSize));
    const offset = (page - 1) * pageSize;

    const rows = await db
      .select({
        id: adminTbl.id,
        email: adminTbl.email,
        prefix: adminTbl.prefix,
        firstname: adminTbl.firstname,
        lastname: adminTbl.lastname,
        department: adminTbl.department, 
      })
      .from(adminTbl)
      .where(whereClause)
      .orderBy(
        asc(adminTbl.lastname),
        asc(adminTbl.firstname),
        asc(adminTbl.email)
      )
      .limit(pageSize)
      .offset(offset);

    const items: UIAdmin[] = rows.map((r) => ({
      id: String(r.id),
      email: r.email,
      prefix: r.prefix ?? null,
      firstname: r.firstname ?? null,
      lastname: r.lastname ?? null,
      department: r.department ?? null,
    }));

    return NextResponse.json({
      ok: true,
      items,
      total: Number(total) || 0,
      page,
      pageSize,
      pageCount,
    } satisfies ListResp);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "INTERNAL_ERROR";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/* ====================== POST: create ====================== */
export async function POST(req: NextRequest) {
  try {
    const raw: unknown = await req.json().catch(() => ({}));
    const body = (raw ?? {}) as Record<string, unknown>;

    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!email) {
      return NextResponse.json(
        { ok: false, error: "EMAIL_REQUIRED" },
        { status: 400 }
      );
    }

    const prefix = toPrefix(body.prefix);
    const firstname =
      typeof body.firstname === "string" && body.firstname.trim()
        ? body.firstname.trim()
        : null;
    const lastname =
      typeof body.lastname === "string" && body.lastname.trim()
        ? body.lastname.trim()
        : null;
    const department =
      typeof body.department === "string" && body.department.trim()
        ? body.department.trim()
        : null;

    const [inserted] = await db
      .insert(adminTbl)
      .values({
        email,
        prefix,
        firstname,
        lastname,
        department, 
      })
      .returning({ id: adminTbl.id });

    return NextResponse.json({ ok: true, id: inserted.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "INTERNAL_ERROR";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/* ====================== PATCH: update by id ====================== */
export async function PATCH(req: NextRequest) {
  try {
    const raw: unknown = await req.json().catch(() => ({}));
    const body = (raw ?? {}) as Record<string, unknown>;

    const id = typeof body.id === "string" ? body.id : "";
    if (!id)
      return NextResponse.json(
        { ok: false, error: "MISSING_ID" },
        { status: 400 }
      );

    const update: Record<string, unknown> = {};

    if (typeof body.email === "string") update.email = body.email.trim();

    if (body.prefix === null || typeof body.prefix === "string") {
      update.prefix = toPrefix(body.prefix); 
    }

    if (typeof body.firstname === "string" || body.firstname === null) {
      update.firstname =
        typeof body.firstname === "string" ? body.firstname.trim() : null;
    }
    if (typeof body.lastname === "string" || body.lastname === null) {
      update.lastname =
        typeof body.lastname === "string" ? body.lastname.trim() : null;
    }

    if (typeof body.department === "string" || body.department === null) {
      update.department =
        typeof body.department === "string" && body.department.trim()
          ? body.department.trim()
          : null;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { ok: false, error: "NOTHING_TO_UPDATE" },
        { status: 400 }
      );
    }

    await db.update(adminTbl).set(update).where(eq(adminTbl.id, id));
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "INTERNAL_ERROR";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/* ====================== DELETE: delete by id ====================== */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get("id") ?? "");
    if (!id)
      return NextResponse.json(
        { ok: false, error: "MISSING_ID" },
        { status: 400 }
      );

    await db.delete(adminTbl).where(eq(adminTbl.id, id));
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "INTERNAL_ERROR";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
