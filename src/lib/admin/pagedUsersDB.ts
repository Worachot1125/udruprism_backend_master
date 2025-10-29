// src/hooks/usePagedUsers.ts
"use client";
import * as React from "react";

/** ---------- Query params ---------- */
export type UsersQuery = {
  q?: string;
  policyId?: string;
  domain?: string;
  faculty?: string;
  major?: string;
  year?: number;

  excludeIds?: string[] | string;
  excludeBannedPolicies?: string[] | string;
  excludePolicyId?: string;
};

/** ---------- API shape ---------- */
export type APIUser = {
  id: string;
  prefix?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  fullName: string;
  email: string;
  major: string;
  faculty: string;
  year: number | null;
  active: boolean;
  policyId: string | null;
  policyName: string | null;
};

export type ApiResp = {
  users: APIUser[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

/** ---------- Utils ---------- */
function normalizeArr(v?: string[] | string): string[] {
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === "string") return v.split(",").map(s => s.trim()).filter(Boolean);
  return [];
}

function stableKey(obj: unknown) {
  const replacer = (_: string, value: unknown) =>
    Array.isArray(value) ? [...value].sort() : value;
  return JSON.stringify(obj ?? {}, replacer as unknown as (k: string, v: unknown) => unknown);
}

function buildParams(q: UsersQuery, page: number, pageSize: number) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));

  if (q.q) params.set("q", q.q);
  if (q.policyId) params.set("policyId", q.policyId);
  if (q.domain) params.set("domain", q.domain);
  if (q.faculty) params.set("faculty", q.faculty);

  /** ✅ NEW: ส่ง major/year ไป API */
  if (q.major) params.set("major", q.major);
  if (typeof q.year === "number" && !Number.isNaN(q.year)) {
    params.set("year", String(q.year));
  }

  if (q.excludePolicyId) params.set("excludePolicyId", q.excludePolicyId);

  const excludeIds = normalizeArr(q.excludeIds);
  if (excludeIds.length) params.set("excludeIds", excludeIds.join(","));

  const excludeBannedPolicies = normalizeArr(q.excludeBannedPolicies);
  if (excludeBannedPolicies.length) {
    params.set("excludeBannedPolicies", excludeBannedPolicies.join(","));
  }
  return params;
}

/** ---------- Hook (no prefetch) ---------- */
type Options = {
  autoInit?: boolean;   
  debounceMs?: number;  
};

type CacheEntry = { data: ApiResp; ts: number };

function isAbortError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "name" in err &&
         (err as { name?: unknown }).name === "AbortError";
}

export function usePagedUsers(
  initialQuery: UsersQuery = {},
  pageSize = 100,
  cacheMs = 60_000,
  options: Options = { autoInit: true, debounceMs: 0 }
) {
  const { autoInit = true, debounceMs = 0 } = options;

  const [query, setQueryState] = React.useState<UsersQuery>(initialQuery);
  const [page, setPageState] = React.useState(1);

  const [users, setUsers] = React.useState<APIUser[]>([]);
  const [total, setTotal] = React.useState(0);
  const [pageCount, setPageCount] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);

  const cacheRef = React.useRef<Map<string, CacheEntry>>(new Map());
  const abortRef = React.useRef<AbortController | null>(null);
  const debounceRef = React.useRef<number | null>(null);

  const fetchPage = React.useCallback(
    async (nextPage: number, nextQuery: UsersQuery) => {
      const normalized: UsersQuery = {
        ...nextQuery,
        excludeIds: normalizeArr(nextQuery.excludeIds),
        excludeBannedPolicies: normalizeArr(nextQuery.excludeBannedPolicies),
      };

      const key = stableKey({ nextPage, pageSize, q: normalized });
      const now = Date.now();

      const hit = cacheRef.current.get(key);
      if (hit && now - hit.ts < cacheMs) {
        const json = hit.data;
        setUsers(Array.isArray(json.users) ? json.users : []);
        setTotal(Number(json.total) || 0);
        setPageCount(Number(json.pageCount) || 1);
        setPageState(Number(json.page) || nextPage);
        setQueryState(normalized);
        setError(null);
        return;
      }

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const run = async () => {
        setLoading(true);
        setError(null);
        try {
          const params = buildParams(normalized, nextPage, pageSize);
          const res = await fetch(`/api/admin/users?${params.toString()}`, {
            cache: "no-store",
            signal: ac.signal,
          });
          if (!res.ok) {
            const text = await res.text().catch(() => `HTTP ${res.status}`);
            throw new Error(text);
          }
          const json = (await res.json()) as Partial<ApiResp>;

          const safeUsers = Array.isArray(json.users) ? (json.users as APIUser[]) : [];
          setUsers(safeUsers);
          setTotal(Number(json.total) || 0);
          setPageCount(Number(json.pageCount) || 1);
          setPageState(Number(json.page) || nextPage);
          setQueryState(normalized);

          cacheRef.current.set(key, {
            data: {
              users: safeUsers,
              total: Number(json.total) || 0,
              page: Number(json.page) || nextPage,
              pageSize,
              pageCount: Number(json.pageCount) || 1,
            },
            ts: Date.now(),
          });

        } catch (err: unknown) {
          if (isAbortError(err)) return;
          setError(err);
        } finally {
          setLoading(false);
        }
      };

      if (debounceMs > 0) {
        if (debounceRef.current) window.clearTimeout(debounceRef.current);
        debounceRef.current = window.setTimeout(run, debounceMs);
      } else {
        run();
      }
    },
    [cacheMs, pageSize, debounceMs]
  );

  const setQuery = React.useCallback(
    (q: UsersQuery) => fetchPage(1, q),
    [fetchPage]
  );

  const setPage = React.useCallback(
    (p: number) =>
      fetchPage(p, {
        ...query,
        excludeIds: normalizeArr(query.excludeIds),
        excludeBannedPolicies: normalizeArr(query.excludeBannedPolicies),
      }),
    [fetchPage, query]
  );

  const makeKey = React.useCallback(
    (p: number, q: UsersQuery) => stableKey({ nextPage: p, pageSize, q }),
    [pageSize]
  );

  const refetch = React.useCallback(() => {
    const qn = {
      ...query,
      excludeIds: normalizeArr(query.excludeIds),
      excludeBannedPolicies: normalizeArr(query.excludeBannedPolicies),
    };
    cacheRef.current.delete(makeKey(page, qn));
    return fetchPage(page, qn);
  }, [fetchPage, page, query, makeKey]);

  React.useEffect(() => {
    if (!autoInit) return;
    setQuery({
      ...initialQuery,
      excludeIds: normalizeArr(initialQuery.excludeIds),
      excludeBannedPolicies: normalizeArr(initialQuery.excludeBannedPolicies),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialQuery), pageSize, autoInit]);

  React.useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    users,
    total,
    page,
    pageSize,
    pageCount,
    loading,
    error,
    setQuery,
    setPage,
    refetch,
  };
}
