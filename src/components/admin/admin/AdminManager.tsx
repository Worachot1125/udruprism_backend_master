/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// components/admin/admins/AdminManager.tsx
"use client";
import * as React from "react";
import Section from "@/components/admin/Section";
import { Modal } from "@/components/ui/modal";
import { VirtualTable } from "@/components/admin/common/VirtualTable";
import { useAdminsDB } from "@/lib/admin/adminDb";

/* ========================= Types ========================= */
type AdminRow = {
  id: string;
  email: string;
  prefix?: "นาย" | "นาง" | "นางสาว";
  firstname: string;
  lastname: string;
  department?: string | null;
};

type EditableAdmin = Partial<AdminRow> &
  Required<Pick<AdminRow, "email" | "firstname" | "lastname">>;

/* ========================= UI Helpers ========================= */
const PREFIXES: NonNullable<AdminRow["prefix"]>[] = ["นาย", "นาง", "นางสาว"];

function fullName(a: Pick<AdminRow, "prefix" | "firstname" | "lastname">) {
  return [a.prefix, a.firstname, a.lastname].filter(Boolean).join(" ");
}

/* ========================= Main Component ========================= */
export default function AdminManager() {
  const db = useAdminsDB({ autoInit: true, pageSize: 10 });

  // local UI states
  const [qLocal, setQLocal] = React.useState(db.q ?? "");
  React.useEffect(() => setQLocal(db.q ?? ""), [db.q]);

  /* ------------ selection (multi-select) ------------ */
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const rowIds = React.useMemo(() => db.items.map((r) => r.id), [db.items]);
  const selectedCount = React.useMemo(() => {
    let c = 0;
    for (const id of rowIds) if (picked.has(id)) c++;
    return c;
  }, [picked, rowIds]);

  const headerChecked = selectedCount > 0 && selectedCount === rowIds.length;
  const headerIndeterminate = selectedCount > 0 && selectedCount < rowIds.length;
  const headerRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (headerRef.current) headerRef.current.indeterminate = headerIndeterminate;
  }, [headerIndeterminate]);

  const toggleSelectAll = () => {
    if (headerChecked) {
      const np = new Set(picked);
      for (const id of rowIds) np.delete(id);
      setPicked(np);
    } else {
      const np = new Set(picked);
      for (const id of rowIds) np.add(id);
      setPicked(np);
    }
  };

  const toggleOne = (id: string, checked: boolean) => {
    setPicked((s) => {
      const np = new Set(s);
      if (checked) np.add(id);
      else np.delete(id);
      return np;
    });
  };

  /* ------------ create/edit modal ------------ */
  const [openEdit, setOpenEdit] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [editing, setEditing] = React.useState<EditableAdmin | null>(null);

  const startCreate = () => {
    setEditing({
      email: "",
      firstname: "",
      lastname: "",
      prefix: "นาย",
      department: "",
    });
    setOpenEdit(true);
  };
  const startEdit = (row: AdminRow) => {
    setEditing({ ...row });
    setOpenEdit(true);
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.email?.trim() || !editing.firstname?.trim() || !editing.lastname?.trim()) return;

    setSaving(true);
    try {
      if (editing.id) {
        const { id, ...patch } = editing as AdminRow;
        await db.update({
          id,
          email: patch.email?.trim(),
          prefix: patch.prefix,
          firstname: patch.firstname?.trim(),
          lastname: patch.lastname?.trim(),
          department:
            patch.department != null
              ? patch.department.toString().trim() || null
              : null,
        });
      } else {
        const { email, firstname, lastname, prefix, department } = editing;
        await db.create({
          email: email.trim(),
          firstname: firstname.trim(),
          lastname: lastname.trim(),
          prefix,
          department: department != null ? department.toString().trim() || null : null,
        });
      }
      setOpenEdit(false);
    } finally {
      setSaving(false);
    }
  };

  /* ------------ delete  ------------ */
  const [openConfirm, setOpenConfirm] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<AdminRow | null>(null);

  const askDelete = (row: AdminRow) => {
    setPendingDelete(row);
    setOpenConfirm(true);
  };
  const askDeleteMany = () => {
    setPendingDelete(null);
    setOpenConfirm(true);
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      if (pendingDelete) {
        await db.remove(pendingDelete.id);
      } else {
        const ids = Array.from(picked);
        if (ids.length) await db.removeMany(ids);
        setPicked(new Set());
      }
      setOpenConfirm(false);
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const onSearchEnter: React.KeyboardEventHandler<HTMLInputElement> = async (e) => {
    if (e.key !== "Enter") return;
    db.setQ(qLocal);
    await db.refresh(1, qLocal);
    setPicked(new Set());
  };

  return (
    <Section
      title="Admins"
      actions={
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600">
            Selected: <b>{selectedCount}</b> / {rowIds.length}
          </div>

          <button
            onClick={startCreate}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            + New Admin
          </button>

          <button
            onClick={askDeleteMany}
            disabled={selectedCount === 0}
            className="inline-flex items-center rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            title={selectedCount ? `Delete ${selectedCount} selected` : "Select rows to delete"}
          >
            Delete{selectedCount ? ` (${selectedCount})` : ""}
          </button>
        </div>
      }
    >
      {/* Search */}
      <div className="mb-3 max-w-sm">
        <input
          className="h-10 w-full rounded-lg border px-3 text-sm transition-colors"
          placeholder="Search name / email…"
          value={qLocal}
          onChange={(e) => setQLocal(e.target.value)}
          onKeyDown={onSearchEnter}
        />
      </div>

      {/* Card + Table */}
      <div className="overflow-x-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Header */}
        <div
          className="
            grid h-12 items-center rounded-t-2xl border-b bg-gray-50/60 text-left text-sm font-medium
            [grid-template-columns:1fr_3fr_2fr_2fr_1fr]
          "
        >
          <div className="px-5">
            <input
              ref={headerRef}
              type="checkbox"
              checked={headerChecked}
              onChange={toggleSelectAll}
              aria-checked={headerIndeterminate ? "mixed" : headerChecked}
            />
          </div>
          <div className="px-3">Email</div>
          <div className="px-3">Name</div>
          <div className="px-3">Department</div>
          <div className="px-3">Action</div>
        </div>

        {/* Body */}
        {db.items.length > 0 ? (
          <VirtualTable
            items={db.items as AdminRow[]}
            rowHeight={56}
            renderRow={({ item: a }: { item: AdminRow }) => {
              const checked = picked.has(a.id);
              return (
                <div
                  className="
                    grid h-14 items-center border-b text-sm transition-colors hover:bg-gray-50
                    [grid-template-columns:1fr_3fr_2fr_2fr_1fr]
                  "
                >
                  <div className="px-5">
                    <input
                      type="checkbox"
                      aria-label={`Select ${a.email}`}
                      checked={checked}
                      onChange={(e) => toggleOne(a.id, e.target.checked)}
                    />
                  </div>

                  <div className="px-3 truncate" title={a.email}>
                    {a.email}
                  </div>

                  <div className="px-3 truncate" title={fullName(a)}>
                    {fullName(a)}
                  </div>

                  <div className="px-3 truncate" title={a.department ?? ""}>
                    {a.department ?? <span className="text-gray-400">—</span>}
                  </div>

                  <div className="px-5">
                    <div className="inline-flex gap-2">
                      <button
                        onClick={() => startEdit(a)}
                        className="rounded-lg bg-blue-600/80 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700"
                        title="Edit"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            d="M21.2799 6.40005L11.7399 15.94C10.7899 16.89 7.96987 17.33 7.33987 16.7C6.70987 16.07 7.13987 13.25 8.08987 12.3L17.6399 2.75002C17.8754 2.49308 18.1605 2.28654 18.4781 2.14284C18.7956 1.99914 19.139 1.92124 19.4875 1.9139C19.8359 1.90657 20.1823 1.96991 20.5056 2.10012C20.8289 2.23033 21.1225 2.42473 21.3686 2.67153C21.6147 2.91833 21.8083 3.21243 21.9376 3.53609C22.0669 3.85976 22.1294 4.20626 22.1211 4.55471C22.1128 4.90316 22.0339 5.24635 21.8894 5.5635C21.7448 5.88065 21.5375 6.16524 21.2799 6.40005V6.40005Z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M11 4H6C4.93913 4 3.92178 4.42142 3.17163 5.17157C2.42149 5.92172 2 6.93913 2 8V18C2 19.0609 2.42149 20.0783 3.17163 20.8284C3.92178 21.5786 4.93913 22 6 22H17C19.21 22 20 20.2 20 18V13"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => askDelete(a)}
                        className="rounded-lg bg-red-600/80 px-3 py-1.5 text-sm text-white transition-colors hover:bg-red-700"
                        title="Delete"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M3 6h18M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-1 14H8a2 2 0 0 1-2-2V6h12v12a2 2 0 0 1-2 2Z" />
                          <path d="M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            }}
          />
        ) : (
          <div className="py-12 text-center text-sm text-gray-500">No admins found</div>
        )}
      </div>

      {/* Pagination */}
      {db.total > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-gray-600">
            Showing {(db.page - 1) * db.pageSize + 1}–{Math.min(db.page * db.pageSize, db.total)} of {db.total} admins
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border px-3 py-1 text-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => {
                const prev = Math.max(1, db.page - 1);
                db.setPage(prev);
                db.refresh(prev, db.q);
              }}
              disabled={db.page <= 1}
            >
              ← Prev
            </button>
            <span className="min-w-[80px] text-center text-sm text-gray-600">
              Page {db.page} of {Math.max(1, Math.ceil(db.total / db.pageSize))}
            </span>
            <button
              className="rounded-lg border px-3 py-1 text-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => {
                const maxPage = Math.max(1, Math.ceil(db.total / db.pageSize));
                const next = Math.min(maxPage, db.page + 1);
                db.setPage(next);
                db.refresh(next, db.q);
              }}
              disabled={db.page >= Math.max(1, Math.ceil(db.total / db.pageSize))}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Modal: Create/Edit */}
      <Modal
        isOpen={openEdit}
        onClose={() => !saving && setOpenEdit(false)}
        showCloseButton={!saving}
        className="max-w-lg p-3"
      >
        <div className="flex items-center justify-between border-b px-3 py-3">
          <div className="font-semibold">{editing?.id ? "Edit Admin" : "New Admin"}</div>
        </div>
        <div className="space-y-4 px-4 py-4">
          <label className="block text-sm">
            <span className="text-gray-700">Email</span>
            <input
              className="mt-1 h-9 w-full rounded-lg border px-3 text-sm"
              value={editing?.email ?? ""}
              onChange={(e) => setEditing((s) => (s ? { ...s, email: e.target.value } : s))}
              placeholder="user@your-org.ac.th"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="block text-sm md:col-span-1">
              <span className="text-gray-700">Prefix</span>
              <select
                className="mt-1 h-9 w-full rounded-lg border px-3 text-sm"
                value={editing?.prefix ?? ""}
                onChange={(e) =>
                  setEditing((s) =>
                    s ? { ...s, prefix: (e.target.value as AdminRow["prefix"]) || undefined } : s
                  )
                }
              >
                <option value="">(none)</option>
                {PREFIXES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm md:col-span-1">
              <span className="text-gray-700">Firstname</span>
              <input
                className="mt-1 h-9 w-full rounded-lg border px-3 text-sm"
                value={editing?.firstname ?? ""}
                onChange={(e) => setEditing((s) => (s ? { ...s, firstname: e.target.value } : s))}
              />
            </label>

            <label className="block text-sm md:col-span-1">
              <span className="text-gray-700">Lastname</span>
              <input
                className="mt-1 h-9 w-full rounded-lg border px-3 text-sm"
                value={editing?.lastname ?? ""}
                onChange={(e) => setEditing((s) => (s ? { ...s, lastname: e.target.value } : s))}
              />
            </label>

            {/* Department field */}
            <label className="block text-sm md:col-span-3">
              <span className="text-gray-700">Department</span>
              <input
                className="mt-1 h-9 w-full rounded-lg border px-3 text-sm"
                value={editing?.department ?? ""}
                onChange={(e) =>
                  setEditing((s) => (s ? { ...s, department: e.target.value } : s))
                }
                placeholder="e.g. Computer Engineering"
              />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <button
            className="rounded-full border px-4 py-2 text-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
            onClick={() => setOpenEdit(false)}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            onClick={save}
            disabled={
              saving ||
              !editing?.email?.trim() ||
              !editing?.firstname?.trim() ||
              !editing?.lastname?.trim()
            }
          >
            {saving && (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </Modal>

      {/* Modal: Confirm delete */}
      <Modal
        isOpen={openConfirm}
        onClose={() => !deleting && setOpenConfirm(false)}
        showCloseButton={!deleting}
        className="max-w-sm p-3"
      >
        <div className="flex items-center justify-between border-b px-3 py-3">
          <div className="font-semibold text-red-600">Confirm Delete</div>
        </div>
        <div className="px-4 py-4 text-sm text-gray-700">
          {pendingDelete ? (
            <>Delete admin <b>{fullName(pendingDelete)}</b>?</>
          ) : (
            <>Delete <b>{selectedCount}</b> selected admin(s)?</>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <button
            className="rounded-full border px-4 py-2 text-sm hover:bg-gray-50"
            onClick={() => setOpenConfirm(false)}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            className="flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            onClick={doDelete}
            disabled={deleting}
          >
            {deleting && (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </Modal>
    </Section>
  );
}
