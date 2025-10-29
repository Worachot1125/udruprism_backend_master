/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import Switch from "@/components/form/switch/Switch";
import { usePolicyDB, type UIModelOption } from "@/lib/admin/policyDB";

type PolicyEditable = {
  id: string;
  name?: string;
  detail?: string;
  tokenLimit?: number;
  fileLimit?: number;
  fileSize?: number;
  share?: boolean;
  models?: string[];
  defaultModel?: string;
  defaultTokenLimit?: number;
};

export default function EditPolicyModal({
  open,
  onClose,
  policy,
  db,
}: {
  open: boolean;
  onClose: () => void;
  policy: PolicyEditable | null;
  db: ReturnType<typeof usePolicyDB>;
}) {
  // ---------- state ----------
  const [name, setName] = React.useState("");
  const [detail, setDetail] = React.useState("");
  const [tokenLimit, setTokenLimit] = React.useState<string>("");
  const [fileLimit, setFileLimit] = React.useState<string>("");
  const [fileSize, setFileSize] = React.useState<string>("");
  const [share, setShare] = React.useState(false);

  const [selectedModels, setSelectedModels] = React.useState<string[]>([]);
  const [modelMeta, setModelMeta] = React.useState<Map<string, UIModelOption>>(new Map());
  const [defaultModel, setDefaultModel] = React.useState<string>("");
  const [defaultTokenLimit, setDefaultTokenLimit] = React.useState<string>("");

  const availableModels = db.activeModels ?? []; // ทั้งหมดที่เปิดใช้งาน
  const [pickModelId, setPickModelId] = React.useState<string>("");

  const selectableModels = React.useMemo(
    () => availableModels.filter((m) => !selectedModels.includes(m.id)),
    [availableModels, selectedModels]
  );

  const [err, setErr] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);

  const toNum = (v: string) => {
    const s = v.trim();
    if (s === "") return undefined;
    const n = Number.parseInt(s, 10);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };

  // ---------- actions ----------
  const addPickedModel = () => {
    if (!pickModelId) return;
    if (selectedModels.includes(pickModelId)) return;
    setSelectedModels((prev) => [...prev, pickModelId]);
    setPickModelId("");
  };

  const removeModel = (id: string) => {
    setSelectedModels((prev) => prev.filter((x) => x !== id));
    setDefaultModel((d) => (d === id ? "" : d));
  };

  // โหลดค่าเริ่มต้นเมื่อ modal เปิด
  React.useEffect(() => {
    if (!open || !policy?.id) return;

    setName(policy.name ?? "");
    setDetail(policy.detail ?? "");
    setTokenLimit(
      Number.isFinite(policy.tokenLimit as number) && (policy.tokenLimit as number) > 0
        ? String(policy.tokenLimit)
        : ""
    );
    setFileLimit(
      Number.isFinite(policy.fileLimit as number) && (policy.fileLimit as number) > 0
        ? String(policy.fileLimit)
        : ""
    );
    setFileSize(
      Number.isFinite(policy.fileSize as number) && (policy.fileSize as number) > 0
        ? String(policy.fileSize)
        : ""
    );
    setShare(!!policy.share);
    setSelectedModels(policy.models ?? []);
    setDefaultModel(policy.defaultModel ?? "");
    setDefaultTokenLimit(
      Number.isFinite(policy.defaultTokenLimit as number) && (policy.defaultTokenLimit as number) > 0
        ? String(policy.defaultTokenLimit)
        : ""
    );
    setErr("");
    setPickModelId("");

    (async () => {
      try {
        // โหลด catalog model ทั้งหมดถ้ายังไม่โหลด
        await db.loadAllModels?.();
        // ดึงความสัมพันธ์ policy->models ล่าสุด
        const models = await db.fetchPolicyModels(policy.id);
        setSelectedModels(models.map((m) => m.id));
        setModelMeta(new Map(models.map((m) => [m.id, m])));
      } catch {
        /* ignore */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, policy?.id]);

  // เมื่อเลือกโมเดลเพิ่ม ให้เติม meta หากยังไม่มี
  React.useEffect(() => {
    if (!selectedModels.length) return;
    const map = new Map(modelMeta);
    for (const id of selectedModels) {
      if (!map.has(id)) {
        const found = availableModels.find((m) => m.id === id);
        if (found) map.set(id, found);
      }
    }
    if (map.size !== modelMeta.size) setModelMeta(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModels, availableModels]);

  // ถ้า defaultModel ไม่ได้อยู่ใน selectedModels แล้ว ให้เคลียร์
  React.useEffect(() => {
    if (defaultModel && !selectedModels.includes(defaultModel)) {
      setDefaultModel("");
    }
  }, [defaultModel, selectedModels]);

  // ---------- styles ----------
  const inputBase =
    "w-full rounded-lg border px-4 py-2.5 text-sm border-gray-300 bg-white text-gray-800 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-violet-400 transition-colors";
  const labelBase = "block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300";
  const sectionBase = "rounded-xl border bg-white dark:border-gray-700 dark:bg-gray-900/50";

  // ---------- save ----------
  const onSave = async () => {
    setErr("");
    if (!name.trim()) return setErr("Please enter policy name");
    if (selectedModels.length === 0) return setErr("Please select at least one AI model");

    // defaultModel ต้องอยู่ใน selectedModels
    if (!defaultModel || !selectedModels.includes(defaultModel)) {
      return setErr("Please choose a default model from the selected models");
    }
    if (!policy?.id) return;

    setSaving(true);
    try {
      // 1) update policy info
      await db.updatePolicy(policy.id, {
        name: name.trim(),
        detail: detail.trim() || undefined,
        tokenLimit: toNum(tokenLimit),
        fileLimit: toNum(fileLimit),
        fileSize: toNum(fileSize),
        share,
        defaultModel,
        defaultTokenLimit: toNum(defaultTokenLimit),
      });

      // 2) sync models
      const current = await db.fetchPolicyModels(policy.id);
      const currentIds = new Set(current.map((m) => m.id));
      const desiredIds = new Set(selectedModels);

      const toAdd = [...desiredIds].filter((id) => !currentIds.has(id));
      const toRemove = [...currentIds].filter((id) => !desiredIds.has(id));

      if (toAdd.length) await db.addModelsToPolicy(policy.id, toAdd);
      if (toRemove.length) await db.removeModelsFromPolicy(policy.id, toRemove);

      await db.refresh();
      onClose();
    } catch (e) {
      console.error(e);
      setErr("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (!policy) return null;

  // default model choices = เฉพาะโมเดลที่เลือก
  const defaultChoices = selectedModels
    .map((id) => modelMeta.get(id) || availableModels.find((m) => m.id === id))
    .filter(Boolean) as UIModelOption[];

  return (
    <Modal isOpen={open} onClose={onClose} showCloseButton className="max-w-2xl p-0">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Policy</h3>
        <p className="mt-1 text-sm text-gray-500">Define limits and options for this policy.</p>
      </div>

      {/* Body */}
      <div className="max-h-[65vh] overflow-y-auto px-6 py-5 grid gap-6">
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
                placeholder="Unlimited"
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
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Enable token sharing with other users
                </p>
              </div>
              <Switch checked={share} onChange={setShare} />
            </div>
          </div>
        </div>

        {/* AI Models */}
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

          {/* Add model */}
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
                    const m = availableModels.find((x) => x.id === id) ?? modelMeta.get(id);
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
                            {m.provider} ·{" "}
                            <span className="font-mono text-[11px]">{m.modelId}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeModel(id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-500 px-2 py-1 text-xs font-medium text-white hover:bg-red-600"
                          title="Remove model"
                        >
                          {/* inline svg (ไม่ใช้ไฟล์ .svg) */}
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

        {/* Default Model + Default token */}
        <div className={`${sectionBase} p-6`}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Default AI Model</h3>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Fallback AI model used when no specific model is chosen.
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

        {err && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/30 dark:bg-red-900/20 dark:text-red-400">
            {err}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
        <button
          className="rounded-lg border bg-white px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          onClick={onClose}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? (
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
              Saving…
            </>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>
    </Modal>
  );
}
