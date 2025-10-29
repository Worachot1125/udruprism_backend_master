// src/app/api/bans/[id]/route.ts
export const runtime = "nodejs";        // optional
export const dynamic = "force-dynamic"; // optional

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ban } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ✅ Next.js 15: params เป็น Promise
): Promise<Response> {
  const { id } = await params; // ✅ ต้อง await
  await db.delete(ban).where(eq(ban.id, id));
  return NextResponse.json({ ok: true });
}
