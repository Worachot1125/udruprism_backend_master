/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { and, eq, inArray } from "drizzle-orm";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }  
) {
  try {
    const { id: policyId } = await params;         
    const body: any = await req.json().catch(() => ({}));
    const userIds: string[] = Array.isArray(body?.userIds) ? body.userIds : [];

    if (!policyId || userIds.length === 0) {
      return NextResponse.json({ ok: true, affected: 0 });
    }

    const updated = await db
      .update(user)
      .set({ policyId: null })
      .where(and(eq(user.policyId, policyId), inArray(user.id, userIds)))
      .returning({ id: user.id });

    return NextResponse.json({ ok: true, affected: updated.length });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
