// src/app/api/bans/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ban } from "@/lib/schema";
import { inArray } from "drizzle-orm";

// ---- Types & helpers ----
type BanRow = typeof ban.$inferSelect;

function toUI(b: BanRow) {
  return {
    id: b.id,
    userId: b.userId,
    policyId: b.policyId ?? null, // 🔁 เดิม groupId → ใช้ policyId ตาม schema จริง
    reason: b.reason ?? null,
    startAt:
      (b.startAt as unknown as Date)?.toISOString?.() ??
      String(b.startAt),
    endAt: b.endAt
      ? ((b.endAt as unknown as Date)?.toISOString?.() ?? String(b.endAt))
      : null,
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object";
}
function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x ?? "")).filter((s) => s.length > 0);
}

// ========= GET /api/bans =========
export async function GET(): Promise<Response> {
  try {
    const rows = await db.select().from(ban);
    return NextResponse.json(rows.map(toUI));
  } catch (e) {
    console.error("GET /api/bans failed:", e);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// ========= POST /api/bans =========
// สร้างแบนหลาย user พร้อมกัน
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const bodyUnknown: unknown = await req.json().catch(() => ({}));
    if (!isRecord(bodyUnknown)) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }

    const ids = toStringArray(bodyUnknown.userIds);
    if (ids.length === 0) {
      return NextResponse.json({ error: "USER_IDS_REQUIRED" }, { status: 400 });
    }

    // 🔁 เดิม groupId → ใช้ policyId (string | null) ให้ตรง schema
    const policyId =
      typeof bodyUnknown.policyId === "string" && bodyUnknown.policyId.trim()
        ? bodyUnknown.policyId.trim()
        : null;

    const reason =
      typeof bodyUnknown.reason === "string" && bodyUnknown.reason.trim()
        ? bodyUnknown.reason.trim()
        : null;

    const endAtInput = bodyUnknown.endAt;
    const endAt =
      typeof endAtInput === "string" && endAtInput
        ? new Date(endAtInput)
        : null;

    const payload = ids.map((uid) => ({
      userId: uid,
      policyId, // 🔁
      reason,
      endAt,
    }));

    const rows = await db.insert(ban).values(payload).returning();
    return NextResponse.json(rows.map(toUI), { status: 201 });
  } catch (e) {
    console.error("POST /api/bans failed:", e);
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
}

// ========= DELETE /api/bans =========
// ลบ 1 รายการด้วย query ?id=... หรือหลายรายการด้วย body { ids: string[] }
export async function DELETE(req: NextRequest): Promise<Response> {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (id) {
      await db.delete(ban).where(inArray(ban.id, [id]));
      return NextResponse.json({ ok: true });
    }

    const bodyUnknown: unknown = await req.json().catch(() => ({}));
    const ids = isRecord(bodyUnknown) ? toStringArray(bodyUnknown.ids) : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "IDS_REQUIRED" }, { status: 400 });
    }

    await db.delete(ban).where(inArray(ban.id, ids));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/bans failed:", e);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
