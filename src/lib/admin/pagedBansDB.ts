"use client";
import * as React from "react";

export type BansQuery = {
  kind: "user" | "policy";   
  q?: string;
  domain?: string;
  policyId?: string;
};

export type UIBanItem = {
  id: string;
  userId: string | null;
  policyId: string | null;
  reason: string | null;
  startAt: string;
  endAt: string | null;
  user: { id: string; fullName: string; email: string } | null; 
  policyName: string | null;                                     
};

export type ApiResp = {
  items: UIBanItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

function buildParams(q: BansQuery, page: number, pageSize: number) {
  const p = new URLSearchParams();
  p.set("kind", q.kind);
  p.set("page", String(page));
  p.set("pageSize", String(pageSize));
  if (q.q) p.set("q", q.q);
  if (q.domain) p.set("domain", q.domain);
  if (q.policyId) p.set("policyId", q.policyId);
  return p.toString();
}

export function usePagedBans(initial: BansQuery, pageSize = 50) {
  const [query, setQuery] = React.useState<BansQuery>(initial);
  const [page, setPage] = React.useState(1);
  const [items, setItems] = React.useState<UIBanItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [pageCount, setPageCount] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);

  const fetchNow = React.useCallback(async (p: number, q: BansQuery) => {
    setLoading(true);
    setError(null);
    try {
      const qs = buildParams(q, p, pageSize);
      const res = await fetch(`/api/admin/bans?${qs}`, { cache: "no-store" });
      const json = (await res.json()) as ApiResp;
      setItems(Array.isArray(json.items) ? json.items : []);
      setTotal(Number(json.total) || 0);
      setPage(Number(json.page) || p);
      setPageCount(Number(json.pageCount) || 1);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  const setQueryAndFetch = React.useCallback((q: BansQuery) => {
    setQuery(q);
    fetchNow(1, q);
  }, [fetchNow]);

  const setPageAndFetch = React.useCallback((p: number) => {
    fetchNow(p, query);
  }, [fetchNow, query]);

  const refetch = React.useCallback(() => fetchNow(page, query), [fetchNow, page, query]);

  React.useEffect(() => { fetchNow(1, initial); }, [fetchNow, initial]);

  return {
    items, total, page, pageSize, pageCount, loading, error,
    setQuery: setQueryAndFetch,
    setPage: setPageAndFetch,
    refetch,
  };
}
