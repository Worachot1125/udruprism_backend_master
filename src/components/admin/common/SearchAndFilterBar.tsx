"use client";
import React from "react";
import { useAdminOptions } from "@/lib/admin/filter";

export default function SearchAndFilterBar({
  search,
  onSearch,
  policyId,
  onPolicyChange,
  domain,
  onDomainChange,
  faculty,
  onFacultyChange,
  major,
  onMajorChange,
  year,
  onYearChange,
  placeholder = "Search… (press Enter)",
  showPolicyFilter = true,
  showDomainFilter = true,
  showFacultyFilter = true,
  showMajorFilter = true,
  showYearFilter = true,
  extraActions,
  dense = false,
  bannedPolicyIds,
  disableBannedPolicies = true,
}: {
  search: string;
  onSearch: (v: string) => void;
  policyId?: string;
  onPolicyChange?: (id: string | undefined) => void;
  domain?: string;
  onDomainChange?: (d: string | undefined) => void;
  faculty?: string;
  onFacultyChange?: (f: string | undefined) => void;
  major?: string;
  onMajorChange?: (m: string | undefined) => void;
  year?: number | undefined;
  onYearChange?: (y: number | undefined) => void;
  placeholder?: string;
  showPolicyFilter?: boolean;
  showDomainFilter?: boolean;
  showFacultyFilter?: boolean;
  showMajorFilter?: boolean;
  showYearFilter?: boolean;
  extraActions?: React.ReactNode;
  dense?: boolean;
  bannedPolicyIds?: string[];
  disableBannedPolicies?: boolean;
}) {
  const { policies, faculties, majors, domains, loading } = useAdminOptions();
  const [text, setText] = React.useState(search ?? "");
  React.useEffect(() => {
    setText(search ?? "");
  }, [search]);

  const bannedSet = React.useMemo(
    () => new Set(bannedPolicyIds ?? []),
    [bannedPolicyIds],
  );

  const facultyNameById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const f of faculties) m.set(String(f.id), String(f.name));
    return m;
  }, [faculties]);

  const facultyOptions = React.useMemo(() => {
    return [...new Set(faculties.map((f) => String(f.name)))].sort((a, b) =>
      a.localeCompare(b, "th"),
    );
  }, [faculties]);

  const majorOptions = React.useMemo(() => {
    const names = new Set<string>();
    for (const m of majors) {
      const facName = facultyNameById.get(String(m.facultyId)) || "";
      if (faculty && facName !== faculty) continue;
      if (m.name) names.add(String(m.name));
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, "th"));
  }, [majors, faculty, facultyNameById]);

  const base = "h-9 rounded-lg border px-3 text-sm shrink-0 truncate";
  const inputCls = dense ? `${base} w-32 md:w-40` : `${base} w-48 md:w-56`;
  const selectSm = dense ? `${base} w-24 md:w-24` : `${base} w-25 md:w-28`;
  const selectMd = dense ? `${base} w-28 md:w-28` : `${base} w-36 md:w-40`;
  const selectLg = dense ? `${base} w-32 md:w-32` : `${base} w-40 md:w-44`;

  return (
    <div
      className={`flex items-center ${
        dense ? "gap-1.5" : "gap-2"
      } flex-nowrap overflow-x-hidden`}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)} 
        onKeyDown={(e) => {
          if (e.key === "Enter") onSearch(text);
        }}
        placeholder={placeholder}
        className={inputCls}
      />

      {showPolicyFilter && (
        <select
          className={selectMd}
          value={policyId ?? ""}
          onChange={(e) => onPolicyChange?.(e.target.value || undefined)}
          disabled={loading}
          aria-label="Filter by policy"
        >
          <option value="">All Policy</option>
          {policies.map((p) => {
            const isBanned = bannedSet.has(String(p.id));
            return (
              <option
                key={p.id}
                value={p.id}
                disabled={disableBannedPolicies && isBanned}
                title={isBanned ? "This policy is currently banned" : undefined}
              >
                {p.name}
                {isBanned ? " — Banned" : ""}
              </option>
            );
          })}
        </select>
      )}

      {showDomainFilter && (
        <select
          className={selectMd}
          value={domain ?? ""}
          onChange={(e) => onDomainChange?.(e.target.value || undefined)}
          disabled={loading}
          aria-label="Filter by email domain"
        >
          <option value="">All domains</option>
          {domains.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      )}

      {showFacultyFilter && (
        <select
          className={selectLg}
          value={faculty ?? ""}
          onChange={(e) => {
            onFacultyChange?.(e.target.value || undefined);
            onMajorChange?.(undefined);
          }}
          disabled={loading}
          aria-label="Filter by faculty"
        >
          <option value="">All Faculty</option>
          {facultyOptions.map((fname) => (
            <option key={fname} value={fname}>
              {fname}
            </option>
          ))}
        </select>
      )}

      {showMajorFilter && (
        <select
          className={selectLg}
          value={major ?? ""}
          onChange={(e) => onMajorChange?.(e.target.value || undefined)}
          disabled={(!faculty && majorOptions.length === 0) || loading}
          aria-label="Filter by major"
        >
          <option value="">All Major</option>
          {majorOptions.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      )}

      {showYearFilter && (
        <select
          className={selectSm}
          value={year ?? ""}
          onChange={(e) =>
            onYearChange?.(e.target.value ? Number(e.target.value) : undefined)
          }
          aria-label="Filter by year"
        >
          <option value="">Years</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((y) => (
            <option key={y} value={y}>
              {`${y}`}
            </option>
          ))}
        </select>
      )}

      <div className="ml-2 flex items-center gap-2 shrink-0">
        {extraActions}
      </div>
    </div>
  );
}
