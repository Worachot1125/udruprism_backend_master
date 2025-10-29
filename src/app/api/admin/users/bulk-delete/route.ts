import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user, ban } from "@/lib/schema";
import { inArray } from "drizzle-orm";

const uniq = (arr: string[]) => Array.from(new Set(arr.map(String)));
const chunk = <T,>(arr: T[], size: number) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );

export async function POST(req: Request) {
  const raw: unknown = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray((raw as { ids?: unknown })?.ids)
    ? uniq(((raw as { ids?: unknown }).ids as unknown[]).filter((x): x is string => typeof x === "string"))
    : [];

  if (ids.length === 0) {
    return NextResponse.json({ ok: false, error: "EMPTY" }, { status: 400 });
  }

  try {
    const batches = chunk(ids, 100);

    // 1) ลบ (Ban → userId)
    for (const b of batches) {
      if (b.length) await db.delete(ban).where(inArray(ban.userId, b));
    }

    // 2) ลบ (user)
    let deleted = 0;
    for (const b of batches) {
      if (b.length) {
        await db.delete(user).where(inArray(user.id, b));
        deleted += b.length;
      }
    }

    return NextResponse.json({ ok: true, deleted });
  } catch (e: unknown) {
    const msg =
      e instanceof Error
        ? e.message
        : typeof e === "object" && e !== null && "toString" in e
        ? String(e)
        : "DELETE_FAILED";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
