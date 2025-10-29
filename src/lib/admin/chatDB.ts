export type Chat = {
  id: string;
  userId: string;
  title: string | null;
  visibility: "public" | "private" | null;
  createdAt: string;
};

export type MessagePart = { text?: string } & Record<string, unknown>;

export type DBMessage = {
  id: string;
  chatId: string;
  role: string;
  parts: string | MessagePart[] | Record<string, unknown>;
  attachments?: unknown;
  createdAt: string;
};

export async function getAllChatsForUser(userId: string) {
  const res = await fetch(
    `/api/admin/users/${encodeURIComponent(userId)}/chats`,
    { cache: "no-store" }
  );
  const json: unknown = await res.json();
  const data =
    (json as { ok?: boolean; error?: string; items?: Chat[] }) ?? {};

  if (!res.ok || data.ok === false) {
    throw new Error(data.error ?? "FETCH_CHATS_FAILED");
  }
  return (data.items ?? []) as Chat[];
}

export async function getAllMessagesForChat(chatId: string) {
  const res = await fetch(
    `/api/admin/chats/${encodeURIComponent(chatId)}/message`,
    { cache: "no-store" }
  );
  const json: unknown = await res.json();
  const data =
    (json as { ok?: boolean; error?: string; items?: DBMessage[] }) ?? {};

  if (!res.ok || data.ok === false) {
    throw new Error(data.error ?? "FETCH_MESSAGES_FAILED");
  }
  return (data.items ?? []) as DBMessage[];
}
