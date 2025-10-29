/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import * as React from "react";
import { usePagedUsers } from "./pagedUsersDB";

export type PreviewUser = { id: string; fullName: string; email: string };
export type UIPolicy = {
  id: string;
  name: string;
  detail: string | null;
  tokenLimit: number;
  defaultTokenLimit: number;
  defaultModel?: string | null;
  fileLimit: number;
  fileSize: number;
  share: boolean;
  memberCount: number;
  previewUsers: PreviewUser[];
  createdAt: string;
};

type ListResp = {
  ok: boolean;
  items: UIPolicy[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  error?: string;
};

export type UIUser = {
  id: string;
  fullName: string;
  email: string;
  policyId?: string | null;
  policyName?: string | null;
  major?: string;
  faculty?: string;
  year?: number;
};

type MembersResp = {
  ok: boolean;
  users?: Array<{ id: string; email: string; fullName: string }>;
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  error?: string;
};

export type UIModelOption = {
  id: string;
  modelId: string;
  name: string;
  provider: string;
  description?: string | null;
};

type AdminModelsResp = {
  ok: boolean;
  items: Array<{
    id: string;
    modelId: string;
    name: string;
    provider: string;
    description: string | null;
    is_active: boolean;
    createdAt: string;
  }>;
};

type PolicyModelsResp = {
  ok: boolean;
  policyId: string;
  models: UIModelOption[];
  count: number;
};

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const msg = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export function usePolicyDB() {
  /* ---------- policies ---------- */
  const [policies, setPolicies] = React.useState<UIPolicy[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(100);
  const [pageCount, setPageCount] = React.useState(1);
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchPolicies = React.useCallback(
    async (opts?: { page?: number; pageSize?: number; q?: string }) => {
      setLoading(true);
      setError(null);
      try {
        const _page = opts?.page ?? page;
        const _size = opts?.pageSize ?? pageSize;
        const _q = opts?.q ?? q;

        const url = new URL("/api/admin/policies", window.location.origin);
        url.searchParams.set("page", String(_page));
        url.searchParams.set("pageSize", String(_size));
        if ((_q ?? "").trim()) url.searchParams.set("q", _q.trim());

        const data = await j<ListResp>(await fetch(url.toString(), { cache: "no-store" }));
        if (!data.ok) throw new Error(data.error || "FETCH_FAILED");

        setPolicies(data.items ?? []);
        setTotal(data.total ?? 0);
        setPage(data.page ?? _page);
        setPageSize(data.pageSize ?? _size);
        setPageCount(data.pageCount ?? 1);
      } catch (e: any) {
        setError(e?.message ?? "FETCH_ERROR");
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, q]
  );

  const refresh = React.useCallback(async () => {
    await fetchPolicies();
  }, [fetchPolicies]);

  const createPolicy = React.useCallback(
    async (
      payload: Pick<UIPolicy, "name"> &
        Partial<Omit<UIPolicy, "id" | "memberCount" | "previewUsers" | "fileSize" | "createdAt">> & {
          fileSize?: number;
          defaultModel?: string | null;
          defaultTokenLimit?: number;
        }
    ): Promise<string> => {
      const json = await j<{ ok: boolean; id: string }>(
        await fetch("/api/admin/policies", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        })
      );
      if (!json?.id) throw new Error("CREATE_OK_BUT_NO_ID");
      return json.id;
    },
    []
  );

  const updatePolicy = React.useCallback(
    async (
      id: string,
      patch: Partial<
        Omit<UIPolicy, "id" | "memberCount" | "previewUsers" | "fileSize" | "createdAt">
      > & {
        fileSize?: number;
        defaultModel?: string | null;
        defaultTokenLimit?: number;
        members?: string[];
      }
    ) => {
      await j(
        await fetch("/api/admin/policies", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id, ...patch }),
        })
      );
    },
    []
  );

  /* ---------- users ---------- */
  const {
    users,
    total: usrTotal,
    page: usrPage,
    pageSize: usrPageSize,
    pageCount: usrPageCount,
    loading: usrLoading,
    error: usrError,
    setQuery: setUsersQuery,
    setPage: setUsersPage,
    refetch: refetchUsers,
  } = usePagedUsers({}, 100, 60_000, { autoInit: false, debounceMs: 200 }); 

  const loadUsersForPolicy = React.useCallback(
    async (query: Record<string, unknown> = {}) => {
      setUsersPage(1);
      setUsersQuery(query);
      await refetchUsers();
    },
    [setUsersPage, setUsersQuery, refetchUsers]
  );

  const resetUsersList = React.useCallback(() => {
    setUsersQuery({});
    setUsersPage(1);
  }, [setUsersQuery, setUsersPage]);

  /* ---------- members ---------- */
  const [members, setMembers] = React.useState<Array<{ id: string; email: string; fullName: string }>>([]);
  const [memPage, setMemPage] = React.useState(1);
  const [memPageSize, setMemPageSize] = React.useState(100);
  const [memPageCount, setMemPageCount] = React.useState(1);
  const [memTotal, setMemTotal] = React.useState(0);

  const fetchPolicyMembers = React.useCallback(
    async (policyId: string, opts?: { page?: number; pageSize?: number; q?: string }) => {
      const _p = Math.max(1, opts?.page ?? memPage);
      const _s = Math.max(1, opts?.pageSize ?? memPageSize);
      const _q = (opts?.q ?? "").trim();

      const url = new URL(`/api/admin/policies/${policyId}/members`, window.location.origin);
      url.searchParams.set("page", String(_p));
      url.searchParams.set("pageSize", String(_s));
      if (_q) url.searchParams.set("q", _q);

      const data = await j<MembersResp>(await fetch(url.toString(), { cache: "no-store" }));
      const list = Array.isArray(data.users) ? data.users : [];

      setMembers(list);
      setMemPage(data.page ?? _p);
      setMemPageSize(data.pageSize ?? _s);
      setMemPageCount(data.pageCount ?? 1);
      setMemTotal(data.total ?? list.length);
    },
    [memPage, memPageSize]
  );

  /* ---------- actions ---------- */
  const addMembersToPolicy = React.useCallback(async (policyId: string, userIds: string[]) => {
    await j(
      await fetch(`/api/admin/policies/${policyId}/members`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userIds }),
      })
    );
  }, []);

  const removeMemberFromPolicy = React.useCallback(async (policyId: string, userId: string) => {
    const url = new URL(`/api/admin/policies/${policyId}/members`, window.location.origin);
    url.searchParams.set("userId", userId);
    await j(await fetch(url.toString(), { method: "DELETE" }));
  }, []);

  const bulkRemoveMembersFromPolicy = React.useCallback(async (policyId: string, userIds: string[]) => {
    const res = await fetch(`/api/admin/policies/${policyId}/members/bulk-delete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userIds }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => `HTTP ${res.status}`);
      throw new Error(msg);
    }
    const json = await res.json().catch(() => ({}));
    if ((json as any)?.ok === false) throw new Error((json as any)?.error || "BULK_DELETE_FAILED");
  }, []);

  const [activeModels, setActiveModels] = React.useState<UIModelOption[]>([]);
  const [defaultAiModels, setDefaultAiModels] = React.useState<UIModelOption[]>([]);
  const [modelsLoading, setModelsLoading] = React.useState(false);
  const [modelsError, setModelsError] = React.useState<string | null>(null);

  const loadActiveModels = React.useCallback(async () => {
    setModelsError(null);
    setModelsLoading(true);
    try {
      const url = "/api/admin/models?all=1&active=1";
      const data = await j<AdminModelsResp>(await fetch(url, { cache: "no-store" }));
      if (!data.ok) throw new Error("FETCH_MODELS_FAILED");

      const opts: UIModelOption[] = (data.items ?? []).map((m) => ({
        id: m.id,
        modelId: m.modelId,
        name: m.name,
        provider: m.provider,
        description: m.description ?? null,
      }));
      setActiveModels(opts);
      return opts;
    } catch (e: any) {
      setModelsError(e?.message ?? "FETCH_MODELS_FAILED");
      throw e;
    } finally {
      setModelsLoading(false);
    }
  }, []);

  type AiModelsResp = {
    models: Array<{ id: string; name: string; provider: string; description: string | null }>;
  };
  const loadDefaultAiModels = React.useCallback(async () => {
    setModelsError(null);
    setModelsLoading(true);
    try {
      const url = "/api/admin/models/ai";
      const data = await j<AiModelsResp>(await fetch(url, { cache: "no-store" }));
      const opts: UIModelOption[] = (data.models ?? []).map((m) => ({
        id: m.id,
        modelId: m.id,
        name: m.name,
        provider: m.provider,
        description: m.description ?? null,
      }));
      setDefaultAiModels(opts);
      return opts;
    } catch (e: any) {
      setModelsError(e?.message ?? "FETCH_AI_MODELS_FAILED");
      throw e;
    } finally {
      setModelsLoading(false);
    }
  }, []);

  const loadAllModels = React.useCallback(async () => {
    await Promise.all([loadActiveModels(), loadDefaultAiModels()]);
  }, [loadActiveModels, loadDefaultAiModels]);

  /* ---------- policy models (by policy id) ---------- */
  const fetchPolicyModels = React.useCallback(async (policyId: string) => {
    const url = new URL(`/api/admin/policies/${policyId}/models`, window.location.origin);
    const data = await j<PolicyModelsResp>(await fetch(url.toString(), { cache: "no-store" }));
    if (!data.ok) throw new Error("FETCH_POLICY_MODELS_FAILED");
    return data.models;
  }, []);

  const addModelsToPolicy = React.useCallback(async (policyId: string, modelIds: string[]) => {
    await j(
      await fetch(`/api/admin/policies/${policyId}/models`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ models: modelIds }),
      })
    );
  }, []);

  const removeModelsFromPolicy = React.useCallback(async (policyId: string, modelIds: string[]) => {
    await j(
      await fetch(`/api/admin/policies/${policyId}/models`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ models: modelIds }),
      })
    );
  }, []);

  const deletePolicy = React.useCallback(async (id: string) => {
  try {
    const allMemberIds: string[] = [];
    let p = 1;
    let pageCount = 1;

    do {
      const url = new URL(`/api/admin/policies/${id}/members`, window.location.origin);
      url.searchParams.set("page", String(p));
      url.searchParams.set("pageSize", "100"); 
      const data = await j<MembersResp>(await fetch(url.toString(), { cache: "no-store" }));
      const list = Array.isArray(data.users) ? data.users : [];
      allMemberIds.push(...list.map(u => u.id));
      pageCount = data.pageCount ?? 1;
      p++;
    } while (p <= pageCount);

    if (allMemberIds.length > 0) {
      await bulkRemoveMembersFromPolicy(id, allMemberIds);
    }

    let modelIds: string[] = [];
    try {
      const models = await fetchPolicyModels(id);
      modelIds = (models ?? []).map(m => m.id ?? m.modelId).filter(Boolean);
    } catch {
      //------------------
    }

    if (modelIds.length > 0) {
      await removeModelsFromPolicy(id, modelIds);
    }

    const url = new URL("/api/admin/policies", window.location.origin);
    url.searchParams.set("id", id);
    await j(await fetch(url.toString(), { method: "DELETE" }));
  } catch (e: any) {
    throw new Error(e?.message ?? "DELETE_POLICY_FAILED");
  }
}, [bulkRemoveMembersFromPolicy, fetchPolicyModels, removeModelsFromPolicy]);


  return {
    /* policies */
    policies,
    total,
    page,
    pageSize,
    pageCount,
    q,
    loading,
    error,
    setPage,
    setPageSize,
    setQ,
    fetchPolicies,
    refresh,
    createPolicy,
    updatePolicy,
    deletePolicy,

    /* users */
    users,
    usrPage,
    usrPageSize,
    usrPageCount,
    usrTotal,
    usrLoading,
    usrError,
    setUsersPage,
    setUsersQuery,
    refetchUsers,       
    loadUsersForPolicy, 
    resetUsersList,    

    /* members */
    members,
    memPage,
    memPageSize,
    memPageCount,
    memTotal,
    fetchPolicyMembers,
    addMembersToPolicy,
    removeMemberFromPolicy,
    bulkRemoveMembersFromPolicy,

    /* models */
    activeModels,
    defaultAiModels,
    loadAllModels,
    fetchPolicyModels,
    addModelsToPolicy,
    removeModelsFromPolicy,

    modelsLoading,
    modelsError,
  };
}
