"use client";
import * as React from "react";

export type UIPolicy = { id: string; name: string };
export type UIFaculty = { id: string; name: string };
export type UIMajor = { id: string; name: string; facultyId: string };

type Resp = {
  ok: boolean;
  policies: UIPolicy[];
  faculties: UIFaculty[];
  majors: UIMajor[];
  domains: string[];
};

export function useAdminOptions() {
  const [policies, setPolicies] = React.useState<UIPolicy[]>([]);
  const [faculties, setFaculties] = React.useState<UIFaculty[]>([]);
  const [majors, setMajors] = React.useState<UIMajor[]>([]);
  const [domains, setDomains] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/filter", { cache: "no-store" });
        const json: Partial<Resp> = await res.json();
        if (cancelled) return;

        setPolicies(Array.isArray(json.policies) ? json.policies : []);
        setFaculties(Array.isArray(json.faculties) ? json.faculties : []);
        setMajors(Array.isArray(json.majors) ? json.majors : []);
        setDomains(Array.isArray(json.domains) ? json.domains : []);
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { policies, faculties, majors, domains, loading, error };
}
