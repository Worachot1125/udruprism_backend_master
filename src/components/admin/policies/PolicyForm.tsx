// src/components/admin/groups/PolicyCreateModal.tsx
"use client";
import * as React from "react";
import { Modal } from "@/components/ui/modal";
import Switch from "@/components/form/switch/Switch";
import { usePolicyDB, type UIModelOption } from "@/lib/admin/policyDB";

export type PolicyFormValues = {
  name: string;
  detail?: string;
  tokenLimit?: number;
  fileLimit?: number;
  fileSize?: number;
  share?: boolean;
  models?: string[];
  defaultModel?: string;
  defaultTokenLimit?: number;
};

export default function PolicyCreateModal({
  open,
  onClose,
  onSubmit,
  db,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit?: (v: PolicyFormValues) => void | Promise<void>;
  db?: ReturnType<typeof usePolicyDB>;
}) {
  /* ---------- DB hook (robust) ---------- */
  const localDb = usePolicyDB();
  const DB = db ?? localDb;

  /* ---------- form states ---------- */
  const [name, setName] = React.useState("");
  const [detail, setDetail] = React.useState("");
  const [tokenLimit, setTokenLimit] = React.useState<string>("");
  const [fileLimit, setFileLimit] = React.useState<string>("2");
  const [fileSize, setFileSize] = React.useState<string>("5");
  const [share, setShare] = React.useState(false);

  const [selectedModels, setSelectedModels] = React.useState<string[]>([]);
  const [pickModelId, setPickModelId] = React.useState<string>("");
  const [defaultModel, setDefaultModel] = React.useState<string>("");
  const [defaultTokenLimit, setDefaultTokenLimit] = React.useState<string>("");

  const [submitting, setSubmitting] = React.useState(false);
  const [err, setErr] = React.useState<string>("");

  const availableModels = DB.activeModels ?? [];

  // สร้าง metadata map เพื่อให้แสดงชื่อ/ผู้ให้บริการได้แม้เลือกไว้ก่อนหน้า
  const [modelMeta, setModelMeta] = React.useState<Map<string, UIModelOption>>(new Map());

  /* ---------- init everytime modal opens ---------- */
  React.useEffect(() => {
    if (!open) return;

    // reset form
    setName("");
    setDetail("");
    setTokenLimit("");
    setFileLimit("2");
    setFileSize("5");
    setShare(false);
    setSelectedModels([]);
    setPickModelId("");
    setDefaultModel("");
    setDefaultTokenLimit("");
    setErr("");
    setSubmitting(false);

    // load model catalog
    DB.loadAllModels?.().catch(() => void 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // เติม meta จาก availableModels เมื่อเปลี่ยน
  React.useEffect(() => {
    if (!availableModels?.length) return;
    setModelMeta((prev) => {
      const m = new Map(prev);
      for (const mm of availableModels) if (!m.has(mm.id)) m.set(mm.id, mm);
      return m;
    });
  }, [availableModels]);

  /* ---------- derived ---------- */
  const selectableModels = React.useMemo(
    () => availableModels.filter((m) => !selectedModels.includes(m.id)),
    [availableModels, selectedModels]
  );

  // Default choices = เฉพาะโมเดลที่ถูกเลือกแล้ว
  const defaultChoices = React.useMemo(
    () =>
      selectedModels
        .map((id) => modelMeta.get(id) || availableModels.find((x) => x.id === id))
        .filter(Boolean) as UIModelOption[],
    [selectedModels, modelMeta, availableModels]
  );

  const toNum = (v: string) => (v.trim() === "" ? undefined : Number.parseInt(v, 10));

  /* ---------- actions ---------- */
  const addPickedModel = () => {
    if (!pickModelId) return;
    if (selectedModels.includes(pickModelId)) return;
    setSelectedModels((prev) => [...prev, pickModelId]);
    setPickModelId("");
  };

  const removeModel = (id: string) => {
    setSelectedModels((prev) => prev.filter((x) => x !== id));
    // ถ้าลบตัวที่ตั้งเป็น default อยู่ ให้เคลียร์ default
    setDefaultModel((d) => (d === id ? "" : d));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    setErr("");

    // validations
    if (!name.trim()) return setErr("Please enter policy name");
    if (selectedModels.length === 0) return setErr("Please select at least one AI model");
    if (!defaultModel || !selectedModels.includes(defaultModel))
      return setErr("Please choose a default model from the selected models");

    setSubmitting(true);
    try {
      const payload: PolicyFormValues = {
        name: name.trim(),
        detail: detail.trim() || undefined,
        tokenLimit: toNum(tokenLimit),
        fileLimit: toNum(fileLimit),
        fileSize: toNum(fileSize),
        share,
        defaultModel,
        defaultTokenLimit: toNum(defaultTokenLimit),
        models: selectedModels,
      };

      // ถ้ามี onSubmit ภายนอก ก็เรียกใช้ (รองรับ reuse)
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        // workflow ปกติ: สร้าง policy + ผูกโมเดล
        const id = await DB.createPolicy(payload);
        if (selectedModels.length > 0) {
          await DB.addModelsToPolicy(id, selectedModels);
        }
        await DB.refresh?.();
      }

      onClose();
    } catch {
      setErr("Failed to create policy");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- styles ---------- */
  const inputBase =
    "w-full rounded-lg border px-4 py-2.5 text-sm border-gray-300 bg-white text-gray-800 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-violet-400 transition-colors";
  const labelBase = "block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300";
  const sectionBase = "rounded-xl border bg-white dark:border-gray-700 dark:bg-gray-900/50";

  return (
    <Modal isOpen={open} onClose={onClose} showCloseButton className="max-w-2xl">
      {/* Header */}
      <div className="border-b px-5 py-4">
        <h2 className="text-lg font-semibold">Create Policy</h2>
        <p className="mt-1 text-sm text-gray-500">Define limits and options for this policy.</p>
      </div>

      {/* Body */}
      <div className="max-h-[65vh] overflow-y-auto px-5 py-4">
        <form onSubmit={handleSubmit} className="grid gap-6">
          {/* Basic Settings */}
          <div className={`${sectionBase} p-6`}>
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Basic Settings</h3>
            <div className="grid gap-4">
              <div>
                <label className={labelBase}>
                  Policy Name <span className="text-red-600">*</span>
                </label>
                <input
                  className={inputBase}
                  placeholder="e.g. Faculty Policy"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className={labelBase}>Details</label>
                <textarea
                  className={inputBase}
                  placeholder="Optional description for this policy"
                  rows={3}
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Resource Limits */}
          <div className={`${sectionBase} p-6`}>
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Resource Limits</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className={labelBase}>
                  Token Limit <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  className={inputBase}
                  placeholder="0"
                  value={tokenLimit}
                  onChange={(e) => setTokenLimit(e.target.value)}
                />
              </div>
              <div>
                <label className={labelBase}>
                  File Limit <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  className={inputBase}
                  placeholder="0"
                  value={fileLimit}
                  onChange={(e) => setFileLimit(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelBase}>
                  File Size (MB) <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  className={inputBase}
                  placeholder="0"
                  value={fileSize}
                  onChange={(e) => setFileSize(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mt-6 max-w-md">
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-white/[0.03]">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Allow Sharing
                  </label>
                </div>
                <Switch checked={share} onChange={setShare} />
              </div>
            </div>
          </div>

          {/* AI Models (allowed) */}
          <div className={`${sectionBase} p-6`}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex flex-col">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Models</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Select allowed models for this policy
                </p>
              </div>
              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {selectedModels.length} models
              </span>
            </div>

            {/* Add */}
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className={labelBase}>Add model</label>
                <select
                  className={`${inputBase} cursor-pointer`}
                  value={pickModelId}
                  onChange={(e) => setPickModelId(e.target.value)}
                >
                  <option value="">-- Select a model --</option>
                  {selectableModels.map((m) => (
                    <option key={`pick-${m.id}`} value={m.id}>
                      {m.provider} — {m.name} ({m.modelId})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={addPickedModel}
                disabled={!pickModelId}
              >
                Add
              </button>
            </div>

            {/* Selected list */}
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/20">
              <div className="max-h-64 overflow-y-auto p-2">
                {selectedModels.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {selectedModels.map((id) => {
                      const m = modelMeta.get(id) || availableModels.find((x) => x.id === id);
                      if (!m) return null;
                      const isDefault = defaultModel === id;
                      return (
                        <div
                          key={`sel-${id}`}
                          className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 text-sm dark:border-gray-600 dark:bg-gray-800"
                        >
                          <div className="min-w-0 pr-3">
                            <div className="flex items-center gap-2">
                              <div className="truncate font-medium text-gray-800 dark:text-white/90">
                                {m.name}
                              </div>
                              {isDefault && (
                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                              {m.provider} · <span className="font-mono text-[11px]">{m.modelId}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeModel(id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-500 px-2 py-1 text-xs font-medium text-white hover:bg-red-600"
                            title="Remove model"
                          >
                            {/* inline svg (no external .svg) */}
                            <svg
                              viewBox="0 0 24 24"
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                            >
                              <path d="M3 6h18M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-1 14H8a2 2 0 0 1-2-2V6h12v12a2 2 0 0 1-2 2Z" />
                              <path d="M10 11v6M14 11v6" />
                            </svg>
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                    <div className="mb-1 text-sm">No models selected</div>
                    <div className="text-xs">Use the dropdown above to add models</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Default Model & Default token */}
          <div className={`${sectionBase} p-6`}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Default AI Model</h3>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Fallback AI model used when main models are unavailable.
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={labelBase}>
                  Default Model <span className="text-red-600">*</span>
                </label>
                <select
                  className={`${inputBase} cursor-pointer`}
                  value={defaultModel}
                  onChange={(e) => setDefaultModel(e.target.value)}
                  required
                >
                  <option value="">-- Select default model --</option>
                  {defaultChoices.map((m) => (
                    <option key={`default-${m.id}`} value={m.id}>
                      {m.provider} — {m.name} ({m.modelId})
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Must be one of the selected models above.
                </p>
              </div>

              <div>
                <label className={labelBase}>Default token limit</label>
                <input
                  type="number"
                  min={0}
                  className={inputBase}
                  placeholder="0"
                  value={defaultTokenLimit}
                  onChange={(e) => setDefaultTokenLimit(e.target.value)}
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Optional per-request token limit used by default.
                </p>
              </div>
            </div>
          </div>

          {/* Error */}
          {err && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/30 dark:bg-red-900/20 dark:text-red-400">
              {err}
            </div>
          )}
        </form>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 border-t px-5 py-4">
        <button
          className="rounded-lg border bg-white px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          onClick={onClose}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus-visible:ring-blue-400/30 shadow-sm hover:shadow-md"
          onClick={() => handleSubmit()}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <svg
                className="h-4 w-4 animate-spin text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Creating Policy...
            </>
          ) : (
            "Create Policy"
          )}
        </button>
      </div>
    </Modal>
  );
}
