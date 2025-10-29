import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ban } from "@/lib/schema";
import { inArray } from "drizzle-orm";

export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    if (!ids.length)
        return NextResponse.json({ ok: false, error: "EMPTY" }, { status: 400 });

    await db.delete(ban).where(inArray(ban.id, ids));
    return NextResponse.json({ ok: true, deleted: ids.length });
}
