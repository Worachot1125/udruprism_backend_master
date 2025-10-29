"use client";

import * as React from "react";
import Section from "@/components/admin/Section";
import { useDB } from "@/lib/admin/banDB";
import { usePagedBans } from "@/lib/admin/pagedBansDB";
import ConfirmDialog, { ConfirmCfg } from "./ConfirmDialog";
import UserBanTab from "./UserBanTab";
import PolicyBanTab from "./PolicyBanTab";

/* ===== minimal types ที่ใช้ในหน้านี้ ===== */
type Policy = { id: string; name: string };
type BanItem = {
  id: string;
  userId: string | null;
  policyId: string | null;
  endAt: string | null;
};

type BanPayload = { reason?: string; endAt?: string | null };

type AdminDB = {
  policies: Policy[];
  bans: BanItem[];
  banMany: (userIds: string[], payload: BanPayload) => Promise<void> | void;
  unban: (banId: string) => Promise<void> | void;
  unbanMany: (banIds: string[]) => Promise<void> | void;
  banPolicy?: (policyId: string, payload: BanPayload) => Promise<void> | void;
};

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
      active
        ? "bg-white border-t border-l border-r border-gray-300 text-blue-600"
        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
    }`}
    onClick={onClick}
  >
    {children}
  </button>
);

export default function BanManager() {
  const db = useDB() as unknown as AdminDB;
  const { policies, bans, banMany, unban, unbanMany, banPolicy } = db;
  const [activeTab, setActiveTab] = React.useState<"user" | "policy">("user");
  const userQuery = React.useMemo(() => ({ kind: "user" as const }), []);
  const policyQuery = React.useMemo(() => ({ kind: "policy" as const }), []);
  const userBans = usePagedBans(userQuery, 50);
  const policyBans = usePagedBans(policyQuery, 50);
  const [confirm, setConfirm] = React.useState<{ open: boolean } & ConfirmCfg>({
    open: false,
    title: "",
    body: null,
    onConfirm: () => {},
  });
  const askConfirm = (cfg: ConfirmCfg) => setConfirm({ open: true, ...cfg });
  const closeConfirm = () => setConfirm((s) => ({ ...s, open: false }));

  // policy name map
  const policyNameById = React.useMemo(
    () => new Map<string, string>(policies.map((g) => [String(g.id), String(g.name)] as const)),
    [policies]
  );

  // compute active sets
  const activeBannedPolicies = React.useMemo(() => {
    const s = new Set<string>();
    const now = Date.now();
    for (const b of bans) {
      if (!b.userId && b.policyId) {
        const end = b.endAt ? new Date(b.endAt).getTime() : Infinity;
        if (end > now) s.add(String(b.policyId));
      }
    }
    return s;
  }, [bans]);

  const activeBannedUsers = React.useMemo(() => {
    const s = new Set<string>();
    const now = Date.now();
    for (const b of bans) {
      if (b.userId) {
        const end = b.endAt ? new Date(b.endAt).getTime() : Infinity;
        if (end > now) s.add(String(b.userId));
      }
    }
    return s;
  }, [bans]);

  const bannedPolicyIds = React.useMemo(() => Array.from(activeBannedPolicies), [activeBannedPolicies]);

  return (
    <Section title="Management">
      {/* Confirm dialog */}
      <ConfirmDialog open={confirm.open} onClose={closeConfirm} cfg={confirm} />

      {/* Tabs */}
      <div className="flex border-b mb-4">
        <TabButton active={activeTab === "user"} onClick={() => setActiveTab("user")}>
          Ban by User
        </TabButton>
        <TabButton active={activeTab === "policy"} onClick={() => setActiveTab("policy")}>
          Ban by Policy
        </TabButton>
      </div>

      {activeTab === "user" ? (
        <UserBanTab
          //policies={policies}
          bannedPolicyIds={bannedPolicyIds}
          activeBannedPolicies={activeBannedPolicies}
          activeBannedUsers={activeBannedUsers}
          policyNameById={policyNameById}
          banMany={banMany}
          unban={unban}
          unbanMany={unbanMany}
          askConfirm={askConfirm}
          userBans={userBans}
          policyBans={policyBans}
        />
      ) : (
        <PolicyBanTab
          activeBannedPolicies={activeBannedPolicies}
          banPolicy={banPolicy}
          unban={unban}
          unbanMany={unbanMany}
          askConfirm={askConfirm}
          userBans={userBans}
          policyBans={policyBans}
        />
      )}
    </Section>
  );
}
