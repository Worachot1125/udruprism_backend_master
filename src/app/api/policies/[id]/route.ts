// src/app/api/policies/[id]/route.ts
export const runtime = "nodejs";        // optional
export const dynamic = "force-dynamic"; // optional

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { policy, user } from "@/lib/schema";
import { eq } from "drizzle-orm";

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object";
}

function parseTokenLimit(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

// ========= PATCH /api/policies/[id] =========
// อัปเดต tokenLimit ของ policy
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ✅ v15: params เป็น Promise
): Promise<Response> {
  try {
    const { id } = await params;

    const bodyUnknown: unknown = await req.json().catch(() => ({}));
    const tokenLimit = isRecord(bodyUnknown)
      ? parseTokenLimit(bodyUnknown.tokenLimit)
      : undefined;

    if (typeof tokenLimit !== "number") {
      return NextResponse.json(
        { ok: false, error: "TOKEN_LIMIT_REQUIRED" },
        { status: 400 }
      );
    }

    await db.update(policy).set({ tokenLimit }).where(eq(policy.id, id));
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// ========= DELETE /api/policies/[id] =========
// ลบ policy และเคลียร์ FK จาก user ก่อน
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ✅ v15: params เป็น Promise
): Promise<Response> {
  try {
    const { id } = await params;

    // เคลียร์ FK: users ที่อ้าง policyId นี้
    await db.update(user).set({ policyId: null }).where(eq(user.policyId, id));
    await db.delete(policy).where(eq(policy.id, id));

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
