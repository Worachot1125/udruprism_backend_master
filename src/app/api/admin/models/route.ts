// app/api/admin/models/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { model as modelTbl } from "@/lib/schema";
import { asc, desc, and, eq, ilike, or, sql, type SQL } from "drizzle-orm";

/* ---------------- helpers ---------------- */
function toInt(v: string | null, d: number, max?: number) {
  const n = parseInt(String(v ?? ""), 10);
  const ok = Number.isFinite(n) && n > 0 ? n : d;
  return max ? Math.min(ok, max) : ok;
}
function bad(msg: string, code = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status: code });
}
function parseDate(v: unknown): Date | null {
  if (v == null) return null;
  const d = new Date(v as string);
  return Number.isFinite(d.getTime()) ? d : null;
}

/* ===================== GET ===================== */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, toInt(searchParams.get("page"), 1));
    const pageSize = toInt(searchParams.get("pageSize"), 50, 50);
    const q = (searchParams.get("q") ?? "").trim();
    const wantAll = ["1", "true"].includes((searchParams.get("all") ?? "").toLowerCase());
    const activeOnly = ["1", "true"].includes((searchParams.get("active") ?? "").toLowerCase());

    const whereQ: SQL<unknown> | undefined = q
      ? or(
        ilike(modelTbl.name, `%${q}%`),
        ilike(modelTbl.provider, `%${q}%`),
        ilike(modelTbl.modelId, `%${q}%`)
      )
      : undefined;

    const where =
      activeOnly
        ? (whereQ ? and(whereQ, eq(modelTbl.is_active, true)) : eq(modelTbl.is_active, true))
        : whereQ;

    if (wantAll) {
      const rows = await db
        .select({
          id: modelTbl.id,
          modelId: modelTbl.modelId,
          name: modelTbl.name,
          provider: modelTbl.provider,
        })
        .from(modelTbl)
        .where(where)
        .orderBy(desc(modelTbl.createdAt), asc(modelTbl.name));

      return NextResponse.json({
        ok: true,
        items: rows,
      });
    }

    const rows = await db
      .select({
        id: modelTbl.id,
        modelId: modelTbl.modelId,
        name: modelTbl.name,
        provider: modelTbl.provider,
        description: modelTbl.description,
        is_active: modelTbl.is_active,
        createdAt: modelTbl.createdAt,
        total: sql<number>`count(*) over()`,
      })
      .from(modelTbl)
      .where(where)
      .orderBy(desc(modelTbl.createdAt), asc(modelTbl.name))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const total = rows[0]?.total ?? 0;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const items = rows.map(({ total, ...rest }) => rest);

    return NextResponse.json({ ok: true, items, total, page, pageSize, pageCount });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "INTERNAL";
    return bad(msg, 500);
  }
}

/* ===================== POST: create ===================== */
export async function POST(req: NextRequest) {
  try {
    const bodyUnknown: unknown = await req.json().catch(() => ({}));
    const body = bodyUnknown as Record<string, unknown>;

    const modelId = typeof body.modelId === "string" ? body.modelId : "";
    const name = typeof body.name === "string" ? body.name : "";
    const provider = typeof body.provider === "string" ? body.provider : "";
    const description =
      typeof body.description === "string" ? body.description : null;

    const createdAtISO =
      parseDate(body.createdAt)?.toISOString() ?? new Date().toISOString();

    const is_active =
      typeof body.is_active === "boolean" ? body.is_active : true;

    if (!modelId || !name || !provider) {
      return bad("modelId, name, provider are required");
    }

    const [row] = await db
      .insert(modelTbl)
      .values({
        modelId,
        name,
        provider,
        description,
        is_active,
        createdAt: createdAtISO,
      })
      .returning();

    return NextResponse.json({ ok: true, item: row });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "INTERNAL";
    return bad(msg, 500);
  }
}

/* ===================== PATCH: update by id ===================== */
export async function PATCH(req: NextRequest) {
  try {
    const bodyUnknown: unknown = await req.json().catch(() => ({}));
    const body = bodyUnknown as Record<string, unknown>;

    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return bad("id is required");

    const entries: Array<[string, unknown]> = [];

    if (body.modelId != null) entries.push(["modelId", String(body.modelId)]);
    if (body.name != null) entries.push(["name", String(body.name)]);
    if (body.provider != null) entries.push(["provider", String(body.provider)]);
    if (body.description != null)
      entries.push(["description", body.description === null ? null : String(body.description)]);
    if (typeof body.is_active === "boolean")
      entries.push(["is_active", body.is_active]);
    if (body.createdAt != null) {
      const d = parseDate(body.createdAt);
      if (!d) return bad("createdAt invalid");
      entries.push(["createdAt", d.toISOString()]);
    }

    const patch = Object.fromEntries(entries) as Partial<{
      modelId: string;
      name: string;
      provider: string;
      description: string | null;
      is_active: boolean;
      createdAt: string;
    }>;

    const [row] = await db
      .update(modelTbl)
      .set(patch)
      .where(eq(modelTbl.id, id))
      .returning();

    if (!row) return bad("not_found", 404);
    return NextResponse.json({ ok: true, item: row });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "INTERNAL";
    return bad(msg, 500);
  }
}

/* ===================== DELETE: /api/admin/models?id=uuid ===================== */
export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return bad("id is required");
    const [row] = await db.delete(modelTbl).where(eq(modelTbl.id, id)).returning();
    if (!row) return bad("not_found", 404);
    return NextResponse.json({ ok: true, id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "INTERNAL";
    return bad(msg, 500);
  }
}
