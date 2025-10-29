// lib/admin/modelsDb.ts
"use client";
import * as React from "react";

export type UIModel = {
  id: string;
  modelId: string;
  name: string;
  provider: string;
  is_active: boolean;
  createdAt: string;
  description?: string | null;
};

type ListResp = {
  ok: boolean;
  items: UIModel[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object";
}

async function j<T>(r: Response): Promise<T> {
  const raw = await r.text();
  let d: unknown = null;
  try {
    d = raw ? JSON.parse(raw) : null;
  } catch {
    // ignore JSON parse error; we'll use raw text
  }

  if (!r.ok) {
    let message = raw || `HTTP ${r.status}`;
    if (isRecord(d) && typeof d.error === "string") {
      message = d.error;
    }
    throw new Error(message);
  }
  return (d ?? ({} as unknown)) as T;
}

function isAbortError(e: unknown): boolean {
  // Safari/Chrome/Firefox จะโยน DOMException ชื่อ "AbortError"
  if (typeof DOMException !== "undefined" && e instanceof DOMException) {
    return e.name === "AbortError";
  }
  // เผื่อบาง runtime ไม่ใช่ DOMException
  return isRecord(e) && e.name === "AbortError";
}

export function useModelsDB() {
  const [items, setItems] = React.useState<UIModel[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(50);
  const [pageCount, setPageCount] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [q, setQ] = React.useState("");

  // ---------- refs กันค่าเก่าจาก closure ----------
  const pageRef = React.useRef(page);
  const qRef = React.useRef(q);
  React.useEffect(() => {
    pageRef.current = page;
  }, [page]);
  React.useEffect(() => {
    qRef.current = q;
  }, [q]);

  // ---------- stale response guard + abort ----------
  const reqIdRef = React.useRef(0);
  const abortRef = React.useRef<AbortController | null>(null);

  const fetchList = React.useCallback(
    async (opts?: { page?: number; q?: string }) => {
      const _page = Math.max(1, opts?.page ?? pageRef.current);
      const _q = (opts?.q ?? qRef.current).trim();

      const myReqId = ++reqIdRef.current;

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const url = new URL("/api/admin/models", window.location.origin);
      url.searchParams.set("page", String(_page));
      url.searchParams.set("pageSize", String(pageSize));
      if (_q) url.searchParams.set("q", _q);

      setLoading(true);
      try {
        const data = await j<ListResp>(
          await fetch(url.toString(), { cache: "no-store", signal: ac.signal })
        );

        if (myReqId !== reqIdRef.current) return;

        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
        setPage(data.page ?? _page);
        setPageCount(data.pageCount ?? 1);
      } catch (e: unknown) {
        if (isAbortError(e)) return;
        throw e;
      } finally {
        if (myReqId === reqIdRef.current) setLoading(false);
      }
    },
    [pageSize]
  );

  const create = React.useCallback(async (v: Partial<UIModel>) => {
    const { item } = await j<{ ok: true; item: UIModel }>(
      await fetch("/api/admin/models", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(v),
      })
    );
    setItems((s) => [item, ...s]);
    setTotal((t) => t + 1);
  }, []);

  const update = React.useCallback(async (id: string, patch: Partial<UIModel>) => {
    const { item } = await j<{ ok: true; item: UIModel }>(
      await fetch("/api/admin/models", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      })
    );
    setItems((s) => s.map((x) => (x.id === id ? item : x)));
  }, []);

  const remove = React.useCallback(async (id: string) => {
    await j<{ ok: true }>(await fetch(`/api/admin/models?id=${id}`, { method: "DELETE" }));
    setItems((s) => s.filter((x) => x.id !== id));
    setTotal((t) => Math.max(0, t - 1));
  }, []);

  React.useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return {
    items,
    total,
    page,
    pageSize,
    pageCount,
    loading,
    q,
    setQ,
    fetchList,
    setPage,
    create,
    update,
    remove,
  };
}
