/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import * as React from "react";

export type UIUser = {
    id: string;
    fullName: string;
    email: string;
    major?: string;
    faculty?: string;
    year: number;
    active: boolean;
    studentId?: string;
    policies: string[];
};

export type UIPolicy = { id: string; name: string };

async function json<T>(r: Response): Promise<T> {
  const raw = await r.text(); 
  let data: any = null;
  try { data = raw ? JSON.parse(raw) : null; } catch {}

  if (!r.ok) {
    const msg =
      data?.error ||
      data?.message ||
      raw ||                 
      `HTTP ${r.status}`;    
    throw new Error(msg);
  }
  return (data ?? {}) as T;
}


export function useUsersDB(opts: { autoInit?: boolean } = {}) {
    const [users, setUsers] = React.useState<UIUser[]>([]);
    const [policies, setPolicies] = React.useState<UIPolicy[]>([]);
    const [domains, setDomains] = React.useState<string[]>([]);
    const { autoInit = true } = opts;

    const refresh = React.useCallback(async () => {
        const r = await fetch("/api/admin/users", { cache: "no-store" });
        const { users: u, groups: g, domains: d } = await json<{ ok: true; users: UIUser[]; groups: UIPolicy[]; domains: string[] }>(r);
        setUsers(u);
        setPolicies(g);
        setDomains(d);
    }, []);

    // React.useEffect(() => { refresh().catch(console.error); }, [refresh]);

    React.useEffect(() => {
        if (!autoInit) return;          
        refresh().catch(console.error);
    }, [refresh, autoInit]);

    const getAllEmailDomains = React.useCallback(() => domains, [domains]);

    const deleteUsersMany = React.useCallback(async (ids: string[]) => {
        if (!ids.length) return;
        await json(await fetch("/api/admin/users/bulk-delete", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids }),
        }));
        setUsers((s) => s.filter((u) => !ids.includes(u.id)));
    }, []);

    const createUser = React.useCallback(async (v: {
        fullName: string; studentId: string; email: string;
        major: string; faculty: string; year: number;
    }) => {
        const res = await fetch("/api/admin/users", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(v),
        });
        const { user } = await json<{ ok: true; user: UIUser }>(res);
        setUsers((s) => [user, ...s]);
    }, []);

    return {
        users,
        policies,
        getAllEmailDomains,
        deleteUsersMany,
        createUser,
    };
}

    export { usePagedUsers } from "@/lib/admin/pagedUsersDB";
