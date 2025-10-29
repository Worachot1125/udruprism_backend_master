/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React from "react";
import Section from "@/components/admin/Section";
import SearchAndFilterBar from "@/components/admin/common/SearchAndFilterBar";
import { VirtualTable } from "@/components/admin/common/VirtualTable";
import { usePagedUsers } from "@/lib/admin/pagedUsersDB";
import { Modal } from "@/components/ui/modal";
import { getAllChatsForUser, getAllMessagesForChat } from "@/lib/admin/chatDB";

type Chat = {
  id: string;
  title: string | null;
  createdAt: string;
  visibility?: string | null;
};

type MessagePart = { text?: string; [k: string]: unknown };
type Message =
  | {
      id: string;
      chatId: string;
      role: string;
      parts: MessagePart[];
      attachments?: unknown;
      createdAt: string;
    }
  | {
      id: string;
      chatId: string;
      role: string;
      parts: string;
      attachments?: unknown;
      createdAt: string;
    }
  | {
      id: string;
      chatId: string;
      role: string;
      parts: unknown;
      attachments?: unknown;
      createdAt: string;
    };

type APIUser = {
  id: string;
  fullName?: string;
  email?: string;
  major?: string;
  faculty?: string;
  policyName?: string | null;
  policyId?: string | null;
  year?: number | null;
};

type PagedUser = {
  id: string;
  fullName?: string;
  email?: string;
  major?: string;
  faculty?: string;
  policyName?: string | null;
  policyId?: string | null;
  year?: number | string;
};

