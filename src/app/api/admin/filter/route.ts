import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user, department, faculty, policy } from "@/lib/schema";
import { asc, sql } from "drizzle-orm";

export async function GET() {
  try {
    // 1) policies
    const policies = await db
      .select({ id: policy.id, name: policy.name })
      .from(policy)
      .orderBy(asc(policy.name));

    // 2) faculties
    const faculties = await db
      .select({ id: faculty.id, name: faculty.name })
      .from(faculty)
      .orderBy(asc(faculty.name));

    // 3) departments (majors) + facultyId
    const majors = await db
      .select({
        id: department.id,
        name: department.name,
        facultyId: department.facultyId,
      })
      .from(department)
      .orderBy(asc(department.name));

    // 4) domains 
    const rows = await db
      .select({
        domain: sql<string>`regexp_replace(${user.email}, '^[^@]+', '')`,
      })
      .from(user)
      .where(sql`position('@' in ${user.email}) > 0`)
      .groupBy(sql`regexp_replace(${user.email}, '^[^@]+', '')`)
      .orderBy(sql`regexp_replace(${user.email}, '^[^@]+', '')`);

    const domains = rows.map((r) => r.domain?.toLowerCase?.() || "").filter(Boolean);

    return NextResponse.json({
      ok: true,
      policies,  // [{id,name}]
      faculties, // [{id,name}]
      majors,    // [{id,name,facultyId}]
      domains,   // ["@gmail.com", "@ku.th", ...]
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
