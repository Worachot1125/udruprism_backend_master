// app/api/admin/policies/[id]/members/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user as userTbl, department, faculty } from "@/lib/schema";
import { and, asc, count, eq, ilike, or, sql, inArray, type SQL } from "drizzle-orm";

/* ---------------- utils ---------------- */
function toInt(v: string | null, d: number) {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : d;
}

function buildFullName(prefix?: string | null, firstname?: string | null, lastname?: string | null) {
  const p = (prefix ?? "").trim();
  const a = (firstname ?? "").trim();
  const b = (lastname ?? "").trim();
  return [p, a, b].filter(Boolean).join(" ");
}

function currentAcademicYearBE(d = new Date()) {
  const be = d.getFullYear() + 543;
  const m = d.getMonth() + 1;
  return m >= 8 ? be : be - 1;
}
function extractCohort2DigitsFromEmail(email: string): number | null {
  const m = /(\d{2})/i.exec(email);
  return m ? Number(m[1]) : null;
}
function calcYearFromCohort2Digits(cohort2: number | null, now = new Date()): number {
  if (cohort2 == null || Number.isNaN(cohort2)) return 1;
  const cohortBE = 2500 + cohort2;
  const currBE = currentAcademicYearBE(now);
  const y = currBE - cohortBE + 1;
  return Math.max(1, Math.min(8, y));
}

const fullNameExpr = sql<string>`
  concat_ws(' ',
    trim(${userTbl.prefix}::text),
    trim(${userTbl.firstname}),
    trim(${userTbl.lastname})
  )
`;
const fullNameSql = fullNameExpr.as("fullName");

/* ===================== GET: list members ===================== */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, toInt(searchParams.get("page"), 1));
    const pageSize = Math.min(500, toInt(searchParams.get("pageSize"), 100));
    const q = (searchParams.get("q") ?? "").trim();

    const clauses: SQL<unknown>[] = [eq(userTbl.policyId, id)];
    if (q) {
      const cond = or(
        ilike(fullNameExpr, `%${q}%`),
        ilike(userTbl.email, `%${q}%`)
      ); 
      if (cond) clauses.push(cond);       
    }

    const whereCond = and(...clauses);

    const [{ t }] = await db.select({ t: count(userTbl.id) }).from(userTbl).where(whereCond);
    const total = Number(t ?? 0);
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const offset = (page - 1) * pageSize;

    const rows = await db
      .select({
        id: userTbl.id,
        email: userTbl.email,
        prefix: userTbl.prefix,
        firstname: userTbl.firstname,
        lastname: userTbl.lastname,
        fullName: fullNameSql,
        major: department.name,
        faculty: faculty.name,
      })
      .from(userTbl)
      .leftJoin(department, eq(userTbl.departmentId, department.id))
      .leftJoin(faculty, eq(department.facultyId, faculty.id))
      .where(whereCond)
      .orderBy(asc(userTbl.firstname), asc(userTbl.lastname))
      .limit(pageSize)
      .offset(offset);

    const users = rows.map((r) => {
      const year = calcYearFromCohort2Digits(extractCohort2DigitsFromEmail(r.email));
      return {
        id: String(r.id),
        email: r.email,
        fullName: (r.fullName ?? buildFullName(r.prefix, r.firstname, r.lastname) ?? r.email).trim(),
        major: r.major ?? "",
        faculty: r.faculty ?? "",
        year,
      };
    });

    return NextResponse.json({
      ok: true,
      users,
      total,
      page,
      pageSize,
      pageCount,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "INTERNAL";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/* ===================== POST: add members ===================== */
// body: { userIds: string[] }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const bodyUnknown: unknown = await req.json().catch(() => ({}));
    const ids = Array.isArray((bodyUnknown as { userIds?: unknown }).userIds)
      ? ((bodyUnknown as { userIds?: unknown }).userIds as unknown[]).filter((x): x is string => typeof x === "string")
      : [];

    if (ids.length === 0) {
      return NextResponse.json(
        { ok: false, error: "userIds is required (non-empty array)" },
        { status: 400 },
      );
    }

    const updated = await db
      .update(userTbl)
      .set({ policyId: id })
      .where(inArray(userTbl.id, ids))
      .returning({ id: userTbl.id });

    return NextResponse.json({
      ok: true,
      added: updated.length,
      ids: updated.map((r) => r.id),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "INTERNAL";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/* ===================== DELETE: remove member(s) ===================== */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);

    const qUserId = (searchParams.get("userId") ?? "").trim();

    let bodyIds: string[] = [];
    if (!qUserId) {
      const raw: unknown = await req.json().catch(() => ({}));
      const list = (raw as { userIds?: unknown }).userIds;
      if (Array.isArray(list)) {
        bodyIds = list.filter((x): x is string => typeof x === "string" && x.length > 0);
      }
    }

    const ids = qUserId ? [qUserId] : bodyIds;
    if (ids.length === 0) {
      return NextResponse.json(
        { ok: false, error: "userId (query) or userIds (body) is required" },
        { status: 400 },
      );
    }

    const updated = await db
      .update(userTbl)
      .set({ policyId: null })
      .where(and(eq(userTbl.policyId, id), inArray(userTbl.id, ids)))
      .returning({ id: userTbl.id });

    return NextResponse.json({
      ok: true,
      removed: updated.length,
      ids: updated.map((r) => r.id),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "INTERNAL";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
