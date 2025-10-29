"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";
import { VirtualTable } from "@/components/admin/common/VirtualTable";
import SearchAndFilterBar from "@/components/admin/common/SearchAndFilterBar";
import { usePolicyDB } from "@/lib/admin/policyDB";

type PolicyBrief = { id: string; name: string };
type RawUser = {
  id: string;
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

export default function AddMembersDialog({
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
  const ctl = "h-9 rounded-lg border px-3 text-sm";
  const ctlInput = `${ctl} w-56`;

  const [basket, setBasket] = React.useState<
    Array<{
      id: string;
      name: string;
      email: string;
      faculty?: string;
      department?: string;
      year?: string;
      policyName?: string | null;
    }>
  >([]);

  const [search, setSearch] = React.useState("");
  const [domain, setDomain] = React.useState<string | undefined>(undefined);
  const [faculty, setFaculty] = React.useState<string | undefined>(undefined);
  const [major, setMajor] = React.useState<string | undefined>(undefined);
  const [year, setYear] = React.useState<number | undefined>(undefined);

  const [qRight, setQRight] = React.useState("");

  const [selLeft, setSelLeft] = React.useState<Record<string, boolean>>({});
  const [selRight, setSelRight] = React.useState<Record<string, boolean>>({});

  // ใช้ loading จาก db ถ้ามี (เช็คแบบ type-safe โดยไม่ใช้ any)
  const isLoading: boolean =
    (("usrLoading" in db && typeof (db as Record<string, unknown>).usrLoading === "boolean"
      ? (db as unknown as Record<string, boolean>).usrLoading
      : false) as boolean) ?? false;

  React.useEffect(() => {
    if (!open || !policy?.id) return;

    const resetState = () => {
      setBasket([]);
      setSearch("");
      setQRight("");
      setDomain(undefined);
      setFaculty(undefined);
      setMajor(undefined);
      setYear(undefined);
      setSelLeft({});
      setSelRight({});
    };

    resetState();

    const loadInitialData = () => {
      db.setUsersQuery({
        q: "",
        excludePolicyId: policy.id,
        excludeIds: [],
      });
    };

    loadInitialData();
  }, [open, policy?.id, db]);

  const excludeIds = React.useMemo(
    () => Array.from(new Set<string>(basket.map((b) => b.id))),
    [basket]
  );

  const normalizedUsers = React.useMemo(() => {
    const list = (db.users ?? []) as unknown as RawUser[];
    return list.map((u) => ({
      id: u.id,
      name: u.fullName ?? u.name ?? "No name",
      email: u.email ?? "No email",
      faculty: u.faculty ?? u.fac ?? "No faculty",
      department: u.major ?? u.department ?? "No department",
      year: String(u.year ?? u.classYear ?? ""),
      policyName: u.policyName ?? null,
    }));
  }, [db.users]);

  const leftUsers = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return normalizedUsers
      .filter((u) => !excludeIds.includes(u.id))
      .filter((u) => !faculty || u.faculty === faculty)
      .filter((u) => !major || u.department === major)
      .filter((u) => !year || String(u.year) === String(year))
      .filter(
        (u) =>
          !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
  }, [normalizedUsers, excludeIds, search, faculty, major, year]);

  const rightUsers = React.useMemo(() => {
    const q = qRight.trim().toLowerCase();
    if (!q) return basket;
    return basket.filter(
      (u) =>
        (u.name ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q)
    );
  }, [basket, qRight]);

  const allLeftIds = leftUsers.map((u) => u.id);
  const allRightIds = rightUsers.map((u) => u.id);

  const leftAllChecked = allLeftIds.length > 0 && allLeftIds.every((id) => selLeft[id]);
  const rightAllChecked = allRightIds.length > 0 && allRightIds.every((id) => selRight[id]);

  const selectedLeftCount = Object.values(selLeft).filter(Boolean).length;
  const selectedRightCount = Object.values(selRight).filter(Boolean).length;

  const toggleAll = (side: "left" | "right") => {
    const target = side === "left" ? allLeftIds : allRightIds;
    const checked = side === "left" ? leftAllChecked : rightAllChecked;
    const next: Record<string, boolean> = {};
    target.forEach((id) => {
      next[id] = !checked;
    });
    if (side === "left") setSelLeft(next);
    else setSelRight(next);
  };

  React.useEffect(() => {
    if (!open || !policy?.id) return;
    db.setUsersQuery({
      q: (search ?? "").trim() || undefined,
      domain,
      faculty,
      major,
      year,
      excludePolicyId: policy.id,
      excludeIds,
    });
  }, [open, policy?.id, search, domain, faculty, major, year, excludeIds, db]);

  const moveRight = () => {
    const pickedIds = allLeftIds.filter((id) => selLeft[id]);
    if (!pickedIds.length) return;
    const idSet = new Set(basket.map((b) => b.id));
    const toAdd = leftUsers.filter((u) => pickedIds.includes(u.id) && !idSet.has(u.id));
    setBasket((prev) => [...prev, ...toAdd]);
    setSelLeft({});

    if (policy?.id) {
      db.setUsersQuery({
        q: (search ?? "").trim() || undefined,
        domain,
        faculty,
        excludePolicyId: policy.id,
        excludeIds: Array.from(new Set([...excludeIds, ...pickedIds])),
      });
    }
  };

  const moveLeft = () => {
    const pickedIds = allRightIds.filter((id) => selRight[id]);
    if (!pickedIds.length) return;
    setBasket((prev) => prev.filter((u) => !pickedIds.includes(u.id)));
    setSelRight({});

    if (policy?.id) {
      db.setUsersQuery({
        q: (search ?? "").trim() || undefined,
        domain,
        faculty,
        excludePolicyId: policy.id,
        excludeIds: excludeIds.filter((id) => !pickedIds.includes(id)),
      });
    }
  };

  const [saving, setSaving] = React.useState(false);
  const onSave = async () => {
    if (!policy?.id || basket.length === 0) return;
    const toAdd = basket.map((b) => b.id);
    try {
      setSaving(true);
      if (toAdd.length) await db.addMembersToPolicy(policy.id, toAdd);
      await db.refresh();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const leftStart = (db.usrPage - 1) * db.usrPageSize + 1;
  const leftEnd = Math.min(db.usrPage * db.usrPageSize, db.usrTotal || leftStart - 1);

  const hasLeftUsers = leftUsers.length > 0;
  const hasRightUsers = rightUsers.length > 0;

  return (
    <Modal isOpen={open} onClose={onClose} showCloseButton className="max-w-350 p-0 md:p-0">
      {!policy ? null : (
        <div className="flex max-h-[80vh] flex-col">
          <div className="border-b px-6 py-4">
            <h3 className="text-lg font-semibold">Add Members</h3>
            <p className="mt-1 text-sm text-gray-500">
              Policy: <span className="font-medium">{policy.name}</span>
              <span className="ml-3 text-gray-400">
                (available: {db.usrTotal ?? 0}, basket: {basket.length})
              </span>
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
            <div className="grid gap-5">
              <div className="grid min-h-0 grid-cols-1 gap-5 md:grid-cols-2">
                {/* LEFT PANEL - Available Users */}
                <div>
                  <div className="px-1 py-2">
                    <SearchAndFilterBar
                      dense
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
                      year={year}
                      onYearChange={setYear}
                      showPolicyFilter={false}
                      showDomainFilter
                      showFacultyFilter
                      showMajorFilter
                      showYearFilter
                      placeholder="Search name or email…"
                    />
                  </div>

                  <div className="flex h-[420px] flex-col rounded-xl border">
                    <div className="top-0 z-10 grid grid-cols-12 border-b bg-gray-50 text-sm">
                      <div className="col-span-1 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={leftAllChecked}
                          onChange={() => toggleAll("left")}
                          disabled={!hasLeftUsers || isLoading}
                        />
                      </div>
                      <div className="col-span-4 px-3 py-2 font-medium">Name / Policy</div>
                      <div className="col-span-3 px-3 py-2 font-medium">Email</div>
                      <div className="col-span-3 px-3 py-2 font-medium">Major / Faculty</div>
                      <div className="col-span-1 py-2 font-medium">Years</div>
                    </div>

                    {isLoading ? (
                      <div className="flex flex-1 items-center justify-center">
                        <div className="text-gray-500">Loading users...</div>
                      </div>
                    ) : !hasLeftUsers ? (
                      <div className="flex flex-1 items-center justify-center">
                        <div className="text-center text-gray-500">
                          {search || faculty || major || year
                            ? "No users match your filters"
                            : "No users available"}
                        </div>
                      </div>
                    ) : (
                      <VirtualTable
                        items={leftUsers}
                        rowHeight={48}
                        height={380}
                        className="flex-1"
                        renderRow={({ item: u }) => (
                          <div className="grid grid-cols-12 items-center border-b text-sm hover:bg-gray-50">
                            <div className="col-span-1 px-3">
                              <input
                                type="checkbox"
                                checked={!!selLeft[u.id]}
                                onChange={() =>
                                  setSelLeft((s) => ({ ...s, [u.id]: !s[u.id] }))
                                }
                              />
                            </div>
                            <div className="col-span-4 px-3 py-2 truncate">
                              <div className="truncate font-medium">{u.name}</div>
                              <div className="truncate text-xs text-gray-500">
                                Policy: {u.policyName || "None"}
                              </div>
                            </div>
                            <div className="col-span-3 px-3 py-2 truncate text-gray-600">
                              {u.email}
                            </div>
                            <div className="col-span-3 px-3 py-2 truncate">
                              <div className="font-medium">{u.department}</div>
                              <div className="block truncate text-xs text-gray-500">
                                {u.faculty}
                              </div>
                            </div>
                            <div className="col-span-1 px-5 py-2">{u.year}</div>
                          </div>
                        )}
                      />
                    )}

                    <div className="flex items-center justify-between border-t px-3 py-2">
                      <span className="text-sm text-gray-600">
                        {selectedLeftCount > 0
                          ? `${selectedLeftCount} selected`
                          : "Select users to add"}
                      </span>
                      <button
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                        onClick={moveRight}
                        disabled={!allLeftIds.some((id) => selLeft[id]) || isLoading}
                      >
                        Add selected →
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-3">
                    <div className="ml-2 text-sm text-gray-600">
                      {isLoading
                        ? "Loading..."
                        : db.usrTotal
                        ? `Showing ${leftStart}-${leftEnd} of ${db.usrTotal}`
                        : "No users"}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-lg border px-3 py-1 text-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
                        disabled={db.usrPage <= 1 || isLoading}
                        onClick={() => db.setUsersPage(Math.max(1, db.usrPage - 1))}
                      >
                        ← Prev
                      </button>
                      <span className="text-sm text-gray-700">
                        Page {db.usrPage} / {db.usrPageCount || 1}
                      </span>
                      <button
                        className="rounded-lg border px-3 py-1 text-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
                        disabled={db.usrPage >= db.usrPageCount || isLoading}
                        onClick={() =>
                          db.setUsersPage(Math.min(db.usrPage + 1, db.usrPageCount))
                        }
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                </div>

                {/* RIGHT PANEL - Basket */}
                <div>
                  <div className="flex items-center gap-3 px-3 py-2">
                    <div className="flex-1 text-sm font-medium">
                      <span className="font-normal">Add to</span> &quot;{policy.name}&quot;
                      <span className="ml-2 text-xs text-gray-500">
                        In basket: <b>{basket.length}</b> • Showing: <b>{rightUsers.length}</b>
                      </span>
                    </div>
                    <input
                      value={qRight}
                      onChange={(e) => setQRight(e.target.value)}
                      placeholder="Search in basket…"
                      className={ctlInput}
                    />
                  </div>

                  <div className="flex h-[420px] flex-col rounded-xl border">
                    <div className="top-0 z-10 grid grid-cols-12 border-b bg-gray-50 text-sm">
                      <div className="col-span-1 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={rightAllChecked}
                          onChange={() => toggleAll("right")}
                          disabled={!hasRightUsers}
                        />
                      </div>
                      <div className="col-span-5 px-3 py-2 font-medium">Name</div>
                      <div className="col-span-6 px-3 py-2 font-medium">Email</div>
                    </div>

                    {!hasRightUsers ? (
                      <div className="flex flex-1 items-center justify-center">
                        <div className="text-center text-gray-500">
                          {qRight ? "No users match your search" : "No users in basket"}
                          <br />
                          <span className="text-sm">
                            Select users from the left panel to add
                          </span>
                        </div>
                      </div>
                    ) : (
                      <VirtualTable
                        items={rightUsers}
                        rowHeight={48}
                        height={380}
                        className="flex-1"
                        renderRow={({ item: u }) => (
                          <div className="grid grid-cols-12 items-center border-b text-sm hover:bg-gray-50">
                            <div className="col-span-1 px-3">
                              <input
                                type="checkbox"
                                checked={!!selRight[u.id]}
                                onChange={() =>
                                  setSelRight((s) => ({ ...s, [u.id]: !s[u.id] }))
                                }
                              />
                            </div>
                            <div className="col-span-5 px-3 py-2 truncate">{u.name}</div>
                            <div className="col-span-6 px-3 py-2 truncate text-gray-600">
                              {u.email}
                            </div>
                          </div>
                        )}
                      />
                    )}

                    <div className="flex items-center justify-between border-t px-3 py-2">
                      <span className="text-sm text-gray-600">
                        {selectedRightCount > 0
                          ? `${selectedRightCount} selected`
                          : "Select users to remove"}
                      </span>
                      <button
                        className="rounded-lg border bg-red-400 px-3 py-1.5 text-sm text-white transition-colors hover:bg-red-500 disabled:bg-gray-300"
                        onClick={moveLeft}
                        disabled={!allRightIds.some((id) => selRight[id])}
                      >
                        ← Remove selected
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t px-6 py-4">
            <div className="text-sm text-gray-600">
              {basket.length > 0
                ? `Ready to add ${basket.length} user(s) to policy`
                : "Select users to add to policy"}
            </div>
            <div className="flex items-center gap-3">
              <button
                className="rounded-lg border bg-white px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={onSave}
                disabled={saving || basket.length === 0}
              >
                {saving ? `Adding ${basket.length} users...` : `Add ${basket.length} users`}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
