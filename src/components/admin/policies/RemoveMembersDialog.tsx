/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/admin/groups/RemoveMembersDialog.tsx
"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";
import { VirtualTable } from "@/components/admin/common/VirtualTable";
import SearchAndFilterBar from "@/components/admin/common/SearchAndFilterBar";
import { usePolicyDB } from "@/lib/admin/policyDB";

type PolicyBrief = { id: string; name: string };

type RawMember = {
  id: string | number;
  fullName?: string;
  name?: string;
  email?: string;
  faculty?: string;
  fac?: string;
  major?: string;
  department?: string;
  year?: number | string;
  classYear?: number | string;
  policyName?: string | null;
};

export default function RemoveMembersDialog({
  open,
  onClose,
  policy,
  db,
}: {
  open: boolean;
  onClose: () => void;
  policy: PolicyBrief | null;
  db: ReturnType<typeof usePolicyDB>;
}) {
  // =============== UI states ===============
  const [sel, setSel] = React.useState<Record<string, boolean>>({});
  const [saving, setSaving] = React.useState(false);

  const [search, setSearch] = React.useState("");
  const [domain, setDomain] = React.useState<string | undefined>(undefined);
  const [faculty, setFaculty] = React.useState<string | undefined>(undefined);
  const [major, setMajor] = React.useState<string | undefined>(undefined);
  const [year, setYear] = React.useState<number | string | undefined>(undefined);

  const resetFilters = React.useCallback(() => {
    setSearch("");
    setDomain(undefined);
    setFaculty(undefined);
    setMajor(undefined);
    setYear(undefined);
    setSel({});
  }, []);

  // ปิด modal → ล้างสถานะภายใน
  const handleClose = () => {
    resetFilters();
    onClose();
  };

  // เมื่อเปิด/ปิด modal
  React.useEffect(() => {
    if (!open) resetFilters();
  }, [open, resetFilters]);

  // โหลดสมาชิกของ policy ปัจจุบันเมื่อเปลี่ยนหน้า / ค้นหา
  React.useEffect(() => {
    if (!open || !policy?.id) return;
    db.fetchPolicyMembers(policy.id, {
      page: db.memPage,
      pageSize: db.memPageSize,
      q: search || "",
    });
    // เคลียร์ selection ทุกครั้งที่ query ใหม่
    setSel({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, policy?.id, db.memPage, db.memPageSize, search]);

  // =============== Normalize + filter ===============
  const normalizeDomain = (v?: string) =>
    (v ?? "").trim().toLowerCase().replace(/^@+/, "");

  const domSel = normalizeDomain(domain);

  const current = React.useMemo(() => {
    const list = (db.members ?? []) as unknown as RawMember[];
    return list.map((u) => {
      const email: string = (u.email ?? "").trim();
      const dom = email.includes("@") ? email.split("@").pop()?.toLowerCase() ?? "" : "";
      return {
        id: String(u.id),
        name: String(u.fullName ?? u.name ?? u.id),
        email,
        faculty: (u.faculty ?? u.fac ?? "").trim(),
        department: (u.major ?? u.department ?? "").trim(),
        year: u.year ?? u.classYear ?? "",
        domain: dom,
        policyName: u.policyName ?? null,
      };
    });
  }, [db.members]);

  const filtered = React.useMemo(() => {
    const q = (search ?? "").trim().toLowerCase();
    return current
      .filter((u) => !domSel || u.domain === domSel)
      .filter((u) => !faculty || u.faculty === faculty)
      .filter((u) => !major || u.department === major)
      .filter((u) => !year || String(u.year) === String(year))
      .filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [current, search, domSel, faculty, major, year]);

  // =============== Select logic (with indeterminate) ===============
  const allIds = React.useMemo(() => filtered.map((u) => u.id), [filtered]);
  const selectedCount = React.useMemo(
    () => allIds.reduce((c, id) => (sel[id] ? c + 1 : c), 0),
    [allIds, sel]
  );
  const allChecked = allIds.length > 0 && selectedCount === allIds.length;
  const headerIndeterminate = selectedCount > 0 && selectedCount < allIds.length;
  const headerRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (headerRef.current) headerRef.current.indeterminate = headerIndeterminate;
  }, [headerIndeterminate]);

  const toggleAll = () => {
    // toggle เฉพาะรายการที่แสดงอยู่ (หลังกรอง)
    setSel((prev) => {
      const next: Record<string, boolean> = { ...prev };
      const target = !allChecked;
      for (const id of allIds) next[id] = target;
      return next;
    });
  };

  const toggleOne = (id: string) =>
    setSel((s) => ({ ...s, [id]: !s[id] }));

  // =============== Actions ===============
  const removeSelected = async () => {
    if (!policy?.id) return;
    const picked = allIds.filter((id) => sel[id]);
    if (!picked.length) return;
    try {
      setSaving(true);
      try {
        // ใช้ bulk ก่อน ถ้ามี
        await db.bulkRemoveMembersFromPolicy(policy.id, picked);
      } catch {
        // ถ้าไม่มี bulk หรือ fail ให้ไล่ทีละคน
        for (const id of picked) await db.removeMemberFromPolicy(policy.id, id);
      }
      await db.fetchPolicyMembers(policy.id, {
        page: db.memPage,
        pageSize: db.memPageSize,
        q: search || "",
      });
      await db.refresh();
      setSel({});
    } finally {
      setSaving(false);
    }
  };

  const removeOne = async (uid: string) => {
    if (!policy?.id) return;
    try {
      setSaving(true);
      await db.removeMemberFromPolicy(policy.id, uid);
      await db.fetchPolicyMembers(policy.id, {
        page: db.memPage,
        pageSize: db.memPageSize,
        q: search || "",
      });
      await db.refresh();
      setSel((s) => {
        const n = { ...s };
        delete n[uid];
        return n;
      });
    } finally {
      setSaving(false);
    }
  };

  // =============== Pagination helpers ===============
  const memStart = (db.memPage - 1) * db.memPageSize + 1;
  const memEnd = Math.min(db.memPage * db.memPageSize, db.memTotal || 0);

  // =============== Render ===============
  return (
    <Modal isOpen={open} onClose={handleClose} showCloseButton className="max-w-5xl p-0">
      {!policy ? null : (
        <div className="flex max-h-[80vh] flex-col">
          {/* Header */}
          <div className="border-b px-6 py-4 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Remove Members</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Policy: <span className="font-medium text-gray-700 dark:text-gray-300">{policy.name}</span>
              {typeof db.memTotal === "number" && (
                <span className="ml-3 text-gray-400 dark:text-gray-500">(current: {db.memTotal})</span>
              )}
            </p>
          </div>

          {/* Body */}
          <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
            {/* Toolbar */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
              <SearchAndFilterBar
                search={search}
                onSearch={setSearch}
                domain={domain}
                onDomainChange={setDomain}
                faculty={faculty}
                onFacultyChange={(f) => {
                  setFaculty(f);
                  setMajor(undefined);
                }}
                major={major}
                onMajorChange={setMajor}
                year={year as any}
                onYearChange={setYear as any}
                showPolicyFilter={false}
                showDomainFilter
                showFacultyFilter
                showMajorFilter
                showYearFilter
                placeholder="Search name or email…"
              />

              <button
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={removeSelected}
                disabled={selectedCount === 0 || saving}
                title={selectedCount ? `Remove ${selectedCount} selected` : "Select rows to remove"}
              >
                {saving ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Removing…
                  </>
                ) : (
                  <>
                    {/* inline svg */}
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden="true"
                    >
                      <path d="M3 6h18M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-1 14H8a2 2 0 0 1-2-2V6h12v12a2 2 0 0 1-2 2Z" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                    Remove selected
                  </>
                )}
              </button>
            </div>

            {/* Table */}
            <div className="flex h-[360px] flex-col rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              {/* Header row */}
              <div className="grid h-12 grid-cols-12 items-center border-b bg-gray-50 text-left text-sm font-medium dark:border-gray-700 dark:bg-gray-800/50">
                <div className="col-span-1 px-3">
                  <input
                    ref={headerRef}
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    aria-checked={headerIndeterminate ? "mixed" : allChecked}
                    aria-label="Select all"
                  />
                </div>
                <div className="col-span-3 px-3">Name</div>
                <div className="col-span-3 px-3">Email</div>
                <div className="col-span-3 px-3">Major / Faculty</div>
                <div className="col-span-1 px-3">Year</div>
                <div className="col-span-1 px-3">Action</div>
              </div>

              {/* Body (virtualized) */}
              <VirtualTable
                items={filtered}
                rowHeight={48}
                height={420}
                className="flex-1"
                renderRow={({ item: u }) => (
                  <div className="grid grid-cols-12 items-center border-b text-sm transition-colors hover:bg-gray-50 dark:border-gray-700/70 dark:hover:bg-white/[0.03]">
                    <div className="col-span-1 px-3">
                      <input
                        type="checkbox"
                        checked={!!sel[u.id]}
                        onChange={() => toggleOne(u.id)}
                        aria-label={`Select ${u.name}`}
                      />
                    </div>
                    <div className="col-span-3 truncate px-3 py-2" title={u.name}>
                      {u.name}
                    </div>
                    <div className="col-span-3 truncate px-3 py-2 text-gray-600 dark:text-gray-300" title={u.email}>
                      {u.email}
                    </div>
                    <div className="col-span-3 px-3 py-2">
                      <div className="truncate font-medium text-gray-800 dark:text-white/90" title={u.department || "-"}>
                        {u.department || "—"}
                      </div>
                      <div
                        className="truncate text-xs text-gray-500 dark:text-gray-400"
                        title={u.faculty || ""}
                      >
                        {u.faculty || ""}
                      </div>
                    </div>
                    <div className="col-span-1 px-3 py-2">{u.year || "—"}</div>
                    <div className="col-span-1 px-3 py-2">
                      <button
                        aria-label={`Remove ${u.name}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                        onClick={() => removeOne(u.id)}
                        disabled={saving}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          aria-hidden="true"
                        >
                          <path d="M3 6h18M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-1 14H8a2 2 0 0 1-2-2V6h12v12a2 2 0 0 1-2 2Z" />
                          <path d="M10 11v6M14 11v6" />
                        </svg>
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              />
            </div>

            {/* Footer: pagination */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {typeof db.memTotal === "number" && db.memTotal > 0
                  ? `Showing ${memStart}–${memEnd} of ${db.memTotal}`
                  : ""}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-lg border bg-white px-3 py-1 text-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  disabled={db.memPage <= 1}
                  onClick={() =>
                    policy?.id &&
                    db.fetchPolicyMembers(policy.id, {
                      page: Math.max(1, db.memPage - 1),
                      pageSize: db.memPageSize,
                      q: search || "",
                    })
                  }
                >
                  ← Prev
                </button>
                <span className="min-w-[90px] text-center text-sm text-gray-700 dark:text-gray-300">
                  Page {db.memPage} / {db.memPageCount}
                </span>
                <button
                  className="rounded-lg border bg-white px-3 py-1 text-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  disabled={db.memPage >= db.memPageCount}
                  onClick={() =>
                    policy?.id &&
                    db.fetchPolicyMembers(policy.id, {
                      page: Math.min(db.memPageCount, db.memPage + 1),
                      pageSize: db.memPageSize,
                      q: search || "",
                    })
                  }
                >
                  Next →
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t px-6 py-4 dark:border-gray-700">
            <button
              className="rounded-lg border bg-white px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              onClick={handleClose}
              disabled={saving}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