export default function MessageReports() {
  const {
    users,
    total,
    page,
    pageSize,
    pageCount,
    loading,
    setPage,
    setQuery,
  } = usePagedUsers({}, 100);

  // ---------- normalize users ----------
  const normalizedUsers: PagedUser[] = React.useMemo(
    () =>
      (users as APIUser[]).map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        major: u.major,
        faculty: u.faculty,
        policyName: u.policyName ?? null,
        policyId: u.policyId ?? null,
        year: u.year ?? undefined,
      })),
    [users]
  );

  // ---------- filters ----------
  const [search, setSearch] = React.useState("");
  const [policyId, setPolicyId] = React.useState<string | undefined>(undefined);
  const [domain, setDomain] = React.useState<string | undefined>(undefined);
  const [faculty, setFaculty] = React.useState<string | undefined>(undefined);
  const [major, setMajor] = React.useState<string | undefined>(undefined);
  const [year, setYear] = React.useState<number | undefined>(undefined);

  React.useEffect(() => {
    setQuery({
      q: search.trim() || undefined,
      policyId: policyId || undefined,
      domain: domain || undefined,
      faculty: faculty || undefined,
      major: major || undefined,
      year: year ?? undefined,
    });
  }, [search, policyId, domain, faculty, major, year, setQuery]);

  const filteredUsers = React.useMemo(() => {
    return normalizedUsers.filter((u) => {
      if (faculty && u.faculty !== faculty) return false;
      if (major && u.major !== major) return false;
      if (year && Number(u.year) !== Number(year)) return false;
      return true;
    });
  }, [normalizedUsers, faculty, major, year]);

  // ---------- Chat/Message (Popup) ----------
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [activeUserId, setActiveUserId] = React.useState<string | null>(null);
  const [activeUserName, setActiveUserName] = React.useState<string>("");

  const [chats, setChats] = React.useState<Chat[]>([]);
  const [chatsLoading, setChatsLoading] = React.useState(false);
  const [activeChatId, setActiveChatId] = React.useState<string | null>(null);

  const [messages, setMessages] = React.useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = React.useState(false);

  const fetchChats = React.useCallback(async (uid: string) => {
    setChatsLoading(true);
    setActiveChatId(null);
    setMessages([]);
    try {
      const items = await getAllChatsForUser(uid);
      setChats(items);
    } finally {
      setChatsLoading(false);
    }
  }, []);

  const fetchMessages = React.useCallback(async (cid: string) => {
    setMessagesLoading(true);
    try {
      const items = await getAllMessagesForChat(cid);
      setMessages(items);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const handleOpenChats = React.useCallback(
    (u: PagedUser) => {
      setActiveUserId(u.id);
      setActiveUserName(u.fullName || u.email || u.id);
      fetchChats(u.id);
      setIsChatOpen(true);
    },
    [fetchChats]
  );

  const openChat = React.useCallback(
    (c: Chat) => {
      setActiveChatId(c.id);
      fetchMessages(c.id);
    },
    [fetchMessages]
  );

  const closeModal = React.useCallback(() => {
    setIsChatOpen(false);
    setActiveChatId(null);
    setMessages([]);
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    if (isChatOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isChatOpen, closeModal]);

  const isMessagePartArray = (parts: unknown): parts is MessagePart[] =>
    Array.isArray(parts);

  return (
    <Section title="Users">
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

      {/* Users table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        {/* ใช้ 32 คอลัมน์ทั้ง header และ rows ให้ตรงกัน */}
        <div className="sticky top-0 z-10 grid h-12 grid-cols-32 items-center border-b border-gray-200 bg-gray-50/60 text-left text-sm min-w-[880px]">
          <div className="col-span-2" />
          <div className="col-span-8 px-3 font-medium text-gray-700">
            Name / StudentID
          </div>
          <div className="col-span-8 px-3 font-medium text-gray-700">Email</div>
          <div className="col-span-6 px-3 font-medium text-gray-700">
            Major / Faculty
          </div>
          <div className="col-span-4 px-3 font-medium text-gray-700">Policy</div>
          <div className="col-span-2 px-3 font-medium text-gray-700">Year</div>
          <div className="col-span-2 px-3 font-medium text-gray-700">Action</div>
        </div>

        <VirtualTable<PagedUser>
          items={filteredUsers}
          rowHeight={52}
          renderRow={({ item: u }) => (
            <div className="grid grid-cols-32 h-13 min-w-[880px] items-center text-sm transition-colors hover:bg-gray-50">
              <div className="col-span-2" />
              <div className="col-span-8 px-3">
                <div
                  className="max-w-[240px] truncate font-medium"
                  title={u.fullName}
                >
                  {u.fullName}
                </div>
                <div className="block truncate text-xs text-gray-500">
                  ID: {u.id || "-"}
                </div>
              </div>
              <div className="col-span-8 px-3">
                <div className="max-w-[260px] truncate" title={u.email}>
                  {u.email}
                </div>
              </div>
              <div className="col-span-6 px-3">
                <div className="max-w-[220px] truncate" title={u.major}>
                  {u.major}
                </div>
                <div
                  className="max-w-[220px] truncate text-xs text-gray-500"
                  title={u.faculty}
                >
                  {u.faculty}
                </div>
              </div>
              <div className="col-span-4 px-3">
                <div
                  className="max-w-[120px] truncate"
                  title={u.policyName ?? u.policyId ?? "-"}
                >
                  {u.policyName ?? u.policyId ?? "-"}
                </div>
              </div>
              <div className="col-span-2 px-3">{u.year}</div>
              <div className="col-span-2 px-3">
                <button
                  onClick={() => handleOpenChats(u)}
                  title="ดูแชทของผู้ใช้นี้"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm ring-1 ring-inset ring-blue-500/20 transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 active:bg-blue-800"
                >
                  <svg
                    aria-hidden
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M6.5 6.75h11A3.25 3.25 0 0 1 20.75 10v4a3.25 3.25 0 0 1-3.25 3.25h-4.9a1 1 0 0 0-.62.22l-3.6 2.8a.8.8 0 0 1-1.28-.64v-2.2H6.5A3.25 3.25 0 0 1 3.25 14v-4A3.25 3.25 0 0 1 6.5 6.75Z"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx={9.25} cy={12} r={1.1} fill="currentColor" />
                    <circle cx={12} cy={12} r={1.1} fill="currentColor" />
                    <circle cx={14.75} cy={12} r={1.1} fill="currentColor" />
                  </svg>
                  Chat
                </button>
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
            : `Showing ${(page - 1) * pageSize + 1}–${Math.min(
                page * pageSize,
                total
              )} of ${total}`}
        </div>

        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1 || loading}
          >
            ← Prev
          </button>

          <span className="text-sm text-gray-700">
            Page {page} / {pageCount}
          </span>

          <button
            className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
            onClick={() => setPage(page + 1)}
            disabled={page >= pageCount || loading}
          >
            Next →
          </button>
        </div>
      </div>

      {/* ===== Modal: Chats & Messages ===== */}
      <Modal isOpen={isChatOpen} onClose={closeModal} showCloseButton>
        <div className="w-[96vw] max-w-6xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                  <path
                    d="M6.5 6.75h11A3.25 3.25 0 0 1 20.75 10v4a3.25 3.25 0 0 1-3.25 3.25h-4.9a1 1 0 0 0-.62.22l-3.6 2.8a.8.8 0 0 1-1.28-.64v-2.2H6.5A3.25 3.25 0 0 1 3.25 14v-4A3.25 3.25 0 0 1 6.5 6.75Z"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx={9.25} cy={12} r={1.1} fill="currentColor" />
                  <circle cx={12} cy={12} r={1.1} fill="currentColor" />
                  <circle cx={14.75} cy={12} r={1.1} fill="currentColor" />
                </svg>
              </span>
              <div className="font-semibold">
                Chat :
                <span className="ml-1 text-gray-700">
                  {activeUserName || activeUserId}
                </span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="grid h-[72vh] lg:grid-cols-[340px_1fr]">
            {/* Left */}
            <div className="overflow-auto border-r">
              <div className="sticky top-0 z-10 border-b bg-white/90 px-4 py-2 text-sm font-medium backdrop-blur">
                รายการแชท
              </div>
              {chatsLoading ? (
                <div className="p-4 text-sm text-gray-500">Loading…</div>
              ) : chats.length === 0 ? (
                <div className="p-6 text-sm text-gray-500">
                  ยังไม่มีแชทสำหรับผู้ใช้นี้
                </div>
              ) : (
                <ul className="divide-y">
                  {chats.map((c) => {
                    const active = c.id === activeChatId;
                    return (
                      <li key={c.id}>
                        <button
                          onClick={() => openChat(c)}
                          className={`w-full text-left px-4 py-3 transition hover:bg-slate-50 ${
                            active ? "bg-slate-50 ring-1 ring-inset ring-slate-200" : ""
                          }`}
                          title={c.title ?? ""}
                        >
                          <div className="flex items-center justify-between">
                            <div className="max-w-[75%] truncate font-medium">
                              {c.title || "(ไม่มีชื่อเรื่อง)"}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              {new Date(c.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 ring-1 ring-inset ${
                                c.visibility === "private"
                                  ? "bg-rose-50 text-rose-700 ring-rose-200"
                                  : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                              }`}
                            >
                              {c.visibility ?? "public"}
                            </span>
                            <span className="truncate">ID: {c.id}</span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Right */}
            <div className="overflow-auto">
              <div className="sticky top-0 z-10 border-b bg-white/90 px-4 py-2 text-sm font-medium backdrop-blur">
                ข้อความ
              </div>
              {!activeChatId ? (
                <div className="p-6 text-sm text-gray-500">
                  เลือกรายการแชทเพื่อดูข้อความ
                </div>
              ) : messagesLoading ? (
                <div className="p-6 text-sm text-gray-500">Loading…</div>
              ) : (
                <div className="space-y-2 p-4">
                  {messages.length === 0 && (
                    <div className="p-2 text-sm text-gray-500">
                      ยังไม่มีข้อความในแชทนี้
                    </div>
                  )}
                  {messages.map((m) => {
                    const parts = (m as { parts: unknown }).parts;
                    const text = Array.isArray(parts)
                      ? (parts as MessagePart[]).find((p) => typeof p?.text === "string")?.text ??
                        JSON.stringify(parts)
                      : typeof parts === "string"
                      ? parts
                      : JSON.stringify(parts);
                    const mine = m.role === "user";
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ring-1 ring-inset ${
                            mine ? "bg-slate-50 ring-slate-200" : "bg-white ring-slate-200"
                          }`}
                          title={new Date(m.createdAt).toLocaleString()}
                        >
                          <div className="mb-1 text-[10px] uppercase tracking-wide text-gray-500">
                            {m.role}
                          </div>
                          <div className="whitespace-pre-wrap break-words">{text}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </Section>
  );
}
