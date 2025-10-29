/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import * as React from "react";

/** ---------- UI types ---------- */
export type UIPolicy = { id: string; name: string };

export type UIUser = {
  id: string;
  fullName: string;
  email: string;
  year: number;
  active: boolean;
  studentId?: string;
  major?: string;
  faculty?: string;
  policy: string[];
};

export type UIBan = {
  id: string;
  userId: string | null;
  policyId: string | null;
  reason: string | null;
  startAt: string;
  endAt: string | null;
};

/** ---------- helpers ---------- */
async function j<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const msg = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(msg);
  }
  return res.json() as any;
}

const normalizeUser = (u: any): UIUser => ({
  id: String(u?.id ?? ""),
  fullName: String(u?.fullName ?? ""),
  email: String(u?.email ?? ""),
  year: Number.isFinite(u?.year) ? Number(u.year) : 1,
  active: Boolean(u?.active),
  studentId: u?.studentId ?? "",
  major: u?.major ?? "",
  faculty: u?.faculty ?? "",
  policy: Array.isArray(u?.policy)
    ? (u.policy as string[])
    : [],
});

const normalizePolicy = (p: any): UIPolicy => ({
  id: String(p?.id ?? ""),
  name: String(p?.name ?? ""),
});

const normalizeBan = (b: any): UIBan => ({
  id: String(b?.id ?? ""),
  userId: b?.userId ?? null,
  policyId: (b?.policyId ?? null),
  reason: b?.reason ?? null,
  startAt: new Date(b?.startAt ?? Date.now()).toISOString(),
  endAt: b?.endAt ? new Date(b.endAt).toISOString() : null,
});

function pickList<T = any>(raw: any, key = "bans"): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && Array.isArray(raw[key])) return raw[key] as T[];
  if (raw && Array.isArray(raw.data)) return raw.data as T[];
  if (raw && Array.isArray(raw.items)) return raw.items as T[];
  return [];
}

const eqPolicies = (a: UIPolicy[], b: UIPolicy[]) =>
  a.length === b.length && a.every((x, i) => x.id === b[i].id && x.name === b[i].name);

/** ---------- main hook ---------- */
export function useDB() {
  const [users, setUsers] = React.useState<UIUser[]>([]);
  const [policies, setPolicies] = React.useState<UIPolicy[]>([]);
  const [bans, setBans] = React.useState<UIBan[]>([]);

  const refresh = React.useCallback(async () => {
    const [uRaw, pRaw, bRaw] = await Promise.all([
      fetch("/api/admin/users", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
      fetch("/api/admin/policies", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
      fetch("/api/admin/bans", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
    ]);

    const nextUsers = Array.isArray(uRaw?.users) ? uRaw.users.map(normalizeUser) : [];

    const policiesFromUsers = Array.isArray(uRaw?.groups)
      ? uRaw.groups.map(normalizePolicy)
      : [];

    const nextPolicies =
      Array.isArray(pRaw?.policies) && pRaw.policies.length
        ? pRaw.policies.map(normalizePolicy)
        : policiesFromUsers;

    const nextBans = pickList<UIBan>(bRaw).map(normalizeBan);

    setUsers(nextUsers);
    setBans(nextBans);
    setPolicies((prev) => (eqPolicies(prev, nextPolicies) ? prev : nextPolicies));
  }, []);

  /* ---------- actions: bans ---------- */

  type BanManyPayload = {
    policyId?: string | null;
    reason?: string | null;
    endAt?: string | null;
  };

  const banMany = React.useCallback(
    async (userIds: string[], payload: BanManyPayload) => {
      if (!userIds.length) return;
      const res = await fetch("/api/admin/bans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds,
          policyId: payload.policyId ?? null,
          reason: payload.reason ?? null,
          endAt: payload.endAt ?? null,
        }),
      });

      const raw = await j<any>(res).catch(() => null);
      const created = pickList(raw);
      if (Array.isArray(created) && created.length) {
        const items = created.map(normalizeBan);
        setBans((s) => [...items, ...(Array.isArray(s) ? s : [])]);
      } else {
        await refresh();
      }
    },
    [refresh]
  );

  const banPolicy = React.useCallback(
    async (policyId: string, payload: { reason?: string; endAt?: string }) => {
      if (!policyId) return;
      const res = await fetch("/api/admin/bans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyId,
          reason: payload.reason ?? null,
          endAt: payload.endAt ?? null,
        }),
      });
      const raw = await j<any>(res).catch(() => null);
      const created = pickList(raw);
      if (Array.isArray(created) && created.length) {
        const items = created.map(normalizeBan);
        setBans((s) => [...items, ...(Array.isArray(s) ? s : [])]);
      } else {
        await refresh();
      }
    },
    [refresh]
  );

  const unban = React.useCallback(async (id: string) => {
    await j(await fetch(`/api/admin/bans?id=${encodeURIComponent(id)}`, { method: "DELETE" }));
    setBans((s) => (Array.isArray(s) ? s.filter((b) => b.id !== id) : []));
  }, []);

  const unbanMany = React.useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    await j(
      await fetch("/api/admin/bans", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
    );
    setBans((s) => (Array.isArray(s) ? s.filter((b) => !ids.includes(b.id)) : []));
  }, []);

  /* ---------- exports ---------- */
  return {
    users,
    policies,   
    bans,
    refresh,
    banMany,
    banPolicy,
    unban,
    unbanMany,
  };
}
