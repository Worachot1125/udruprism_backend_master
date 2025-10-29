import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ban } from "@/lib/schema";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const userIds: string[] = Array.isArray(body.userIds) ? body.userIds : [];
  const groupId: string | null = body.groupId ?? null;
  const reason: string | null = body.reason ? String(body.reason) : null;
  const endAt: Date | null = body.endAt ? new Date(body.endAt) : null;

  if (!userIds.length)
    return NextResponse.json({ ok: false, error: "EMPTY" }, { status: 400 });

  const values = userIds.map((uid) => ({
    userId: uid,
    groupId,
    reason,
    endAt: endAt ?? null,
  }));

  const created = await db.insert(ban).values(values).returning();
  return NextResponse.json({ ok: true, created });
}
