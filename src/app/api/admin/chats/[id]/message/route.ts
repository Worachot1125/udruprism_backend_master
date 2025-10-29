import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { message } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: chatId } = await ctx.params;

    if (!chatId) {
      return NextResponse.json({ ok: false, error: "MISSING_CHAT_ID" }, { status: 400 });
    }

    const items = await db
      .select({
        id: message.id,
        chatId: message.chatId,
        role: message.role,
        parts: message.parts,
        attachments: message.attachments,
        createdAt: message.createdAt,
      })
      .from(message)
      .where(eq(message.chatId, chatId))
      .orderBy(asc(message.createdAt));

    return NextResponse.json({ ok: true, items });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "INTERNAL_ERROR";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
