"use client";

import React from "react";
import Section from "@/components/admin/Section";
import SearchAndFilterBar from "@/components/admin/common/SearchAndFilterBar";
import { VirtualTable } from "@/components/admin/common/VirtualTable";
import {
  clearSelection,
  isSelected,
  selectAllFiltered,
  toggleOne,
  type SelectionState,
} from "@/components/admin/common/selection";
import { useUsersDB, usePagedUsers } from "@/lib/admin/usersDb";
import { Modal } from "@/components/ui/modal";

type UserRow = {
  id: string;
  fullName?: string;
  email?: string;
  faculty?: string;
  major?: string;
  year?: number | string;
  policyName?: string | null;
  policyId?: string;
  active?: boolean;
};

export default function UserManager() {
  // ---------- Filters ----------
  const [search, setSearch] = React.useState("");
  const [policyId, setPolicyId] = React.useState<string | undefined>(undefined);
  const [domain, setDomain] = React.useState<string | undefined>(undefined);

  const [faculty, setFaculty] = React.useState<string | undefined>(undefined);
  const [major, setMajor] = React.useState<string | undefined>(undefined);
  const [year, setYear] = React.useState<number | undefined>(undefined);

  const {
    users,
    total,
    page,
    pageSize,
    pageCount,
    loading,
    setPage,
    setQuery,
    refetch,
  } = usePagedUsers({}, 100, 60_000, { autoInit: false, debounceMs: 200 });

  React.useEffect(() => {
    setQuery({
      q: search.trim() || undefined,
      policyId: policyId || undefined,
      domain: domain || undefined,
      faculty: faculty || undefined,
      major: major || undefined,
      year: year ?? undefined,
    });
    setSel(clearSelection());
  }, [search, policyId, domain, faculty, major, year, setQuery]);

  // ทำให้ users เป็น type ที่อ่านได้แบบปลอดภัย (ไม่ใช้ any)
  const rows: UserRow[] = React.useMemo(() => {
    const list = (users as unknown as Array<Partial<UserRow>>) ?? [];
    return list.map((u) => ({
      id: String(u.id ?? ""),
      fullName: u.fullName,
      email: u.email,
      faculty: u.faculty,
      major: u.major,
      year: u.year,
      policyName: u.policyName ?? null,
      policyId: u.policyId,
      active: u.active ?? true,
    }));
  }, [users]);

  const filteredUsers: UserRow[] = React.useMemo(() => {
    return rows.filter((u) => {
      if (faculty && u.faculty !== faculty) return false;
      if (major && u.major !== major) return false;
      if (year != null && Number(u.year) !== Number(year)) return false;
      return true;
    });
  }, [rows, faculty, major, year]);

  // ---------- Selection + Delete ----------
  const { deleteUsersMany } = useUsersDB({ autoInit: false });
  const [sel, setSel] = React.useState<SelectionState>(clearSelection());

  const rowIds = React.useMemo(() => filteredUsers.map((u) => u.id), [filteredUsers]);

  const selectedCount = React.useMemo(() => {
    if (sel.mode === "none") return 0;
    if (sel.mode === "some") {
      let c = 0;
      for (const id of rowIds) if (sel.picked.has(id)) c++;
      return c;
    }
    return rowIds.filter((id) => !sel.excluded.has(id)).length;
  }, [sel, rowIds]);

  const headerChecked = selectedCount > 0 && selectedCount === rowIds.length;
  const headerIndeterminate = selectedCount > 0 && selectedCount < rowIds.length;
  const headerRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (headerRef.current) headerRef.current.indeterminate = headerIndeterminate;
  }, [headerIndeterminate]);

  const toggleSelectAll = () => {
    if (headerChecked) setSel(clearSelection());
    else setSel(selectAllFiltered());
  };

  const handleCheck =
    (id: string) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const checked = e.target.checked;
      setSel((s) => toggleOne(id, checked, s));
    };

  const getSelectedIds = React.useCallback((): string[] => {
    if (sel.mode === "none") return [];
    if (sel.mode === "some") return rowIds.filter((id) => sel.picked.has(id));
    return rowIds.filter((id) => !sel.excluded.has(id));
  }, [sel, rowIds]);

  const selectedUsers = React.useMemo(() => {
    const ids = new Set(getSelectedIds());
    return filteredUsers.filter((u) => ids.has(u.id));
  }, [getSelectedIds, filteredUsers]);

  const bannedCount = React.useMemo(() => {
    return selectedUsers.filter((u) => !u.active).length;
  }, [selectedUsers]);

  // Confirm modal แทน window.confirm
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const openConfirm = () => setConfirmOpen(true);
  const closeConfirm = () => setConfirmOpen(false);

  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const closeError = () => setErrorMsg(null);

  function ErrorModal({
    open,
    message,
    onClose,
  }: {
    open: boolean;
    message?: string | null;
    onClose: () => void;
  }) {
    return (
      <Modal isOpen={open} onClose={onClose} showCloseButton className="max-w-sm p-3">
        <div className="flex items-center justify-between border-b px-3 py-4">
          <div className="font-semibold text-red-600">Error</div>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-gray-700">{message || "Something went wrong."}</p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
          >
            Close
          </button>
        </div>
      </Modal>
    );
  }

  const doDelete = React.useCallback(async () => {
    const ids = getSelectedIds();
    if (!ids.length) return;
    try {
      await deleteUsersMany(ids);
      setSel(clearSelection());
      await refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`ลบไม่สำเร็จ: ${msg}`);
    } finally {
      closeConfirm();
    }
  }, [getSelectedIds, deleteUsersMany, refetch]);

  return (
    <Section
      title="Management"
      actions={
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg bg-red-600 px-3 py-1 text-sm text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
            onClick={openConfirm}
            disabled={selectedCount === 0 || loading}
            title={selectedCount ? `Delete ${selectedCount} selected` : "Select rows to delete"}
          >
            Delete{selectedCount ? ` (${selectedCount})` : ""}
          </button>
        </div>
      }
    >
      {/* Filters */}
      <div className="mb-3">
        <SearchAndFilterBar
          search={search}
          onSearch={setSearch}
          policyId={policyId}
          onPolicyChange={setPolicyId}
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
          showPolicyFilter
          showDomainFilter
          showFacultyFilter
          showMajorFilter
          showYearFilter
          placeholder="Search name or ID…"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="grid h-12 grid-cols-34 items-center border-b border-gray-200 bg-gray-50/60 text-left text-sm sticky top-0 z-10 min-w-[1080px]">
          <div className="col-span-2 px-3">
            <label className="inline-flex items-center gap-2">
              <input
                ref={headerRef}
                type="checkbox"
                checked={headerChecked}
                onChange={toggleSelectAll}
                aria-checked={
                  (headerIndeterminate ? "mixed" : headerChecked) as React.AriaAttributes["aria-checked"]
                }
              />
              <span className="sr-only">Select all</span>
            </label>
          </div>
          <div className="col-span-7 px-3 font-medium text-gray-700">Name / StudentID</div>
          <div className="col-span-7 px-3 font-medium text-gray-700">Email</div>
          <div className="col-span-6 px-3 font-medium text-gray-700">Major / Faculty</div>
          <div className="col-span-5 px-3 font-medium text-gray-700">Policy</div>
          <div className="col-span-3 px-3 font-medium text-gray-700">Year</div>
          <div className="col-span-1 px-3 font-medium text-gray-700">Active</div>
        </div>

        <VirtualTable
          items={filteredUsers}
          rowHeight={48}
          renderRow={({ item: u }: { item: UserRow }) => (
            <div className="grid grid-cols-32 h-12 items-center text-sm hover:bg-gray-50 transition-colors min-w-[1080px]">
              <div className="col-span-1 px-3">
                <input
                  aria-label={`Select ${u.fullName ?? u.id}`}
                  type="checkbox"
                  checked={isSelected(u.id, sel)}
                  onChange={handleCheck(u.id)}
                />
              </div>

              <div className="col-span-7 px-3">
                <div
                  className="max-w-[240px] truncate font-medium"
                  title={u.fullName ?? u.id}
                >
                  {u.fullName ?? "-"}
                </div>
                <div className="text-xs text-gray-500 block truncate">ID: {u.id || "-"}</div>
              </div>

              <div className="col-span-7 px-3">
                <div className="max-w-[260px] truncate" title={u.email ?? "-"}>
                  {u.email ?? "-"}
                </div>
              </div>

              <div className="col-span-6 px-3">
                <div className="max-w-[220px] truncate" title={u.major ?? "-"}>
                  {u.major ?? "-"}
                </div>
                <div
                  className="text-xs text-gray-500 max-w-[220px] truncate"
                  title={u.faculty ?? "-"}
                >
                  {u.faculty ?? "-"}
                </div>
              </div>

              <div className="col-span-5 px-3">
                <div
                  className="max-w-[120px] truncate"
                  title={u.policyName ?? u.policyId ?? "-"}
                >
                  {u.policyName ?? u.policyId ?? "-"}
                </div>
              </div>

              <div className="col-span-2 px-3">{u.year ?? "-"}</div>

              <div className="col-span-1 px-6">
                <span
                  className={`rounded-full px-3 py-1 text-xs ${
                    u.active
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : "bg-red-100 text-red-700 ring-red-300"
                  }`}
                >
                  {u.active ? "Active" : "Banned"}
                </span>
              </div>
            </div>
          )}
        />
      </div>

      {/* Pagination Bar */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-600">
          {loading
            ? "Loading..."
            : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
            onClick={() => {
              setPage(page - 1);
              setSel(clearSelection());
            }}
            disabled={page <= 1 || loading}
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-700">
            Page {page} / {pageCount}
          </span>
          <button
            className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
            onClick={() => {
              setPage(page + 1);
              setSel(clearSelection());
            }}
            disabled={page >= pageCount || loading}
          >
            Next →
          </button>
        </div>
      </div>

      {/* ===== Confirm Delete Modal ===== */}
      <Modal
        isOpen={confirmOpen}
        onClose={closeConfirm}
        showCloseButton={true}
        className="max-w-md p-3"
      >
        <div className="flex items-center justify-between border-b px-3 py-4">
          <div className="font-semibold">Confirm Delete</div>
        </div>

        <div className="px-5 py-5 space-y-3">
          {bannedCount > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <div className="font-medium">Banned users selected</div>
              <div>
                {bannedCount} user(s) are currently banned — do you still want to delete them?
              </div>
            </div>
          )}
          <p className="text-sm text-gray-600">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-gray-900">{selectedCount}</span> user(s)?
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <button
            onClick={closeConfirm}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={doDelete}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50"
            disabled={selectedCount === 0 || loading}
          >
            Delete
          </button>
        </div>
      </Modal>

      <ErrorModal open={!!errorMsg} message={errorMsg} onClose={closeError} />
    </Section>
  );
}
