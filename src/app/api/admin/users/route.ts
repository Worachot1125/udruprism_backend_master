/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user, department, faculty, policy, ban } from "@/lib/schema";
import { and, or, eq, ilike, inArray, not, asc, sql, isNull, ne } from "drizzle-orm";

type APIUser = {
  id: string;
  prefix?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  email: string;
  active: boolean;
  role: string | null;
  major: string;
  faculty: string;
  policyId: string | null;
  policyName: string | null;
  year: number | null;
  fullName: string;
};

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
  const y = (currBE - cohortBE) + 1;
  return Math.max(1, Math.min(8, y));
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    // pagination
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(Math.max(1, Number(url.searchParams.get("pageSize") || "100")), 100);
    const offset = (page - 1) * pageSize;

    // filters
    const q = url.searchParams.get("q") || undefined;
    const policyId = url.searchParams.get("policyId") || undefined;
    const domain = url.searchParams.get("domain") || undefined;
    const facultyName = url.searchParams.get("faculty") || undefined;
    const excludePolicyId = url.searchParams.get("excludePolicyId") || undefined;
    const majorName = url.searchParams.get("major") || undefined;
    const yearStr = url.searchParams.get("year");
    const yearNum = yearStr ? Number(yearStr) : undefined;

    const excludeIds = (url.searchParams.get("excludeIds") || "")
      .split(",").map((s) => s.trim()).filter(Boolean);

    const excludeBannedPolicies = (url.searchParams.get("excludeBannedPolicies") || "")
      .split(",").map((s) => s.trim()).filter(Boolean);

    const whereParts: any[] = [];

    const fullNameExpr = sql<string>`
      concat_ws(' ',
        trim(${user.prefix}::text),
        trim(${user.firstname}),
        trim(${user.lastname})
      )
    `;

    if (q) {
      const like = `%${q}%`;
      whereParts.push(
        or(
          ilike(fullNameExpr, like),
          ilike(user.email, like),
          ilike(department.name, like),
          ilike(faculty.name, like),
          sql`${user.id}::text ILIKE ${like}`
        )
      );
    }

    if (policyId) whereParts.push(eq(user.policyId, policyId));
    if (excludePolicyId) {
      whereParts.push(or(isNull(user.policyId), ne(user.policyId, excludePolicyId)));
    }
    if (excludeBannedPolicies.length) {
      whereParts.push(or(isNull(user.policyId), not(inArray(user.policyId, excludeBannedPolicies))));
    }
    if (domain) whereParts.push(ilike(user.email, `%${domain}`));
    if (excludeIds.length) whereParts.push(not(inArray(user.id, excludeIds)));
    if (facultyName) whereParts.push(ilike(faculty.name, `%${facultyName}%`));
    if (majorName) {
      whereParts.push(ilike(department.name, `%${majorName}%`));
    }

    if (typeof yearNum === "number" && !Number.isNaN(yearNum)) {
      const month = sql<number>`EXTRACT(MONTH FROM CURRENT_DATE)::int`;
      const academicBE = sql<number>`
        CASE WHEN ${month} >= 8
             THEN (EXTRACT(YEAR FROM CURRENT_DATE)::int + 543)
             ELSE (EXTRACT(YEAR FROM CURRENT_DATE)::int + 543 - 1)
        END
      `;
      const cohort2 = sql<number>`NULLIF(substring(${user.email} from '([0-9]{2})'), '')::int`;
      const cohortBE = sql<number>`CASE WHEN ${cohort2} IS NULL THEN NULL ELSE 2500 + ${cohort2} END`;
      const rawYear = sql<number>`CASE WHEN ${cohortBE} IS NULL THEN 1 ELSE (${academicBE} - ${cohortBE}) + 1 END`;
      const clampedYear = sql<number>`LEAST(8, GREATEST(1, ${rawYear}))`;

      whereParts.push(sql`${clampedYear} = ${yearNum}`);
    }

    const whereExpr = whereParts.length ? and(...whereParts) : undefined;

    // count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .leftJoin(department, eq(user.departmentId, department.id))
      .leftJoin(faculty, eq(department.facultyId, faculty.id))
      .where(whereExpr);

    const rows = await db
      .select({
        id: user.id,
        email: user.email,
        prefix: user.prefix,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role,
        policyId: user.policyId,
        policyName: policy.name,
        deptName: department.name,
        facName: faculty.name,
        isBanned: sql<number>`
          CASE WHEN (
            EXISTS (
              SELECT 1 FROM ${ban}
              WHERE ${ban.userId} = ${user.id}
                AND (${ban.startAt} IS NULL OR ${ban.startAt} <= NOW())
                AND (${ban.endAt}   IS NULL OR ${ban.endAt}   >= NOW())
            )
            OR (
              ${user.policyId} IS NOT NULL AND EXISTS (
                SELECT 1 FROM ${ban}
                WHERE ${ban.userId} IS NULL
                  AND ${ban.policyId} = ${user.policyId}
                  AND (${ban.startAt} IS NULL OR ${ban.startAt} <= NOW())
                  AND (${ban.endAt}   IS NULL OR ${ban.endAt}   >= NOW())
              )
            )
          ) THEN 1 ELSE 0 END
        `,
      })
      .from(user)
      .leftJoin(department, eq(user.departmentId, department.id))
      .leftJoin(faculty, eq(department.facultyId, faculty.id))
      .leftJoin(policy, eq(user.policyId, policy.id))
      .where(whereExpr)
      .orderBy(asc(user.id))
      .limit(pageSize)
      .offset(offset);

    const users: APIUser[] = rows.map((r) => {
      const cohort2 = extractCohort2DigitsFromEmail(r.email);
      const year = calcYearFromCohort2Digits(cohort2);
      return {
        id: String(r.id),
        prefix: r.prefix ?? null,
        firstname: r.firstname ?? null,
        lastname: r.lastname ?? null,
        email: r.email,
        active: !r.isBanned,
        role: r.role ?? null,
        policyId: r.policyId ? String(r.policyId) : null,
        policyName: r.policyName ?? null,
        major: r.deptName ?? "",
        faculty: r.facName ?? "",
        year,
        fullName: buildFullName(r.prefix, r.firstname, r.lastname) || r.email,
      };
    });

    const totalNum = Number(count) || 0;
    const pageCount = Math.max(1, Math.ceil(totalNum / pageSize));

    return NextResponse.json({
      ok: true,
      users,
      total: totalNum,
      page,
      pageSize,
      pageCount,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
