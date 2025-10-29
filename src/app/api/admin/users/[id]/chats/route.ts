import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chat } from "@/lib/schema";
import { and, eq, desc } from "drizzle-orm";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: userId } = await ctx.params;

    if (!userId) {
      return NextResponse.json({ ok: false, error: "MISSING_USER_ID" }, { status: 400 });
    }

    const items = await db
      .select({
        id: chat.id,
        userId: chat.userId,
        title: chat.title,
        visibility: chat.visibility,
        createdAt: chat.createdAt,
      })
      .from(chat)
      .where(and(eq(chat.userId, userId)))
      .orderBy(desc(chat.createdAt));

    return NextResponse.json({ ok: true, items });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "INTERNAL_ERROR";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
