"use client";
import * as React from "react";
import { VirtualTable } from "@/components/admin/common/VirtualTable";
import SearchAndFilterBar from "@/components/admin/common/SearchAndFilterBar";
import {
  clearSelection,
  isSelected,
  selectAllFiltered,
  type SelectionState,
} from "@/components/admin/common/selection";
import { usePagedUsers, type APIUser as PagedUser } from "@/lib/admin/pagedUsersDB";
import { usePagedBans } from "@/lib/admin/pagedBansDB";
import {
  computeEndAt,
  DurationKey,
  formatDateTime,
  rangeText,
  useHeaderCheckboxState,
  useIndeterminate,
  handleCheck,
} from "./hooks";

type BanPayload = { reason?: string; endAt?: string };

export default function UserBanTab({
  bannedPolicyIds,
  activeBannedPolicies,
  activeBannedUsers,
  policyNameById,
  banMany,
  unban,
  unbanMany,
  askConfirm,
  userBans,
  policyBans,
}: {
  bannedPolicyIds: string[];
  activeBannedPolicies: Set<string>;
  activeBannedUsers: Set<string>;
  policyNameById: Map<string, string>;
  banMany: (ids: string[], payload: BanPayload) => Promise<void> | void;
  unban: (id: string) => Promise<void> | void;
  unbanMany: (ids: string[]) => Promise<void> | void;
  askConfirm: (cfg: { title: string; body: React.ReactNode; onConfirm: () => void | Promise<void> }) => void;
  userBans: ReturnType<typeof usePagedBans>;
  policyBans: ReturnType<typeof usePagedBans>;
}) {
  /* ---------- LEFT: Search users (paged) ---------- */
  const [q, setQ] = React.useState("");
  const [domain, setDomain] = React.useState<string | undefined>();
  const [policyFilter, setPolicyFilter] = React.useState("");
  const [selLeft, setSelLeft] = React.useState<SelectionState>(clearSelection());

  const [basket, setBasket] = React.useState<PagedUser[]>([]);
  const basketIdSet = React.useMemo(() => new Set(basket.map((u) => u.id)), [basket]);
  const excludeIds = React.useMemo(() => {
    const s = new Set<string>();
    activeBannedUsers.forEach((id) => s.add(id));
    basket.forEach((u) => s.add(u.id));
    return Array.from(s);
  }, [activeBannedUsers, basket]);

  const {
    users: pagedUsers,
    total: usersTotal,
    page: usersPage,
    pageSize: usersPageSize,
    pageCount: usersPageCount,
    loading: usersLoading,
    setPage: setUsersPage,
    setQuery: setUsersQuery,
  } = usePagedUsers({ q: "", policyId: undefined, domain: undefined }, 100, 60_000, {
    autoInit: true,
    debounceMs: 250,
  });

  React.useEffect(() => {
    setUsersQuery({
      q: q.trim() || undefined,
      policyId: policyFilter || undefined,
      domain: domain || undefined,
      excludeIds,
      excludeBannedPolicies: Array.from(activeBannedPolicies),
    });
    setSelLeft(clearSelection());
  }, [q, policyFilter, domain, excludeIds, activeBannedPolicies, setUsersQuery]);

  const visibleUsers: PagedUser[] = React.useMemo(
    () => pagedUsers.filter((u) => !basketIdSet.has(u.id)),
    [pagedUsers, basketIdSet]
  );

  const leftIds = React.useMemo(() => visibleUsers.map((u) => u.id), [visibleUsers]);
  const leftHeader = useHeaderCheckboxState(selLeft, leftIds);
  const leftHeaderRef = React.useRef<HTMLInputElement>(null!);
  useIndeterminate(leftHeaderRef, leftHeader.indeterminate);
  const toggleSelectAllLeft = () =>
    leftHeader.checked ? setSelLeft(clearSelection()) : setSelLeft(selectAllFiltered());

  const addSelectedToBasket = () => {
    const ids =
      selLeft.mode === "some"
        ? Array.from(selLeft.picked)
        : selLeft.mode === "allFiltered"
          ? visibleUsers.filter((u) => !selLeft.excluded.has(u.id)).map((u) => u.id)
          : [];
    if (!ids.length) return;
    const idSet = new Set(basket.map((u) => u.id));
    const toAdd = visibleUsers.filter((u) => ids.includes(u.id) && !idSet.has(u.id));
    setBasket((b) => [...b, ...toAdd]);
    setSelLeft(clearSelection());
  };

  /* ---------- RIGHT: Basket (local filter) ---------- */
  const [qBasket, setQBasket] = React.useState("");
  const [basketPolicyFilter, setBasketPolicyFilter] = React.useState("");
  const [basketDomain, setBasketDomain] = React.useState<string | undefined>();

  const basketFiltered: PagedUser[] = React.useMemo(() => {
    const qq = qBasket.trim().toLowerCase();
    return basket.filter((u) => {
      if (basketPolicyFilter && (u.policyId ?? "") !== basketPolicyFilter) return false;
      if (basketDomain && !u.email.toLowerCase().endsWith(basketDomain)) return false;
      if (!qq) return true;
      const hay = `${u.fullName} ${u.email}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [basket, qBasket, basketPolicyFilter, basketDomain]);

  /* ---------- Ban actions panel ---------- */
  const [reason, setReason] = React.useState("");
  const [duration, setDuration] = React.useState<DurationKey>("1h");
  const [customEndAt, setCustomEndAt] = React.useState<string>("");

  const handleBan = () => {
    if (!basket.length) return;
    const endAt = computeEndAt(duration, customEndAt);
    askConfirm({
      title: "Confirm User Ban",
      body: (
        <>
          Are you sure you want to ban <b>{basket.length}</b> user(s)?
          {reason && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
              <strong>Reason:</strong>
              <div className="mt-1 max-h-32 overflow-auto break-words whitespace-pre-wrap">
                {reason}
              </div>
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
        await banMany(basket.map((u) => u.id), { reason: reason || undefined, endAt });
        setBasket([]);
        setReason("");
        setCustomEndAt("");
        userBans.refetch?.();
        policyBans.refetch?.();
      },
    });
  };

  /* ---------- Current bans (USER) ---------- */
  const [qBans, setQBans] = React.useState("");
  const [banDomain, setBanDomain] = React.useState<string | undefined>();
  const [selBans, setSelBans] = React.useState<SelectionState>(clearSelection());

  const { setQuery: setUserBansQuery } = userBans;

  React.useEffect(() => {
    setUserBansQuery({
      kind: "user",
      q: qBans.trim() || undefined,
      domain: banDomain || undefined,
    });
    setSelBans(clearSelection());
  }, [qBans, banDomain, setUserBansQuery]);

  const filteredBans = userBans.items;
  const banIds = React.useMemo(() => filteredBans.map((r) => r.id), [filteredBans]);
  const bansHeader = useHeaderCheckboxState(selBans, banIds);
  const bansHeaderRef = React.useRef<HTMLInputElement>(null!);
  useIndeterminate(bansHeaderRef, bansHeader.indeterminate);
  const toggleSelectAllBans = () =>
    bansHeader.checked ? setSelBans(clearSelection()) : setSelBans(selectAllFiltered());

  const confirmUnbanOne = (id: string, label: string) => {
    askConfirm({
      title: "Confirm Unban",
      body: (
        <>
          Unban <b>{label}</b>?
        </>
      ),
      onConfirm: async () => {
        await unban(id);
        setSelBans(clearSelection());
        userBans.refetch?.();
        policyBans.refetch?.();
      },
    });
  };

  const bulkUnban = React.useCallback(() => {
    const ids =
      selBans.mode === "some"
        ? Array.from(selBans.picked)
        : selBans.mode === "allFiltered"
          ? filteredBans.filter((r) => !selBans.excluded.has(r.id)).map((r) => r.id)
          : [];
    if (!ids.length) return;
    askConfirm({
      title: "Confirm Unban",
      body: (
        <>
          Are you sure you want to unban <b>{ids.length}</b> record(s)?
        </>
      ),
      onConfirm: async () => {
        await unbanMany(ids);
        setSelBans(clearSelection());
        userBans.refetch?.();
        policyBans.refetch?.();
      },
    });
  }, [selBans, filteredBans, unbanMany, askConfirm, userBans, policyBans]);

  const labelOf = (u: PagedUser) =>
    u.policyName ?? (u.policyId ? policyNameById.get(u.policyId) || u.policyId : "-");

  // Add quick actions for duration
  const quickDurations: { key: DurationKey; label: string }[] = [
    { key: "30m", label: "30m" },
    { key: "1h", label: "1h" },
    { key: "2h", label: "2h" },
    { key: "1d", label: "1d" },
    { key: "7d", label: "7d" },
  ];

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* LEFT */}
      <div className="col-span-12 xl:col-span-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium">Search users</div>
          <div className="text-xs text-gray-500">
            Total: {usersTotal} • In basket: {basket.length}
          </div>
        </div>
        <div className="mb-3">
          <SearchAndFilterBar
            search={q}
            onSearch={(v) => {
              setQ(v);
              setSelLeft(clearSelection());
            }}
            policyId={policyFilter || undefined}
            onPolicyChange={(id) => {
              setPolicyFilter(id ?? "");
              setSelLeft(clearSelection());
            }}
            bannedPolicyIds={bannedPolicyIds}
            disableBannedPolicies
            domain={domain}
            onDomainChange={(v) => {
              setDomain(v);
              setSelLeft(clearSelection());
            }}
            showFacultyFilter={false}
            showMajorFilter={false}
            showYearFilter={false}
            placeholder="Search name / email…"
          />
        </div>

        <div className="flex flex-col h-[600px] rounded-xl border">
          <div className="grid grid-cols-12 border-b text-left text-sm bg-gray-50">
            <div className="col-span-1 px-2 py-2">
              <label className="inline-flex items-center gap-2">
                <input
                  ref={leftHeaderRef}
                  type="checkbox"
                  checked={leftHeader.checked}
                  onChange={toggleSelectAllLeft}
                  aria-label="Select all users in view"
                />
              </label>
            </div>
            <div className="col-span-4 px-2 py-2 font-medium">Name</div>
            <div className="col-span-4 px-2 py-2 font-medium">Email</div>
            <div className="col-span-3 px-2 py-2 font-medium">Policy</div>
          </div>

          <VirtualTable
            items={visibleUsers}
            rowHeight={48}
            renderRow={({ item: u }) => (
              <div className="grid grid-cols-12 items-center border-b text-sm hover:bg-gray-50 group">
                <div className="col-span-1 px-2 py-2">
                  <input
                    type="checkbox"
                    aria-label={`Select ${u.fullName}`}
                    checked={isSelected(u.id, selLeft)}
                    onChange={handleCheck(u.id, setSelLeft)}
                  />
                </div>
                <div className="col-span-4 px-2 py-2">
                  <div className="font-medium">{u.fullName}</div>
                  <div className="text-xs text-gray-500 block truncate">ID: {u.id}</div>
                </div>
                <div className="col-span-4 px-2 py-2 block truncate" title={u.email}>{u.email}</div>
                <div className="col-span-3 px-2 py-2">
                  <span className="inline-block max-w-full truncate" title={String(labelOf(u) ?? "-")}>
                    {String(labelOf(u) ?? "-")}
                  </span>
                </div>
              </div>
            )}
          />
          <div className="flex border-t px-3 py-2 items-center justify-between bg-gray-50">
            <div className="flex items-center gap-3">
              <button
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white shadow-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                onClick={addSelectedToBasket}
                disabled={selLeft.mode === "none" || (selLeft.mode === "some" && selLeft.picked.size === 0)}
              >
                Add Selected to Basket →
              </button>
              <div className="text-xs text-gray-600">
                Selected: <b>{leftHeader.selectedCount}</b> / {leftIds.length}
              </div>
            </div>
            {leftHeader.selectedCount > 0 && (
              <div className="text-xs text-blue-600 font-medium">
                {leftHeader.selectedCount} user(s) ready to add
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-2 pb-2">
          <div className="ml-2 text-sm text-gray-600">
            {usersLoading ? (
              <span className="flex items-center gap-2">
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse"></div>
                Loading...
              </span>
            ) : (
              `Showing ${(usersPage - 1) * usersPageSize + 1}–${Math.min(
                usersPage * usersPageSize,
                usersTotal
              )} of ${usersTotal}`
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
              onClick={() => setUsersPage(usersPage - 1)}
              disabled={usersPage <= 1 || usersLoading}
              aria-label="Previous page"
            >
              ← Prev
            </button>
            <span className="text-sm text-gray-700 min-w-[100px] text-center">
              Page {usersPage} / {usersPageCount}
            </span>
            <button
              className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
              onClick={() => setUsersPage(usersPage + 1)}
              disabled={usersPage >= usersPageCount || usersLoading}
              aria-label="Next page"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT: Basket */}
      <div className="col-span-12 xl:col-span-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium">Ban basket</div>
          <div className="text-xs text-gray-500">
            Total: {basket.length} • Filtered: {basketFiltered.length}
          </div>
        </div>
        <div className="mb-3">
          <SearchAndFilterBar
            search={qBasket}
            onSearch={(v) => {
              setQBasket(v);
            }}
            policyId={basketPolicyFilter || undefined}
            onPolicyChange={(id) => {
              setBasketPolicyFilter(id ?? "");
            }}
            bannedPolicyIds={bannedPolicyIds}
            disableBannedPolicies
            domain={basketDomain}
            onDomainChange={(v) => {
              setBasketDomain(v);
            }}
            showFacultyFilter={false}
            showMajorFilter={false}
            showYearFilter={false}
            placeholder="Search name / email…"
          />
        </div>

        <div className="flex-col flex h-[600px] rounded-xl border">
          <div className="grid grid-cols-12 border-b text-left text-sm bg-gray-50">
            <div className="col-span-5 px-2 py-2 font-medium">User</div>
            <div className="col-span-5 px-2 py-2 font-medium">Email</div>
            <div className="col-span-2 px-2 py-2 font-medium text-center">Actions</div>
          </div>

          {basketFiltered.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
              {basket.length === 0 ? "No users in basket" : "No users match your search"}
            </div>
          ) : (
            <VirtualTable
              items={basketFiltered}
              rowHeight={48}
              renderRow={({ item: u }) => (
                <div className="grid grid-cols-12 items-center border-b text-sm hover:bg-gray-50 group">
                  <div className="col-span-5 px-2 py-2">
                    <div className="font-medium">{u.fullName}</div>
                    <div className="text-xs text-gray-500 block truncate">ID: {u.id}</div>
                  </div>
                  <div className="col-span-5 px-2 py-2">
                    <span className="block truncate" title={u.email}>
                      {u.email}
                    </span>
                  </div>
                  <div className="col-span-2 px-2 py-2 flex justify-center">
                    <button
                      onClick={() => setBasket((b) => b.filter((x) => x.id !== u.id))}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-2 py-1 text-xs text-white font-medium bg-red-400 hover:bg-red-500 transition-colors"
                      title="Remove from basket"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            />
          )}
          <div className="flex border-t px-3 py-2 items-center justify-between bg-gray-50">
            <button
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white shadow-sm hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              onClick={() => setBasket([])}
              disabled={!basket.length}
            >
              Clear Entire Basket
            </button>
            <div className="text-xs text-gray-600">
              In basket: <b>{basket.length}</b> • Showing: <b>{basketFiltered.length}</b>
            </div>
          </div>
        </div>
      </div>

      {/* Ban action panel */}
      <div className="col-span-12">
        <div className="mt-4 rounded-xl border bg-gray-50 p-4">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-8">
              <label className="text-sm block font-medium">
                Ban Reason
                <textarea
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm transition-colors"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why are you banning these users? (Optional but recommended)"
                />
              </label>
            </div>
            <div className="col-span-12 lg:col-span-4">
              <label className="text-sm block font-medium">
                Ban Duration
                <select
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm transition-colors"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value as DurationKey)}
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

              {duration === "custom" && (
                <div className="mt-2">
                  <input
                    type="datetime-local"
                    className="w-full rounded-lg border px-3 py-2 text-sm transition-colors"
                    min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
                    value={customEndAt}
                    onChange={(e) => setCustomEndAt(e.target.value)}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Select future date and time
                  </div>
                </div>
              )}

              {/* Quick duration buttons */}
              {duration !== "custom" && duration !== "∞" && (
                <div className="mt-2">
                  <div className="text-xs text-gray-600 mb-1">Quick select:</div>
                  <div className="flex flex-wrap gap-1">
                    {quickDurations.map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        className={`px-2 py-1 text-xs rounded border transition-colors ${duration === key
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                          }`}
                        onClick={() => setDuration(key)}
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
              Ready to ban: <b>{basket.length}</b> user(s)
              {reason && " • With reason"}
              {duration !== "∞" && " • Temporary ban"}
            </div>
            <button
              className="ml-auto rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              onClick={handleBan}
              disabled={!basket.length || (duration === "custom" && !customEndAt)}
            >
              Ban {basket.length} User{basket.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>

      {/* Current bans — USER */}
      <div className="col-span-12 mt-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium">Current user bans</div>
          <div className="text-xs text-gray-500">
            Total: {userBans.total} • Active: {filteredBans.length}
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <SearchAndFilterBar
            search={qBans}
            onSearch={(v) => {
              setQBans(v);
              setSelBans(clearSelection());
            }}
            domain={banDomain}
            onDomainChange={(v) => {
              setBanDomain(v);
              setSelBans(clearSelection());
            }}
            showPolicyFilter={false}
            showFacultyFilter={false}
            showMajorFilter={false}
            showYearFilter={false}
            placeholder="Search name / email…"
          />

          <div className="ml-auto flex items-center gap-3">
            <div className="text-xs text-gray-600">
              Selected: <b>{bansHeader.selectedCount}</b> / {banIds.length}
            </div>
            <button
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white shadow-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              onClick={bulkUnban}
              disabled={
                selBans.mode === "none" ||
                (selBans.mode === "some" && selBans.picked.size === 0)
              }
            >
              Unban Selected ({bansHeader.selectedCount})
            </button>
          </div>
        </div>

        <div className="rounded-xl border">
          {filteredBans.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
              No active bans found
            </div>
          ) : (
            <>
              <div className="grid grid-cols-12 border-b text-left text-sm bg-gray-50">
                <div className="col-span-1 px-2 py-2">
                  <label className="inline-flex items-center gap-2">
                    <input
                      ref={bansHeaderRef}
                      type="checkbox"
                      checked={bansHeader.checked}
                      onChange={toggleSelectAllBans}
                      aria-label="Select all bans in view"
                    />
                  </label>
                </div>
                <div className="col-span-2 px-2 py-2 font-medium">User</div>
                <div className="col-span-4 px-2 py-2 font-medium">Reason</div>
                <div className="col-span-2 px-2 py-2 font-medium">Start <span className="text-xs text-gray-600">D/M/Y H:M:S</span></div>
                <div className="col-span-2 px-2 py-2 font-medium">End <span className="text-xs text-gray-600">D/M/Y H:M:S</span></div>
                <div className="col-span-1 px-2 py-2 font-medium text-center">Actions</div>
              </div>

              <VirtualTable
                items={filteredBans}
                rowHeight={50}
                renderRow={({ item }) => {
                  const u = item.user;
                  return (
                    <div className="grid grid-cols-12 items-center border-b text-sm hover:bg-gray-50">
                      <div className="col-span-1 px-2 py-2">
                        <input
                          type="checkbox"
                          checked={isSelected(item.id, selBans)}
                          onChange={handleCheck(item.id, setSelBans)}
                          aria-label={`Select ban ${item.id}`}
                        />
                      </div>
                      <div className="col-span-2 px-2 py-2">
                        <div className="font-medium truncate">{u?.fullName ?? "-"}</div>
                        <div className="text-xs text-gray-500 truncate">{u?.email ?? "-"}</div>
                      </div>
                      <div className="col-span-4 px-2 py-2">
                        <div className="truncate" title={item.reason || ""}>
                          {item.reason || <span className="text-gray-400">No reason provided</span>}
                        </div>
                      </div>
                      <div className="col-span-2 px-2 py-2 text-sm">{formatDateTime(item.startAt)}</div>
                      <div className="col-span-2 px-2 py-2 text-sm">
                        {item.endAt ? formatDateTime(item.endAt) : "Indefinite"}
                      </div>
                      <div className="col-span-1 px-2 py-2 flex justify-center">
                        <button
                          className="rounded-lg border px-3 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                          onClick={() => confirmUnbanOne(item.id, u?.fullName ?? "this user ban")}
                        >
                          Unban
                        </button>
                      </div>
                    </div>
                  );
                }}
              />
            </>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="ml-2 text-sm text-gray-600">
            {userBans.loading ? (
              <span className="flex items-center gap-2">
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse"></div>
                Loading bans...
              </span>
            ) : (
              rangeText(userBans.page, userBans.pageSize, userBans.total)
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
              onClick={() => userBans.setPage(userBans.page - 1)}
              disabled={userBans.page <= 1 || userBans.loading}
              aria-label="Previous page"
            >
              ← Prev
            </button>
            <span className="text-sm text-gray-700 min-w-[100px] text-center">
              Page {userBans.page} / {userBans.pageCount}
            </span>
            <button
              className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
              onClick={() => userBans.setPage(userBans.page + 1)}
              disabled={userBans.page >= userBans.pageCount || userBans.loading}
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