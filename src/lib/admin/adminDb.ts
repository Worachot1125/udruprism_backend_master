// src/lib/admin/adminDb.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";

/* ========= Types ========= */
export type UIAdmin = {
  id: string;
  email: string;
  prefix?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  department?: string | null;
};

export type ListResp = {
  ok: boolean;
  items: UIAdmin[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  error?: string;
};

export type BulkDeleteResp = {
  ok: boolean;
  deletedCount: number;
  deletedIds: string[];
  notFound: string[];
  error?: string;
};

/* ================= helpers ================= */
async function json<T>(r: Response): Promise<T> {
  const raw = await r.text();
  let data: any = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {}
  if (!r.ok) {
    const msg = data?.error || data?.message || raw || `HTTP ${r.status}`;
    throw new Error(msg);
  }
  return (data ?? {}) as T;
}

function qs(params: Record<string, string | number | undefined>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}

/* ================= Plain methods ================= */
const BASE = "/api/admin/admin";

export async function getAdmins(params: {
  page?: number;
  pageSize?: number;
  q?: string;
} = {}): Promise<ListResp> {
  const url = `${BASE}${qs(params)}`;
  return json<ListResp>(await fetch(url, { cache: "no-store" }));
}

export async function createAdmin(input: {
  email: string;
  prefix?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  department?: string | null;
}): Promise<{ ok: true; id: string }> {
  const r = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return json<{ ok: true; id: string }>(r);
}

export async function updateAdmin(input: {
  id: string;
  email?: string;
  prefix?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  department?: string | null;
}): Promise<{ ok: true }> {
  const r = await fetch(BASE, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return json<{ ok: true }>(r);
}

export async function deleteAdmin(id: string): Promise<{ ok: true }> {
  const r = await fetch(`${BASE}${qs({ id })}`, { method: "DELETE" });
  return json<{ ok: true }>(r);
}

export async function deleteAdminsMany(ids: string[]): Promise<BulkDeleteResp> {
  const r = await fetch(`${BASE}/bulk-delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  return json<BulkDeleteResp>(r);
}

/* ================= Hook ================= */
export function useAdminsDB(opts: { autoInit?: boolean; pageSize?: number; searchDebounceMs?: number } = {}) {
  const { autoInit = true, pageSize = 20, searchDebounceMs = 250 } = opts;

  const [items, setItems] = React.useState<UIAdmin[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [q, setQ] = React.useState("");

  const pageCount = Math.max(1, Math.ceil((Number(total) || 0) / pageSize));

  const refresh = React.useCallback(
    async (p = page, keyword = q) => {
      const res = await getAdmins({ page: p, pageSize, q: keyword });
      setItems(res.items);
      setTotal(res.total);
      setPage(res.page); 
    },
    [page, pageSize, q],
  );

  React.useEffect(() => {
    if (!autoInit) return;
    refresh().catch(console.error);
  }, [autoInit, refresh]);

  React.useEffect(() => {
    if (!autoInit) return;
    const handle = setTimeout(() => {
      refresh(page, q).catch(console.error);
    }, searchDebounceMs);
    return () => clearTimeout(handle);
  }, [autoInit, page, q, refresh, searchDebounceMs]);

  const create = React.useCallback(
    async (v: {
      email: string;
      prefix?: string | null;
      firstname?: string | null;
      lastname?: string | null;
      department?: string | null;
    }) => {
      await createAdmin(v);
      await refresh(1, q);
    },
    [refresh, q],
  );

  const update = React.useCallback(
    async (v: {
      id: string;
      email?: string;
      prefix?: string | null;
      firstname?: string | null;
      lastname?: string | null;
      department?: string | null;
    }) => {
      await updateAdmin(v);
      // optimistic update; 
      setItems((s) => s.map((it) => (it.id === v.id ? { ...it, ...v } : it)));
    },
    [],
  );

  const remove = React.useCallback(async (id: string) => {
    await deleteAdmin(id);
    setItems((s) => s.filter((it) => it.id !== id));
    setTotal((t) => Math.max(0, t - 1));
  }, []);

  const removeMany = React.useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    await deleteAdminsMany(ids);
    setItems((s) => s.filter((it) => !ids.includes(it.id)));
    setTotal((t) => Math.max(0, t - ids.length));
  }, []);

  return {
    items,
    total,
    page,
    pageSize,
    q,
    pageCount,
    setPage,
    setQ,
    refresh,
    create,
    update,
    remove,
    removeMany,
  };
}
