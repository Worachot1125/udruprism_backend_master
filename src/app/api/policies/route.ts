// src/app/api/policies/route.ts
/* eslint-disable @typescript-eslint/no-unused-vars */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { policy, user } from "@/lib/schema";

type APIPolicy = {
  id: string;
  name: string;
  detail: string | null;
  token_limit: number;
  file_limit: number;
  file_size: number;  
  share: boolean;
  members: string[];
  updated_at?: string;
};

const num = (v: any, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const bool = (v: any, d = false) => {
  if (typeof v === "boolean") return v;
  if (v === 1 || v === "1") return true;
  if (v === 0 || v === "0") return false;
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  if (["true","t","yes","y"].includes(s)) return true;
  if (["false","f","no","n"].includes(s)) return false;
  return d;
};

export async function GET() {
  try {
    const policies = await db.select().from(policy);
    const users = await db.select({ id: user.id, policyId: user.policyId }).from(user);

    const memberMap = new Map<string, string[]>();
    for (const p of policies) memberMap.set(p.id, []);
    for (const u of users) if (u.policyId) memberMap.get(u.policyId)?.push(u.id);

    const out: APIPolicy[] = policies.map((p) => ({
      id: p.id,
      name: p.name,
      detail: p.detail ?? null,
      token_limit: num(p.tokenLimit, 0),
      file_limit: num(p.fileLimit, 0),
      file_size: num(p.fileSizeLimit, 0),
      share: Boolean(p.share),
      updated_at: new Date().toISOString(),
      members: memberMap.get(p.id) ?? [],
    }));

    return NextResponse.json({ ok: true, policies: out });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const name = String(body.name ?? "").trim();
    const detail: string | null =
      body.detail != null ? String(body.detail) :
      body.description != null ? String(body.description) : null;

    const tokenLimit =
      Number.isFinite(body.token_limit) ? Number(body.token_limit) :
      Number.isFinite(body.tokenLimit) ? Number(body.tokenLimit) : 0;

    const fileLimit =
      Number.isFinite(body.file_limit) ? Number(body.file_limit) :
      Number.isFinite(body.fileLimit) ? Number(body.fileLimit) : 0;

    const fileSizeLimit =
      Number.isFinite(body.file_size) ? Number(body.file_size) :
      Number.isFinite(body.fileSizeLimit) ? Number(body.fileSizeLimit) :
      Number.isFinite(body.fileSize) ? Number(body.fileSize) : 0;

    const share = body.share !== undefined ? bool(body.share, false) : false;

    if (!name) {
      return NextResponse.json({ ok: false, error: "NAME_REQUIRED" }, { status: 400 });
    }

    const payload = {
      name,
      detail,
      tokenLimit,
      fileLimit,
      fileSizeLimit, 
      share,
    } satisfies typeof policy.$inferInsert;

    const [p] = await db.insert(policy).values(payload).returning();

    const out: APIPolicy = {
      id: p.id,
      name: p.name,
      detail: p.detail ?? null,
      token_limit: num(p.tokenLimit, 0),
      file_limit: num(p.fileLimit, 0),
      file_size: num(p.fileSizeLimit, 0),
      share: Boolean(p.share),
      updated_at: new Date().toISOString(),
      members: [],
    };

    return NextResponse.json({ ok: true, policy: out }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
