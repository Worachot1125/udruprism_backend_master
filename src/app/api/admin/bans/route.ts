import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ban, user as userTbl, policy as policyTbl } from "@/lib/schema";
import {
  and,
  eq,
  isNotNull,
  isNull,
  ilike,
  or,
  sql,
  desc,
  inArray,
  type SQL,
} from "drizzle-orm";

/* ========================= Types ========================= */

type BanRow = {
  id: string;
  userId: string | null;
  policyId: string | null;
  reason: string | null;
  startAt: Date | string;
  endAt: Date | string | null;
  userFullName: string | null;
  userEmail: string | null;
  policyName: string | null;
};

type BanUI = {
  id: string;
  userId: string | null;
  policyId: string | null;
  reason: string | null;
  startAt: string;
  endAt: string | null;
  user: { id: string; fullName: string; email: string } | null;
  policyName: string | null;
};

type PostBody = {
  policyId?: unknown;
  groupId?: unknown;
  userIds?: unknown;
  endAt?: unknown;
  reason?: unknown;
};

/* ========================= Utils ========================= */

const toISO = (d: Date | string | null | undefined): string | null => {
  if (d == null) return null;
  if (d instanceof Date) return d.toISOString();
  return String(d);
};

const toUI = (row: BanRow): BanUI => ({
  id: row.id,
  userId: row.userId ?? null,
  policyId: row.policyId ?? null,
  reason: row.reason ?? null,
  startAt: toISO(row.startAt) ?? String(row.startAt),
  endAt: toISO(row.endAt),
  user: row.userId
    ? { id: row.userId, fullName: row.userFullName ?? "", email: row.userEmail ?? "" }
    : null,
  policyName: row.policyName ?? null,
});

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

/* ========================= GET ========================= */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const kind = (url.searchParams.get("kind") ?? "all") as "user" | "policy" | "all";
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const pageSize = Math.max(1, Math.min(200, Number(url.searchParams.get("pageSize") ?? "100")));
    const q = (url.searchParams.get("q") ?? "").trim();
    const domain = (url.searchParams.get("domain") ?? "").trim().toLowerCase();
    const policyId = url.searchParams.get("policyId") ?? "";

    const whereClauses: SQL<unknown>[] = [];

    if (kind === "user") {
      whereClauses.push(isNotNull(ban.userId));
    } else if (kind === "policy") {
      whereClauses.push(isNull(ban.userId), isNotNull(ban.policyId));
    }

    if (policyId) whereClauses.push(eq(ban.policyId, policyId));

    let searchClause: SQL<unknown> | null = null;
    if (q.length > 0) {
      const clause =
        or(
          ilike(
            sql`coalesce(${userTbl.prefix} || ' ' || ${userTbl.firstname} || ' ' || ${userTbl.lastname}, '')`,
            `%${q}%`,
          ),
          ilike(userTbl.email, `%${q}%`),
          ilike(policyTbl.name, `%${q}%`),
          ilike(sql`coalesce(${ban.reason}, '')`, `%${q}%`),
        ) ?? null;
      searchClause = clause;
    }
    if (searchClause) whereClauses.push(searchClause);

    if (domain && kind === "user") {
      whereClauses.push(ilike(userTbl.email, `%${domain}`));
    }

    const whereCond = whereClauses.length ? and(...whereClauses) : undefined;

    const base = db
      .select({
        id: ban.id,
        userId: ban.userId,
        policyId: ban.policyId,
        reason: ban.reason,
        startAt: ban.startAt,
        endAt: ban.endAt,
        userFullName: sql<string | null>`coalesce(${userTbl.prefix} || ' ' || ${userTbl.firstname} || ' ' || ${userTbl.lastname}, ${userTbl.firstname} || ' ' || ${userTbl.lastname})`,
        userEmail: userTbl.email,
        policyName: policyTbl.name,
      })
      .from(ban)
      .leftJoin(userTbl, eq(userTbl.id, ban.userId))
      .leftJoin(policyTbl, eq(policyTbl.id, ban.policyId))
      .where(whereCond);

    const totalRows = await db
      .select({ c: sql<number>`count(*)` })
      .from(ban)
      .leftJoin(userTbl, eq(userTbl.id, ban.userId))
      .leftJoin(policyTbl, eq(policyTbl.id, ban.policyId))
      .where(whereCond);

    const total = Number(totalRows?.[0]?.c ?? 0);
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const offset = (page - 1) * pageSize;

    const items = (await base.orderBy(desc(ban.startAt)).limit(pageSize).offset(offset)) as BanRow[];

    return NextResponse.json({
      items: items.map(toUI),
      total,
      page,
      pageSize,
      pageCount,
    });
  } catch (e: unknown) {
    console.error("GET /api/admin/bans failed:", e);
    const msg = e instanceof Error ? e.message : "INTERNAL_ERROR";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/* ========================= POST ========================= */

export async function POST(req: Request) {
  try {
    const raw: unknown = await req.json().catch(() => ({}));
    const body = (raw ?? {}) as PostBody;

    const policyIdRaw = body.policyId ?? body.groupId ?? null;
    const policyId = typeof policyIdRaw === "string" ? policyIdRaw : null;

    const endAt =
      typeof body.endAt === "string" || body.endAt instanceof Date
        ? new Date(body.endAt as string | number | Date)
        : null;

    const userIds = isStringArray(body.userIds) ? body.userIds.filter(Boolean) : [];

    // 1) แบนหลายผู้ใช้
    if (userIds.length > 0) {
      const payload = userIds.map((uid) => ({
        userId: uid,
        policyId,
        reason: typeof body.reason === "string" ? body.reason : null,
        endAt,
      }));

      const rows = (await db
        .insert(ban)
        .values(payload)
        .returning({
          id: ban.id,
          userId: ban.userId,
          policyId: ban.policyId,
          reason: ban.reason,
          startAt: ban.startAt,
          endAt: ban.endAt,
        })) as BanRow[];

      return NextResponse.json(rows.map(toUI), { status: 201 });
    }

    // 2) แบน policy 
    if (policyId) {
      const rows = (await db
        .insert(ban)
        .values({
          userId: null,
          policyId,
          reason: typeof body.reason === "string" ? body.reason : null,
          endAt,
        })
        .returning({
          id: ban.id,
          userId: ban.userId,
          policyId: ban.policyId,
          reason: ban.reason,
          startAt: ban.startAt,
          endAt: ban.endAt,
        })) as BanRow[];

      return NextResponse.json(rows.map(toUI), { status: 201 });
    }

    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  } catch (e: unknown) {
    console.error("POST /api/bans failed:", e);
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
}

/* ========================= DELETE ========================= */

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (id) {
      await db.delete(ban).where(inArray(ban.id, [id]));
      return NextResponse.json({ ok: true });
    }

    const raw: unknown = await req.json().catch(() => ({}));
    const ids =
      (Array.isArray((raw as { ids?: unknown })?.ids) &&
        ((raw as { ids?: unknown }).ids as unknown[]).filter((x): x is string => typeof x === "string")) ||
      [];

    if (ids.length === 0) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }

    await db.delete(ban).where(inArray(ban.id, ids));
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("DELETE /api/bans failed:", e);
    const msg = e instanceof Error ? e.message : "INTERNAL_ERROR";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
