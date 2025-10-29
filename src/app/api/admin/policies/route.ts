// app/api/admin/policies/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { policy as policyTbl, user as userTbl } from "@/lib/schema";
import { asc, desc, count, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";

/** ---- helpers ---- */
function toInt(v: string | null, def: number) {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}
function buildFullName(prefix?: string | null, first?: string | null, last?: string | null) {
  return [prefix, first, last].map((x) => (x ?? "").trim()).filter(Boolean).join(" ");
}

/** ===================== GET: list with pagination & previewUsers ===================== */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, toInt(searchParams.get("page"), 1));
    const pageSize = Math.min(100, toInt(searchParams.get("pageSize"), 50)); // hard-cap
    const q = (searchParams.get("q") ?? "").trim();

    const whereClause: SQL<unknown> | undefined = q
      ? or(ilike(policyTbl.name, `%${q}%`), ilike(policyTbl.detail, `%${q}%`))
      : undefined;

    // --- total count ---
    const [{ value: total }] = await db.select({ value: count() }).from(policyTbl).where(whereClause);

    const pageCount = Math.max(1, Math.ceil((Number(total) || 0) / pageSize));
    const offset = (page - 1) * pageSize;

    // --- page items
    const basePolicies = await db
      .select({
        id: policyTbl.id,
        name: policyTbl.name,
        detail: policyTbl.detail,
        tokenLimit: policyTbl.tokenLimit,
        defaultTokenLimit: policyTbl.defaultTokenLimit,
        defaultModel: policyTbl.defaultModel,
        fileLimit: policyTbl.fileLimit,
        fileSize: policyTbl.fileSizeLimit,
        share: policyTbl.share,
        createdAt: policyTbl.createdAt,
      })
      .from(policyTbl)
      .where(whereClause)
      .orderBy(desc(policyTbl.createdAt), asc(policyTbl.name))
      .limit(pageSize)
      .offset(offset);

    if (basePolicies.length === 0) {
      return NextResponse.json({
        ok: true,
        items: [],
        total: Number(total) || 0,
        page,
        pageSize,
        pageCount,
      });
    }

    const ids = basePolicies.map((p) => p.id);

    const memberCounts = await db
      .select({
        policyId: userTbl.policyId,
        cnt: count(userTbl.id),
      })
      .from(userTbl)
      .where(inArray(userTbl.policyId, ids))
      .groupBy(userTbl.policyId);

    const countMap = new Map<string, number>(memberCounts.map((r) => [String(r.policyId), Number(r.cnt)]));

    if (ids.length === 0) {
      return NextResponse.json({
        ok: true,
        items: basePolicies.map((p) => ({
          ...p,
          memberCount: 0,
          previewUsers: [],
        })),
        total: Number(total) || 0,
        page,
        pageSize,
        pageCount,
      });
    }

    const res = await db.execute<{
      id: string | number;
      email: string | null;
      prefix: string | null;
      firstname: string | null;
      lastname: string | null;
      policyId: string | number;
    }>(sql`
  SELECT u.id, u.email, u.prefix, u.firstname, u.lastname, u."policyId"
  FROM (
    SELECT
      id, email, prefix, firstname, lastname, "policyId",
      ROW_NUMBER() OVER (
        PARTITION BY "policyId"
        ORDER BY firstname NULLS LAST, lastname NULLS LAST
      ) AS rn
    FROM "User"
    WHERE "policyId" IN (${sql.join(ids.map((id) => sql`${id}`), sql`,`)})
  ) u
  WHERE u.rn <= 5
`);

    const previewRows = res.rows;

    const previewsByPolicy = new Map<string, Array<{ id: string; fullName: string; email: string }>>();

    for (const r of previewRows) {
      const pid = String(r.policyId);
      const arr = previewsByPolicy.get(pid) ?? [];
      arr.push({
        id: String(r.id),
        fullName: buildFullName(
          r.prefix == null ? null : String(r.prefix),
          r.firstname == null ? null : String(r.firstname),
          r.lastname == null ? null : String(r.lastname),
        ),
        email: String(r.email ?? ""),
      });
      previewsByPolicy.set(pid, arr);
    }

    const items = basePolicies.map((p) => ({
      ...p,
      memberCount: countMap.get(String(p.id)) ?? 0,
      previewUsers: previewsByPolicy.get(String(p.id)) ?? [],
    }));

    return NextResponse.json({
      ok: true,
      items,
      total: Number(total) || 0,
      page,
      pageSize,
      pageCount,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "INTERNAL_ERROR";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** ===================== POST: create policy ===================== */
export async function POST(req: NextRequest) {
  try {
    const raw: unknown = await req.json().catch(() => ({}));
    const body = (raw ?? {}) as Record<string, unknown>;

    const name = typeof body.name === "string" ? body.name : "";
    if (!name.trim()) return NextResponse.json({ ok: false, error: "NAME_REQUIRED" }, { status: 400 });

    const detail = typeof body.detail === "string" ? body.detail : null;
    const tokenLimit = typeof body.tokenLimit === "number" ? body.tokenLimit : 0;
    const fileLimit = typeof body.fileLimit === "number" ? body.fileLimit : 0;
    const fileSizeLimit = typeof body.fileSize === "number" ? body.fileSize : 0;
    const share = typeof body.share === "boolean" ? body.share : false;

    const defaultTokenLimit =
      typeof body.defaultTokenLimit === "number" ? body.defaultTokenLimit : 0;
    const defaultModel =
      typeof body.defaultModel === "string" && body.defaultModel.trim()
        ? body.defaultModel.trim()
        : undefined;

    const [inserted] = await db.insert(policyTbl).values({
      name,
      detail,
      tokenLimit,
      defaultTokenLimit,
      defaultModel,
      fileLimit,
      fileSizeLimit,
      share,
      createdAt: new Date(),
    }).returning({
      id: policyTbl.id,
      createdAt: policyTbl.createdAt,
    });

    return NextResponse.json({ ok: true, id: inserted.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "INTERNAL_ERROR";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** ===================== PATCH: update by id ===================== */
export async function PATCH(req: NextRequest) {
  try {
    const raw: unknown = await req.json().catch(() => ({}));
    const body = (raw ?? {}) as Record<string, unknown>;
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ ok: false, error: "MISSING_ID" }, { status: 400 });

    const entries: Array<[string, unknown]> = [];
    if (typeof body.name === "string") entries.push(["name", body.name]);
    if (typeof body.detail === "string" || body.detail === null) entries.push(["detail", body.detail]);
    if (typeof body.tokenLimit === "number") entries.push(["tokenLimit", body.tokenLimit]);
    if (typeof body.fileLimit === "number") entries.push(["fileLimit", body.fileLimit]);
    if (typeof body.fileSize === "number") entries.push(["fileSizeLimit", body.fileSize]);
    if (typeof body.share === "boolean") entries.push(["share", body.share]);
    if (typeof body.defaultTokenLimit === "number")
      entries.push(["defaultTokenLimit", body.defaultTokenLimit]);
    if (typeof body.defaultModel === "string")
      entries.push(["defaultModel", body.defaultModel]);

    const update = Object.fromEntries(entries) as Partial<{
      name: string;
      detail: string | null;
      tokenLimit: number;
      defaultTokenLimit: number;
      defaultModel: string;
      fileLimit: number;
      fileSizeLimit: number;
      share: boolean;
    }>;

    await db.update(policyTbl).set(update).where(eq(policyTbl.id, id));
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "INTERNAL_ERROR";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** ===================== DELETE: delete by id ===================== */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get("id") ?? "");
    if (!id) return NextResponse.json({ ok: false, error: "MISSING_ID" }, { status: 400 });

    await db.delete(policyTbl).where(eq(policyTbl.id, id));
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "INTERNAL_ERROR";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
