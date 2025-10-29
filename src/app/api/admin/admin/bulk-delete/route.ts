// src/app/api/admin/admin/bulk-delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { admin as adminTbl } from "@/lib/schema";
import { inArray } from "drizzle-orm";

type Resp = {
  ok: boolean;
  deletedCount: number;
  deletedIds: string[];
  notFound: string[];
  error?: string;
};

type BulkDeleteBody = {
  ids: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function sanitizeIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  // map → string, trim, filter ค่าว่าง, unique
  const ids = raw
    .map((v) => String(v ?? "").trim())
    .filter((s): s is string => s.length > 0);
  return Array.from(new Set(ids));
}

/**
 * POST /api/admin/admin/bulk-delete
 * body: { ids: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const bodyUnknown: unknown = await req.json().catch(() => ({} as unknown));

    // ปลอดภัยจาก any: ตรวจว่าเป็น object และดึง field ids แบบ unknown ก่อน sanitize
    const ids: string[] = isRecord(bodyUnknown)
      ? sanitizeIds((bodyUnknown as BulkDeleteBody).ids)
      : [];

    if (ids.length === 0) {
      return NextResponse.json<Resp>(
        { ok: false, deletedCount: 0, deletedIds: [], notFound: [], error: "IDS_REQUIRED" },
        { status: 400 }
      );
    }

    // จำกัดครั้งละไม่เกิน 100
    if (ids.length > 100) {
      return NextResponse.json<Resp>(
        { ok: false, deletedCount: 0, deletedIds: [], notFound: [], error: "TOO_MANY_IDS" },
        { status: 400 }
      );
    }

    // ลบและคืน id ที่ถูกลบจริง
    const deleted = await db
      .delete(adminTbl)
      .where(inArray(adminTbl.id, ids))
      .returning({ id: adminTbl.id });

    const deletedIds: string[] = deleted.map((d) => String(d.id));
    const deletedSet = new Set(deletedIds);
    const notFound: string[] = ids.filter((id) => !deletedSet.has(id));

    return NextResponse.json<Resp>({
      ok: true,
      deletedCount: deletedIds.length,
      deletedIds,
      notFound,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "INTERNAL_ERROR";
    return NextResponse.json<Resp>(
      { ok: false, deletedCount: 0, deletedIds: [], notFound: [], error: msg },
      { status: 500 }
    );
  }
}
