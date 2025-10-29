/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/api/users/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user, department, faculty } from "@/lib/schema";
import { eq } from "drizzle-orm";

type UIUser = {
  id: string;
  fullName: string;
  email: string;
  major?: string;
  faculty?: string;
  year: number;
  active: boolean;      // ค่าเพื่อ UI เท่านั้น (สคีมาไม่มีคอลัมน์นี้)
  studentId?: string;
};

function fullName(firstname?: string | null, lastname?: string | null) {
  const a = (firstname ?? "").trim();
  const b = (lastname ?? "").trim();
  return (a || b) ? [a, b].filter(Boolean).join(" ") : "";
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object";
}

export async function GET() {
  try {
    const rows = await db
      .select({
        id: user.id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        policyId: user.policyId,          // มีอยู่ในสคีมา
        deptName: department.name,
        facName: faculty.name,
      })
      .from(user)
      .leftJoin(department, eq(user.departmentId, department.id))
      .leftJoin(faculty, eq(department.facultyId, faculty.id));

    const usersUI: UIUser[] = rows.map((r) => ({
      id: r.id,
      fullName: fullName(r.firstname, r.lastname) || r.email,
      email: r.email,
      major: r.deptName ?? "",
      faculty: r.facName ?? "",
      year: 1,
      active: true,           // <- สคีมาไม่มีฟิลด์นี้: ตั้งค่า default ให้ UI ใช้
      studentId: "",
    }));

    const domains = Array.from(
      new Set(
        usersUI
          .map((u) => (u.email.toLowerCase().match(/@.+$/)?.[0] ?? "")) // "@domain"
          .filter(Boolean),
      ),
    ).sort();

    return NextResponse.json({ ok: true, users: usersUI, domains });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const bodyUnknown: unknown = await req.json().catch(() => ({}));
    const body = isRecord(bodyUnknown) ? bodyUnknown : {};

    const full = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const majorName = typeof body.major === "string" ? body.major.trim() : "";
    const facultyName = typeof body.faculty === "string" ? body.faculty.trim() : "";

    if (!full || !email) {
      return NextResponse.json(
        { ok: false, error: "FULLNAME_EMAIL_REQUIRED" },
        { status: 400 },
      );
    }

    const parts = full.split(/\s+/);
    const lastname = parts.length > 1 ? parts.pop()! : "";
    const firstname = parts.join(" ");

    // faculty / department (optional)
    let facRow: { id: string } | undefined;
    if (facultyName) {
      const fac = await db.select().from(faculty).where(eq(faculty.name, facultyName)).limit(1);
      facRow = fac[0];
      if (!facRow) {
        [facRow] = await db.insert(faculty).values({ name: facultyName, detail: "" }).returning();
      }
    }

    let deptRow: { id: string } | undefined;
    if (majorName) {
      const exist = await db.select().from(department).where(eq(department.name, majorName)).limit(1);
      let d = exist[0];
      if (!d) {
        if (!facRow) {
          const [g] = await db.insert(faculty).values({ name: "General", detail: "" }).returning();
          facRow = g;
        }
        [d] = await db.insert(department).values({
          name: majorName,
          detail: "",
          facultyId: facRow!.id,
        }).returning();
      }
      deptRow = d;
    }

    // ⚠️ อย่าใส่ฟิลด์สถานะที่ไม่มีในสคีมา
    const [created] = await db
      .insert(user)
      .values({
        email,
        firstname,
        lastname,
        departmentId: deptRow?.id ?? null,
        policyId: null,
      })
      .returning();

    return NextResponse.json({
      ok: true,
      user: {
        id: created.id,
        fullName: full,
        email,
        major: majorName,
        faculty: facultyName,
        year: 1,
        active: true,     // UI flag เท่านั้น
        studentId: "",
      } as UIUser,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
