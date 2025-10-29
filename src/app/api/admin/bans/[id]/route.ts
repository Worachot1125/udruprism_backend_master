import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ban } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;              
  await db.delete(ban).where(eq(ban.id, id));
  return NextResponse.json({ ok: true });
}
