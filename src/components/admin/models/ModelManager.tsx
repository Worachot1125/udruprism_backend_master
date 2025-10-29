// components/admin/models/ModelManager.tsx
"use client";
import * as React from "react";
import { useModelsDB } from "@/lib/admin/modelsDB";
import { Modal } from "@/components/ui/modal";
import Section from "@/components/admin/Section";
import { VirtualTable } from "@/components/admin/common/VirtualTable";
import Switch from "@/components/form/switch/Switch";
import { useAvailableModels } from "@/lib/admin/availableModels";
import { formatDateTime, toLocalInputValue } from "@/lib/admin/datetime";

type Model = {
  id: string;
  modelId: string;
  name: string;
  provider: string;
  is_active: boolean;
  createdAt: string;
  description?: string | null;
};

type EditableModel = {
  id?: string;
  modelId: string;
  name: string;
  provider: string;
  is_active: boolean;
  createdAt: string;
  description?: string | null;
};

export default function ModelManager() {
  const {
    items,
    total,
    page,
    pageSize,
    pageCount,
    loading,
    q,
    setQ,
    fetchList,
    setPage,
    create,
    update,
    remove,
  } = useModelsDB();

  const [searchInput, setSearchInput] = React.useState(q);

  React.useEffect(() => {
    fetchList({ page, q });
  }, [page, q, fetchList]);

  const [modelsTotalDisplay, setModelsTotalDisplay] = React.useState(0);
  React.useEffect(() => {
    setModelsTotalDisplay(total);
  }, [items, page, pageSize, pageCount, total]);

  const runSearch = React.useCallback(() => {
    setPage(1);
    setQ?.(searchInput);
    fetchList({ page: 1, q: searchInput });
  }, [fetchList, searchInput, setPage, setQ]);

  const onSearchKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") runSearch();
  };

  const [openEdit, setOpenEdit] = React.useState(false);
  const [editing, setEditing] = React.useState<EditableModel | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [openConfirm, setOpenConfirm] = React.useState(false);
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // ✅ Multi-select state (ต่อหน้า)
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  React.useEffect(() => {
    setSelectedIds([]);
  }, [page]);

  const {
    items: availableModels,
    fetchList: fetchAvailableModels,
    loading: loadingAvailableModels,
  } = useAvailableModels();

  const startCreate = () => {
    setEditing({
      modelId: "",
      name: "",
      provider: "",
      is_active: true,
      createdAt: new Date().toISOString(),
      description: null,
    });
    setOpenEdit(true);
    if (availableModels.length === 0) fetchAvailableModels().catch(() => {});
  };

  const startEdit = (row: Model) => {
    setEditing({
      id: row.id,
      modelId: row.modelId,
      name: row.name,
      provider: row.provider,
      is_active: !!row.is_active,
      createdAt: row.createdAt,
      description: row.description ?? null,
    });
    setOpenEdit(true);
    if (availableModels.length === 0) fetchAvailableModels().catch(() => {});
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const payload: EditableModel = { ...editing };
      if (
        payload.createdAt &&
        typeof payload.createdAt === "string" &&
        payload.createdAt.includes("T") &&
        !payload.createdAt.endsWith("Z")
      ) {
        const d = new Date(payload.createdAt);
        if (!Number.isNaN(d.getTime())) payload.createdAt = d.toISOString();
      }
      if (payload.id) {
        const { id, ...rest } = payload;
        await update(id, rest);
      } else {
        await create(payload);
      }
      setOpenEdit(false);
    } finally {
      setSaving(false);
    }
  };

  const askDelete = (id: string) => {
    setPendingDeleteId(id);
    setOpenConfirm(true);
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      if (pendingDeleteId) {
        await remove(pendingDeleteId);
        setPendingDeleteId(null);
      } else {
        const ids = [...selectedIds];
        if (ids.length) {
          // ลบหลายรายการแบบขนาน เพื่อลดเวลารอ
          await Promise.allSettled(ids.map((id) => remove(id)));
        }
        setSelectedIds([]);
      }
      setOpenConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pageCount) return;
    setPage(newPage);
  };

  const typedItems = items as Model[];

  const allIdsOnPage = React.useMemo(() => typedItems.map((m) => m.id), [typedItems]);
  const allSelectedOnPage =
    selectedIds.length > 0 &&
    allIdsOnPage.length > 0 &&
    allIdsOnPage.every((id) => selectedIds.includes(id));
  const someSelectedOnPage =
    selectedIds.length > 0 &&
    allIdsOnPage.some((id) => selectedIds.includes(id)) &&
    !allSelectedOnPage;

  // ✅ indeterminate state สำหรับหัวตาราง
  const headerRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (headerRef.current) headerRef.current.indeterminate = someSelectedOnPage;
  }, [someSelectedOnPage]);

  return (
    <Section
      title="Models"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={startCreate}
            disabled={loading}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + New AI Model
          </button>
          {selectedIds.length > 0 && (
            <button
              onClick={() => {
                setPendingDeleteId(null);
                setOpenConfirm(true);
              }}
              className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700"
            >
              Delete selected ({selectedIds.length})
            </button>
          )}
        </div>
      }
    >
      {/* Search */}
      <div className="relative mb-3 max-w-sm">
        <input
          className="h-10 w-full rounded-lg border px-3 pr-10 text-sm transition-colors"
          placeholder="Search models… (press Enter)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={onSearchKeyDown}
        />
      </div>

      {/* Card + Table */}
      <div className="overflow-x-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Table Header */}
        <div
          className="
            grid h-12 items-center rounded-t-2xl border-b bg-gray-50/60 text-left text-sm font-medium
            [grid-template-columns:1fr_4fr_3fr_2fr_1fr_2fr_3fr_1fr]
          "
        >
          <div className="px-5">
            <input
              ref={headerRef}
              type="checkbox"
              checked={allSelectedOnPage}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedIds((prev) => Array.from(new Set([...prev, ...allIdsOnPage])));
                } else {
                  setSelectedIds((prev) => prev.filter((id) => !allIdsOnPage.includes(id)));
                }
              }}
              aria-checked={someSelectedOnPage ? "mixed" : allSelectedOnPage}
            />
          </div>
          <div className="px-5">Model ID</div>
          <div className="px-3">Name</div>
          <div className="px-3">Provider</div>
          <div className="px-3">Active</div>
          <div className="px-3">
            Created <span className="text-xs text-gray-600">D/M/Y H:M:S</span>
          </div>
          <div className="px-3">Description</div>
          <div className="px-3">Action</div>
        </div>

        {/* Loading State */}
        {loading && typedItems.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-gray-500">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <span>Loading models...</span>
            </div>
          </div>
        )}

        {/* Table Content */}
        {!loading && typedItems.length > 0 && (
          <VirtualTable
            items={typedItems}
            rowHeight={56}
            renderRow={({ item: m }: { item: Model }) => (
              <div
                className="
                  grid h-14 items-center border-b text-sm transition-colors hover:bg-gray-50
                  [grid-template-columns:1fr_4fr_3fr_2fr_1fr_2fr_3fr_1fr]
                "
              >
                <div className="px-5">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(m.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds((prev) => [...prev, m.id]);
                      } else {
                        setSelectedIds((prev) => prev.filter((id) => id !== m.id));
                      }
                    }}
                    aria-label={`Select ${m.name}`}
                  />
                </div>

                <div className="px-5 truncate" title={m.modelId}>
                  {m.modelId}
                </div>
                <div className="px-3 truncate" title={m.name}>
                  {m.name}
                </div>
                <div className="px-3 truncate" title={m.provider}>
                  {m.provider}
                </div>

                <div className="px-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                      m.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {m.is_active ? "Enabled" : "Disabled"}
                  </span>
                </div>

                <div className="px-3 text-sm text-gray-600">{formatDateTime(m.createdAt)}</div>

                <div className="px-3 truncate text-gray-600" title={m.description ?? ""}>
                  {m.description ?? <span className="text-gray-400">—</span>}
                </div>

                <div className="px-5 text-right">
                  <div className="inline-flex gap-2">
                    <button
                      onClick={() => startEdit(m)}
                      className="rounded-lg bg-blue-600/80 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                      aria-label={`Edit ${m.name}`}
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
                      onClick={() => askDelete(m.id)}
                      className="rounded-lg bg-red-600/80 px-3 py-1 text-sm text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                      aria-label={`Delete ${m.name}`}
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
            )}
          />
        )}

        {/* Empty State */}
        {!loading && typedItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 rounded-full bg-gray-100 p-4">
              <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="mb-2 text-sm text-gray-500">No models found</div>
            {searchInput && (
              <div className="text-xs text-gray-400">
                Try adjusting your search or{" "}
                <button onClick={() => setSearchInput("")} className="text-blue-600 hover:text-blue-700">
                  clear filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && typedItems.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-gray-600">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, modelsTotalDisplay)} of {modelsTotalDisplay} models
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border px-3 py-1 text-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || loading}
            >
              ← Prev
            </button>
            <span className="min-w-[80px] text-center text-sm text-gray-600">
              Page {page} of {pageCount}
            </span>
            <button
              className="rounded-lg border px-3 py-1 text-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= pageCount || loading}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Modal: New/Edit */}
      <Modal
        isOpen={openEdit}
        onClose={() => !saving && setOpenEdit(false)}
        showCloseButton={!saving}
        className="max-w-150 p-3"
      >
        <div className="flex items-center justify-between border-b px-3 py-3">
          <div className="font-semibold">{editing?.id ? "Edit Model" : "New Model"}</div>
        </div>

        <div className="space-y-4 px-4 py-4">
          {/* Select from available */}
          <label className="block text-sm">
            <span className="text-gray-700">Model Name</span>
            {loadingAvailableModels ? (
              <div className="mt-1 flex h-9 w-full items-center rounded-lg border px-3 text-sm text-gray-400">
                Loading available models...
              </div>
            ) : (
              <select
                className="mt-1 h-9 w-full rounded-lg border px-3 text-sm transition-colors"
                value={editing?.name ?? ""}
                onChange={(e) => {
                  const selected = availableModels.find((m) => m.name === e.target.value);
                  if (selected) {
                    setEditing((s) =>
                      s
                        ? {
                            ...s,
                            name: selected.name,
                            modelId: selected.id,
                            provider: selected.provider,
                            description: selected.description ?? null,
                          }
                        : s
                    );
                  }
                }}
              >
                <option value="">-- Select a model --</option>
                {availableModels.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.provider} — {m.name}
                  </option>
                ))}
              </select>
            )}
          </label>

          {/* Model ID (read-only) */}
          <label className="block text-sm">
            <span className="text-gray-700">Model ID</span>
            <input
              className="mt-1 h-9 w-full rounded-lg border bg-gray-50 px-3 text-sm text-gray-600"
              value={editing?.modelId ?? ""}
              readOnly
              disabled
            />
          </label>

          {/* Provider (editable) */}
          <label className="block text-sm">
            <span className="text-gray-700">Provider</span>
            <input
              className="mt-1 h-9 w-full rounded-lg border px-3 text-sm"
              value={editing?.provider ?? ""}
              onChange={(e) => setEditing((s) => (s ? { ...s, provider: e.target.value } : s))}
            />
          </label>

          {/* Description (editable) */}
          <label className="block text-sm">
            <span className="text-gray-700">Description</span>
            <textarea
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              rows={3}
              placeholder="Short description for this model"
              value={editing?.description ?? ""}
              onChange={(e) => setEditing((s) => (s ? { ...s, description: e.target.value } : s))}
            />
          </label>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="text-gray-700">Created at</span>
              <input
                type="datetime-local"
                className="mt-1 h-9 w-full rounded-lg border px-3 text-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                value={toLocalInputValue(editing?.createdAt)}
                onChange={(e) => setEditing((s) => (s ? { ...s, createdAt: e.target.value } : s))}
              />
            </label>

            <div className="flex items-center justify-between rounded-lg border bg-gray-50 p-3">
              <div>
                <div className="text-sm font-medium text-gray-700">Active</div>
                <div className="text-xs text-gray-500">Enable or disable this model</div>
              </div>
              <Switch
                checked={!!editing?.is_active}
                onChange={(v: boolean) => setEditing((s) => (s ? { ...s, is_active: v } : s))}
              />
            </div>
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
            disabled={saving || !editing?.name}
          >
            {saving && <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />}
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
          {pendingDeleteId
            ? "Are you sure you want to delete this model? This action cannot be undone."
            : `Are you sure you want to delete ${selectedIds.length} selected models? This action cannot be undone.`}
        </div>
        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <button
            className="rounded-full border px-4 py-2 text-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
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
            {deleting && <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </Modal>
    </Section>
  );
}
