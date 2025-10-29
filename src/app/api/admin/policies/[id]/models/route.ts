import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { model as modelTbl, policyModelMap as policyModelMapTbl } from "@/lib/schema";
import { and, eq, inArray, asc } from "drizzle-orm";

/* ---------------- helpers ---------------- */
function bad(msg: string, code = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status: code });
}

function normalizeIds(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v
      .map((x) => (x == null ? "" : String(x)))
      .map((s) => s.trim())
      .filter((s): s is string => s.length > 0);
  }
  if (typeof v === "string") {
    return v
      .split(",")
      .map((s) => s.trim())
      .filter((s): s is string => s.length > 0);
  }
  return [];
}

/* ===================== GET ===================== */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const policyId = id.trim();
    if (!policyId) return bad("policy id is required", 400);

    const rows = await db
      .select({
        id: policyModelMapTbl.modelId,    
        modelId: modelTbl.modelId,         
        name: modelTbl.name,
        provider: modelTbl.provider,
        description: modelTbl.description,
      })
      .from(policyModelMapTbl)
      .leftJoin(modelTbl, eq(modelTbl.id, policyModelMapTbl.modelId))
      .where(eq(policyModelMapTbl.policyId, policyId))
      .orderBy(asc(modelTbl.name));

    const models = rows
      .filter(r => !!r.id) 
      .map(r => ({
        id: r.id,                 
        modelId: r.modelId ?? "", 
        name: r.name ?? r.modelId ?? "",
        provider: r.provider ?? "Unknown",
        description: r.description ?? null,
      }));

    return NextResponse.json({ ok: true, policyId, models, count: models.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "INTERNAL";
    return bad(msg, 500);
  }
}

/* ===================== POST ===================== */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const policyId = id.trim();
    if (!policyId) return bad("policy id is required", 400);

    const url = new URL(req.url);
    const fromQuery = normalizeIds(url.searchParams.get("modelId"));
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const rec = body as Record<string, unknown>;
    const fromBody = [
      ...normalizeIds(rec.models),
      ...normalizeIds(rec['modelId']),
    ];

    const incomingUuids = Array.from(new Set([...fromQuery, ...fromBody]));
    if (incomingUuids.length === 0) return bad("modelId(s) required", 400);

    const existing = await db
      .select({ modelId: policyModelMapTbl.modelId })
      .from(policyModelMapTbl)
      .where(eq(policyModelMapTbl.policyId, policyId));

    const existsSet = new Set(existing.map((r) => r.modelId));
    const toAdd = incomingUuids.filter((u) => !existsSet.has(u));

    if (toAdd.length === 0) {
      return NextResponse.json({ ok: true, policyId, added: [], skipped: incomingUuids });
    }

    await db.insert(policyModelMapTbl).values(
      toAdd.map((uuid) => ({ policyId, modelId: uuid }))
    );

    return NextResponse.json({
      ok: true,
      policyId,
      added: toAdd,
      skipped: incomingUuids.filter((u) => existsSet.has(u)),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "INTERNAL";
    return bad(msg, 500);
  }
}

/* ===================== DELETE ===================== */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const policyId = id.trim();
    if (!policyId) return bad("policy id is required", 400);

    const url = new URL(req.url);
    const fromQuery = normalizeIds(url.searchParams.get("modelId"));
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const fromBody = normalizeIds(body.models);

    const targets = Array.from(new Set([...fromQuery, ...fromBody]));
    if (targets.length === 0) return bad("modelId(s) required", 400);

    const res = await db
      .delete(policyModelMapTbl)
      .where(
        and(
          eq(policyModelMapTbl.policyId, policyId),
          inArray(policyModelMapTbl.modelId, targets as readonly string[])
        )
      )
      .returning({ modelId: policyModelMapTbl.modelId });

    return NextResponse.json({ ok: true, policyId, removed: res.map((r) => r.modelId) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "INTERNAL";
    return bad(msg, 500);
  }
}
