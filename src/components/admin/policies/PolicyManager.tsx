/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/admin/policies/PolicyManager.tsx
"use client";

import React from "react";
import Section from "@/components/admin/Section";
import PolicyCreateModal, { PolicyFormValues } from "@/components/admin/policies/PolicyForm";

import { usePolicyDB } from "@/lib/admin/policyDB";
import EditPolicyModal from "./EditPolicyModal";
import AddMembersDialog from "./AddMembersDialog";
import RemoveMembersDialog from "./RemoveMembersDialog";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import { formatDateTime } from "@/lib/admin/datetime";

type PreviewUser = { id: string; fullName: string; email: string };

const nf = (n: number | string) =>
  Number.isFinite(Number(n)) ? Number(n).toLocaleString() : String(n ?? "");

export default function PolicyManager() {
  const db = usePolicyDB();

  const policies = Array.isArray(db?.policies) ? db.policies : [];
  const createPolicy = db.createPolicy;
  const deletePolicy = db.deletePolicy;

  const [search, setSearch] = React.useState(db.q ?? "");
  const [editingPolicy, setEditingPolicy] = React.useState<any | null>(null);
  const [editingAddMembersPolicy, setEditingAddMembersPolicy] = React.useState<any | null>(null);
  const [editingRemoveMembersPolicy, setEditingRemoveMembersPolicy] = React.useState<any | null>(null);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState<{ id: string; name: string } | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  // Debounced search with loading state
  React.useEffect(() => {
    const id = setTimeout(async () => {
      setIsLoading(true);
      try {
        db.setQ(search);
        await db.fetchPolicies({ page: 1, pageSize: db.pageSize, q: search });
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const page = db.page;
  const pageCount = db.pageCount;
  const startIndex = (page - 1) * db.pageSize;

  const handleCreate = async (v: PolicyFormValues) => {
    setIsLoading(true);
    try {
      await createPolicy({
        name: v.name,
        detail: (v as any).detail ?? (v as any).description ?? null,
        tokenLimit: typeof v.tokenLimit === "number" ? v.tokenLimit : undefined,
        fileLimit: typeof (v as any).fileLimit === "number" ? (v as any).fileLimit : undefined,
        fileSize: typeof (v as any).fileSize === "number" ? (v as any).fileSize : undefined,
        share: typeof (v as any).share === "boolean" ? (v as any).share : undefined,
      });
      await db.fetchPolicies({ page: 1, pageSize: db.pageSize, q: search });
      setShowCreateModal(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete?.id) return;
    setIsLoading(true);
    try {
      await deletePolicy(confirmDelete.id);
      await db.fetchPolicies({ page, pageSize: db.pageSize, q: search });
      setConfirmDelete(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = async (newPage: number) => {
    setIsLoading(true);
    try {
      db.setPage(newPage);
      await db.fetchPolicies({ page: newPage, pageSize: db.pageSize, q: search });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Section
      title="Management"
      actions={
        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            onClick={() => setShowCreateModal(true)}
            disabled={isLoading}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Policy
          </button>
        </div>
      }
    >
      {/* Search Section */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search policies by name or description..."
            className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm
            bg-white text-gray-800 placeholder:text-gray-400 transition-colors
            dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-violet-400"
            aria-label="Search policies"
          />
        </div>
      </div>

      {/* Policies Grid */}
      <div className="grid gap-5">
        {isLoading && !policies.length ? (
          // Loading skeleton
          Array.from({ length: 3 }).map((_, idx) => (
            <div key={`skeleton-${idx}`} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="animate-pulse">
                <div className="mb-4 h-6 w-1/3 rounded bg-gray-200 dark:bg-gray-700"></div>
                <div className="mb-6 h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700"></div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-16 rounded bg-gray-200 dark:bg-gray-700"></div>
                  ))}
                </div>
              </div>
            </div>
          ))
        ) : policies.length > 0 ? (
          policies.map((g: any, idx: number) => (
            <div
              key={g?.id ?? `row-${idx}`}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-xl font-semibold text-gray-800 dark:text-white/90">
                        {g?.name ?? "(no name)"}{" "}
                        {g?.createdAt && (
                          <span
                            className="ml-2 align-middle text-xs font-normal text-gray-500 dark:text-gray-400"
                            title={String(g.createdAt)}
                          >
                            • {formatDateTime(g.createdAt)}
                          </span>
                        )}
                      </h3>
                      {g?.detail && (
                        <p className="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                          {g.detail}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    onClick={() => setEditingPolicy(g)}
                    disabled={isLoading}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path d="M21.2799 6.40005L11.7399 15.94C10.7899 16.89 7.96987 17.33 7.33987 16.7C6.70987 16.07 7.13987 13.25 8.08987 12.3L17.6399 2.75002C17.8754 2.49308 18.1605 2.28654 18.4781 2.14284C18.7956 1.99914 19.139 1.92124 19.4875 1.9139C19.8359 1.90657 20.1823 1.96991 20.5056 2.10012C20.8289 2.23033 21.1225 2.42473 21.3686 2.67153C21.6147 2.91833 21.8083 3.21243 21.9376 3.53609C22.0669 3.85976 22.1294 4.20626 22.1211 4.55471C22.1128 4.90316 22.0339 5.24635 21.8894 5.5635C21.7448 5.88065 21.5375 6.16524 21.2799 6.40005V6.40005Z" />
                      <path d="M11 4H6C4.93913 4 3.92178 4.42142 3.17163 5.17157C2.42149 5.92172 2 6.93913 2 8V18C2 19.0609 2.42149 20.0783 3.17163 20.8284C3.92178 21.5786 4.93913 22 6 22H17C19.21 22 20 20.2 20 18V13" />
                    </svg>
                    Edit
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    onClick={() => setEditingAddMembersPolicy(g)}
                    disabled={isLoading}
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2,21h8a1,1,0,0,0,0-2H3.071A7.011,7.011,0,0,1,10,13a5.044,5.044,0,1,0-3.377-1.337A9.01,9.01,0,0,0,1,20,1,1,0,0,0,2,21ZM10,5A3,3,0,1,1,7,8,3,3,0,0,1,10,5ZM23,16a1,1,0,0,1-1,1H19v3a1,1,0,0,1-2,0V17H14a1,1,0,0,1,0-2h3V12a1,1,0,0,1,2,0v3h3A1,1,0,0,1,23,16Z" />
                    </svg>
                    Add Members
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    onClick={() => setEditingRemoveMembersPolicy(g)}
                    disabled={isLoading || !g?.memberCount}
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2,21h8a1,1,0,0,0,0-2H3.071A7.011,7.011,0,0,1,10,13a5.044,5.044,0,1,0-3.377-1.337A9.01,9.01,0,0,0,1,20,1,1,0,0,0,2,21ZM10,5A3,3,0,1,1,7,8,3,3,0,0,1,10,5ZM23,16a1,1,0,0,1-1,1H15a1,1,0,0,1,0-2h7A1,1,0,0,1,23,16Z" />
                    </svg>
                    Remove Members
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-600/20"
                    onClick={() => g?.id && setConfirmDelete({ id: g.id, name: g?.name ?? "" })}
                    disabled={isLoading}
                    title="Delete this policy"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>

              {/* Policy Stats */}
              <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
                <Stat label="Token limit" sub="Tokens per day" value={nf(g?.tokenLimit ?? 0)} />
                <Stat label="File limit" sub="Files per message" value={nf(g?.fileLimit ?? 0)} />
                <Stat
                  label="File size"
                  sub="Max size per file"
                  value={
                    <>
                      {nf(g?.fileSize ?? 0)}{" "}
                      <span className="ml-1 text-sm font-normal text-gray-600 dark:text-gray-400">MB</span>
                    </>
                  }
                />
                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-white/[0.03]">
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-semibold normal-case text-gray-600 dark:text-gray-300">
                      Sharing
                    </span>
                    <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">Token sharing</p>
                  </div>
                  <div
                    className={`text-md font-semibold ${g?.share ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      }`}
                  >
                    {g?.share ? "Enabled" : "Disabled"}
                  </div>
                </div>
              </div>

              {/* Preview members */}
              {(() => {
                const previews = (Array.isArray(g?.previewUsers) ? g.previewUsers : []) as PreviewUser[];
                const extra = Math.max(0, Number(g?.memberCount ?? 0) - previews.length);
                return (previews.length + extra) > 0 ? (
                  <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-700/60">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Members ({g?.memberCount ?? 0})
                      </p>
                      {extra > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Showing {previews.length} of {g.memberCount}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {previews.map((u, i) => (
                        <span
                          key={`${g?.id ?? "g"}-${u.id}-${i}`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          title={u.email}
                        >
                          <span className="max-w-[120px] truncate font-medium">{u.fullName}</span>
                          <span className="max-w-[100px] truncate text-gray-500 dark:text-gray-400">
                            ({u.email})
                          </span>
                        </span>
                      ))}
                      {extra > 0 && (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          +{extra} more
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-700/60">
                    <p className="py-2 text-center text-sm text-gray-500 dark:text-gray-400">
                      No members assigned to this policy yet
                    </p>
                  </div>
                );
              })()}
            </div>
          ))
        ) : (
          // Empty state
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-white/[0.03]">
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-3 text-sm font-medium text-gray-900 dark:text-white">No policies found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {search ? "Try adjusting your search terms" : "Get started by creating a new policy."}
            </p>
            {!search && (
              <div className="mt-4">
                <button
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                  onClick={() => setShowCreateModal(true)}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Policy
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {db.pageCount > 1 && (
        <div className="mt-6 flex flex-col-reverse items-center justify-between gap-3 sm:flex-row">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing{" "}
            <span className="font-medium text-gray-800 dark:text-white/90">{startIndex + 1}</span>–
            <span className="font-medium text-gray-800 dark:text-white/90">
              {Math.min(startIndex + db.pageSize, db.total)}
            </span>{" "}
            of <span className="font-medium text-gray-800 dark:text-white/90">{db.total}</span> policies
          </div>
          <div className="inline-flex items-center gap-2">
            <button
              className="rounded-lg border bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              onClick={() => handlePageChange(Math.max(1, page - 1))}
              disabled={page === 1 || isLoading}
            >
              ← Prev
            </button>
            <span className="min-w-[100px] px-2 text-center text-sm text-gray-700 dark:text-gray-300">
              Page <span className="font-semibold text-gray-800 dark:text-white/90">{page}</span> of {pageCount}
            </span>
            <button
              className="rounded-lg border bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              onClick={() => handlePageChange(Math.min(pageCount, page + 1))}
              disabled={page === pageCount || isLoading}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <EditPolicyModal
        key={editingPolicy?.id || "edit"}
        open={!!editingPolicy}
        onClose={() => setEditingPolicy(null)}
        policy={editingPolicy}
        db={db}
      />
      <AddMembersDialog
        open={!!editingAddMembersPolicy}
        onClose={() => setEditingAddMembersPolicy(null)}
        policy={editingAddMembersPolicy}
        db={db}
      />
      <RemoveMembersDialog
        open={!!editingRemoveMembersPolicy}
        onClose={() => setEditingRemoveMembersPolicy(null)}
        policy={editingRemoveMembersPolicy}
        db={db}
      />
      <ConfirmDeleteModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        policy={confirmDelete}
        onConfirm={handleConfirmDelete}
      />
      <PolicyCreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        db={db}
      />
    </Section>
  );
}

function Stat({ label, sub, value }: { label: string; sub: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-white/[0.03]">
      <div className="flex flex-col items-start">
        <span className="text-sm font-semibold normal-case text-gray-600 dark:text-gray-300">{label}</span>
        <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">{sub}</p>
      </div>
      <div className="text-md font-semibold text-gray-800 dark:text-white/90">{value}</div>
    </div>
  );
}
