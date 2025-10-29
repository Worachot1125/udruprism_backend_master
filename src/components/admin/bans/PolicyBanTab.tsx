// src/components/admin/bans/PolicyBanTab.tsx
"use client";
import * as React from "react";
import { VirtualTable } from "@/components/admin/common/VirtualTable";
import {
  clearSelection,
  isSelected,
  selectAllFiltered,
  type SelectionState,
} from "@/components/admin/common/selection";
import { usePagedBans } from "@/lib/admin/pagedBansDB";
import { useAdminOptions } from "@/lib/admin/filter";
import {
  computeEndAt,
  type DurationKey,
  formatDateTime,
  rangeText,
  useHeaderCheckboxState,
  useIndeterminate,
  handleCheck,
} from "./hooks";

type PolicyBanItem = {
  id: string;
  policyId: string;
  policyName?: string | null;
  reason?: string | null;
  startAt: string;
  endAt: string | null;
};

type BanPayload = { reason?: string; endAt?: string };

// ✅ ประกาศชนิด props ให้รวม activeBannedPolicies
export interface PolicyBanTabProps {
  activeBannedPolicies: Set<string>;
  banPolicy?: (policyId: string, payload: BanPayload) => Promise<void> | void;
  unban: (id: string) => Promise<void> | void;
  unbanMany: (ids: string[]) => Promise<void> | void;
  askConfirm: (cfg: { title: string; body: React.ReactNode; onConfirm: () => void | Promise<void> }) => void;
  userBans: ReturnType<typeof usePagedBans>;
  policyBans: ReturnType<typeof usePagedBans>;
}

