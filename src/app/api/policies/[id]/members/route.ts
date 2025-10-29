// src/app/api/policies/[id]/members/route.ts
export const runtime = "nodejs";        // optional
export const dynamic = "force-dynamic"; // optional

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { and, eq, inArray } from "drizzle-orm";

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object";
}
function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x ?? "")).filter((s) => s.length > 0);
}

// ========= POST /api/policies/[id]/members =========
// เพิ่มสมาชิกหลายคนเข้า policy
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ✅ v15: params เป็น Promise
): Promise<Response> {
  try {
    const { id: policyId } = await params;

    const bodyUnknown: unknown = await req.json().catch(() => ({}));
    const userIds = isRecord(bodyUnknown) ? toStringArray(bodyUnknown.userIds) : [];

    if (userIds.length === 0) {
      return NextResponse.json({ ok: true, updated: 0 });
    }

    await db.update(user).set({ policyId }).where(inArray(user.id, userIds));

    return NextResponse.json({ ok: true, updated: userIds.length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// ========= DELETE /api/policies/[id]/members =========
// ถอดสมาชิกหลายคนออกจาก policy (เฉพาะที่อยู่ใน policy นั้น)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ✅ v15: params เป็น Promise
): Promise<Response> {
  try {
    const { id: policyId } = await params;

    const bodyUnknown: unknown = await req.json().catch(() => ({}));
    const userIds = isRecord(bodyUnknown) ? toStringArray(bodyUnknown.userIds) : [];

    if (userIds.length === 0) {
      return NextResponse.json({ ok: true, updated: 0 });
    }

    await db
      .update(user)
      .set({ policyId: null })
      .where(and(inArray(user.id, userIds), eq(user.policyId, policyId)));

    return NextResponse.json({ ok: true, updated: userIds.length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