export default function PolicyBanTab({
  activeBannedPolicies,
  banPolicy,
  unban,
  unbanMany,
  askConfirm,
  userBans,
  policyBans,
}: PolicyBanTabProps) {
  const [policyId, setPolicyId] = React.useState<string>("");
  const [policyReason, setPolicyReason] = React.useState("");
  const [policyDuration, setPolicyDuration] = React.useState<DurationKey>("1h");
  const [policyCustomEndAt, setPolicyCustomEndAt] = React.useState<string>("");
  const [qPolicy, setQPolicy] = React.useState("");
  const [selPolicyBans, setSelPolicyBans] = React.useState<SelectionState>(clearSelection());

  React.useEffect(() => {
    policyBans.setQuery({
      kind: "policy",
      q: qPolicy.trim() || undefined,
    });
    setSelPolicyBans(clearSelection());
  }, [qPolicy, policyBans]);

  const policyItems = policyBans.items as PolicyBanItem[];
  const policyBanIds = React.useMemo(() => policyItems.map((r) => r.id), [policyItems]);
  const policyBansHeader = useHeaderCheckboxState(selPolicyBans, policyBanIds);
  const policyBansHeaderRef = React.useRef<HTMLInputElement>(null!);
  useIndeterminate(policyBansHeaderRef, policyBansHeader.indeterminate);

  const { policies: fetchedPolicies, loading: loadingPolicies } = useAdminOptions();

  const policyNameById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const p of fetchedPolicies) m.set(String(p.id), String(p.name));
    return m;
  }, [fetchedPolicies]);

  // ✅ รวมชุดที่ถูกแบนที่มาจาก props + ที่ derive จากรายการในตาราง (กันกรณี refetch ยังไม่ทัน)
  const bannedPolicyIds = React.useMemo(() => {
    const now = Date.now();
    const s = new Set<string>(activeBannedPolicies);
    for (const b of policyItems) {
      const stillActive = !b.endAt || new Date(b.endAt).getTime() > now;
      if (stillActive && b.policyId) s.add(String(b.policyId));
    }
    return s;
  }, [activeBannedPolicies, policyItems]);

  const toggleSelectAllPolicyBans = () =>
    policyBansHeader.checked
      ? setSelPolicyBans(clearSelection())
      : setSelPolicyBans(selectAllFiltered());

  const bulkUnbanPolicies = React.useCallback(() => {
    const ids =
      selPolicyBans.mode === "some"
        ? Array.from(selPolicyBans.picked)
        : selPolicyBans.mode === "allFiltered"
          ? policyItems.filter((r) => !selPolicyBans.excluded.has(r.id)).map((r) => r.id)
          : [];
    if (!ids.length) return;
    askConfirm({
      title: "Confirm Unban",
      body: <>Are you sure you want to unban <b>{ids.length}</b> policy ban(s)?</>,
      onConfirm: async () => {
        await unbanMany(ids);
        setSelPolicyBans(clearSelection());
        userBans.refetch?.();
        policyBans.refetch?.();
      },
    });
  }, [selPolicyBans, policyItems, unbanMany, askConfirm, userBans, policyBans]);

  const quickDurations: { key: DurationKey; label: string }[] = [
    { key: "30m", label: "30m" },
    { key: "1h", label: "1h" },
    { key: "2h", label: "2h" },
    { key: "1d", label: "1d" },
    { key: "7d", label: "7d" },
  ];

  return (
    <div className="space-y-6">
      {/* Ban Policy Section */}
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-medium">Ban a policy</div>
          <div className="text-xs text-gray-500">
            Available policies: {fetchedPolicies.length}
          </div>
        </div>

        <div className="w-full md:w-[260px]">
          <label className="block text-sm font-medium">Select Policy</label>
          <select
            value={policyId}
            onChange={(e) => setPolicyId(e.target.value)}
            className="mt-1 h-11 w-full rounded-lg border px-3 text-sm truncate transition-colors"
            disabled={loadingPolicies || fetchedPolicies.length === 0}
            aria-label="Select policy to ban"
          >
            <option value="">
              {loadingPolicies ? "Loading policies…" : "-- Select policy --"}
            </option>

            {fetchedPolicies.map((p) => {
              const idStr = String(p.id);
              const banned = bannedPolicyIds.has(idStr);
              return (
                <option key={idStr} value={idStr} disabled={banned}>
                  {p.name}{banned ? " — Banned" : ""}
                </option>
              );
            })}
          </select>
          {loadingPolicies && (
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
              <div className="h-2 w-2 animate-pulse rounded-full bg-blue-600"></div>
              Loading policies...
            </div>
          )}
        </div>

        <div className="mt-4 rounded-xl border bg-gray-50 p-4">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-8">
              <label className="block text-sm font-medium">
                Ban Reason
                <textarea
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm transition-colors"
                  rows={3}
                  value={policyReason}
                  onChange={(e) => setPolicyReason(e.target.value)}
                  placeholder="Why are you banning this policy? (Optional but recommended)"
                />
              </label>
            </div>
            <div className="col-span-12 lg:col-span-4">
              <label className="block text-sm font-medium">
                Ban Duration
                <select
                  className="h-11 w-full rounded-lg border px-3 text-sm transition-colors"
                  value={policyDuration}
                  onChange={(e) => setPolicyDuration(e.target.value as DurationKey)}
                >
                  <option value="30m">30 minutes</option>
                  <option value="1h">1 hour</option>
                  <option value="2h">2 hours</option>
                  <option value="1d">1 day</option>
                  <option value="7d">7 days</option>
                  <option value="∞">Indefinite (∞)</option>
                  <option value="custom">Custom date/time…</option>
                </select>
              </label>

              {policyDuration === "custom" && (
                <div className="mt-2">
                  <input
                    type="datetime-local"
                    className="w-full rounded-lg border px-3 py-2 text-sm  transition-colors"
                    min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
                    value={policyCustomEndAt}
                    onChange={(e) => setPolicyCustomEndAt(e.target.value)}
                  />
                  <div className="mt-1 text-xs text-gray-500">
                    Select future date and time
                  </div>
                </div>
              )}

              {policyDuration !== "custom" && policyDuration !== "∞" && (
                <div className="mt-2">
                  <div className="mb-1 text-xs text-gray-600">Quick select:</div>
                  <div className="flex flex-wrap gap-1">
                    {quickDurations.map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        className={`rounded border px-2 py-1 text-xs transition-colors ${
                          policyDuration === key
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                        onClick={() => setPolicyDuration(key)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="text-sm text-gray-600">
              {policyId ? (
                <>
                  Ready to ban: <b>{policyNameById.get(policyId) || policyId}</b>
                  {policyReason && " • With reason"}
                  {policyDuration !== "∞" && " • Temporary ban"}
                </>
              ) : (
                "Select a policy to ban"
              )}
            </div>
            <button
              className="ml-auto rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              onClick={() => {
                if (!policyId || !banPolicy) return;
                const endAt = computeEndAt(policyDuration, policyCustomEndAt);
                const name = String(policyNameById.get(policyId) ?? policyId);
                askConfirm({
                  title: "Confirm Policy Ban",
                  body: (
                    <>
                      Are you sure you want to ban the policy <b>&quot;{name}&quot;</b>?
                      {policyReason && (
                        <div className="mt-2 max-h-32 overflow-auto break-words whitespace-pre-wrap rounded border border-yellow-200 bg-yellow-50 p-2 text-sm">
                          <strong>Reason:</strong>
                          <div className="mt-1">{policyReason}</div>
                        </div>
                      )}
                      {endAt && (
                        <div className="mt-1 text-sm">
                          <strong>Duration:</strong> Until {formatDateTime(endAt)}
                        </div>
                      )}
                    </>
                  ),
                  onConfirm: async () => {
                    await banPolicy(policyId, { reason: policyReason || undefined, endAt });
                    setPolicyReason("");
                    setPolicyCustomEndAt("");
                    setPolicyId("");
                    policyBans.refetch?.();
                  },
                });
              }}
              disabled={!policyId || (policyDuration === "custom" && !policyCustomEndAt)}
            >
              Ban Policy
            </button>
          </div>
        </div>
      </div>

      {/* Current policy bans */}
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-medium">Current policy bans</div>
          <div className="text-xs text-gray-500">
            Total: {policyBans.total} • Active: {policyItems.length}
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            type="text"
            className="h-10 w-full rounded-lg border px-3 text-sm transition-colors sm:w-[280px]"
            placeholder="Search policy name / reason…"
            value={qPolicy}
            onChange={(e) => setQPolicy(e.target.value)}
          />

          <div className="ml-auto flex items-center gap-3">
            <div className="text-xs text-gray-600">
              Selected: <b>{policyBansHeader.selectedCount}</b> / {policyBanIds.length}
            </div>
            <button
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              onClick={bulkUnbanPolicies}
              disabled={
                selPolicyBans.mode === "none" ||
                (selPolicyBans.mode === "some" && selPolicyBans.picked.size === 0)
              }
            >
              Unban Selected ({policyBansHeader.selectedCount})
            </button>
          </div>
        </div>

        <div className="rounded-xl border">
          {policyItems.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-gray-500">
              {policyBans.loading ? "Loading policy bans..." : "No active policy bans found"}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-12 border-b bg-gray-50 text-left text-sm">
                <div className="col-span-1 px-2 py-2">
                  <label className="inline-flex items-center gap-2">
                    <input
                      ref={policyBansHeaderRef}
                      type="checkbox"
                      checked={policyBansHeader.checked}
                      onChange={toggleSelectAllPolicyBans}
                      aria-label="Select all policy bans in view"
                    />
                  </label>
                </div>
                <div className="col-span-3 px-2 py-2 font-medium">Policy</div>
                <div className="col-span-3 px-2 py-2 font-medium">Reason</div>
                <div className="col-span-2 px-2 py-2 font-medium">
                  Start <span className="text-xs text-gray-600">D/M/Y H:M:S</span>
                </div>
                <div className="col-span-2 px-2 py-2 font-medium">
                  End <span className="text-xs text-gray-600">D/M/Y H:M:S</span>
                </div>
                <div className="col-span-1 px-2 py-2 text-center font-medium">Actions</div>
              </div>

              <VirtualTable
                items={policyItems}
                rowHeight={50}
                renderRow={({ item: b }) => (
                  <div className="group grid grid-cols-12 items-center border-b text-sm hover:bg-gray-50">
                    <div className="col-span-1 px-2 py-2">
                      <input
                        type="checkbox"
                        checked={isSelected(b.id, selPolicyBans)}
                        onChange={handleCheck(b.id, setSelPolicyBans)}
                        aria-label={`Select policy ban ${b.id}`}
                      />
                    </div>
                    <div className="col-span-3 px-2 py-2">
                      <div className="truncate font-medium" title={b.policyName ?? "-"}>
                        {b.policyName ?? "-"}
                      </div>
                    </div>
                    <div className="col-span-3 px-2 py-2">
                      <div className="truncate" title={b.reason || "-"}>
                        {b.reason || <span className="text-gray-400">No reason provided</span>}
                      </div>
                    </div>
                    <div className="col-span-2 px-2 py-2 text-sm">{formatDateTime(b.startAt)}</div>
                    <div className="col-span-2 px-2 py-2 text-sm">
                      {b.endAt ? formatDateTime(b.endAt) : "Indefinite"}
                    </div>
                    <div className="col-span-1 flex justify-center px-2 py-2">
                      <button
                        className="rounded-lg border bg-blue-600 px-3 py-1 text-xs text-white transition-colors hover:bg-blue-700"
                        onClick={() =>
                          askConfirm({
                            title: "Confirm Unban",
                            body: <>Unban policy <b>{b.policyName ?? "-"}</b>?</>,
                            onConfirm: async () => {
                              await unban(b.id);
                              setSelPolicyBans(clearSelection());
                              userBans.refetch?.();
                              policyBans.refetch?.();
                            },
                          })
                        }
                      >
                        Unban
                      </button>
                    </div>
                  </div>
                )}
              />
            </>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="ml-2 text-sm text-gray-600">
            {policyBans.loading ? (
              <span className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-blue-600"></div>
                Loading policy bans...
              </span>
            ) : (
              rangeText(policyBans.page, policyBans.pageSize, policyBans.total)
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border px-3 py-1 text-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
              onClick={() => policyBans.setPage(policyBans.page - 1)}
              disabled={policyBans.page <= 1 || policyBans.loading}
              aria-label="Previous page"
            >
              ← Prev
            </button>
            <span className="min-w-[100px] text-center text-sm text-gray-700">
              Page {policyBans.page} / {policyBans.pageCount}
            </span>
            <button
              className="rounded-lg border px-3 py-1 text-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
              onClick={() => policyBans.setPage(policyBans.page + 1)}
              disabled={policyBans.page >= policyBans.pageCount || policyBans.loading}
              aria-label="Next page"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
