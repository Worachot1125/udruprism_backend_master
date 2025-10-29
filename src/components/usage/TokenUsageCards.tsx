// src/components/usage/TokenUsageCards.tsx
// Server Component: ดึงข้อมูลตรงจาก Neon (drizzle-neon-http)
import React from "react";
import { db } from "@/lib/db";
import { tokenUsage } from "@/lib/schema";
import { sql } from "drizzle-orm";
import { GroupIcon } from "@/icons";

// helper format number
const fmt = (n: number) => n.toLocaleString("en-US");

export default async function TokenUsageCards() {
  // รวมค่าทั้งหมดของแต่ละฟิลด์ (NULL → 0)
  const [row] = await db
    .select({
      inputTokens: sql<number>`COALESCE(SUM(${tokenUsage.inputTokens}), 0)`,
      outputTokens: sql<number>`COALESCE(SUM(${tokenUsage.outputTokens}), 0)`,
      reasoningTokens: sql<number>`COALESCE(SUM(${tokenUsage.reasoningTokens}), 0)`,
      cachedInputTokens: sql<number>`COALESCE(SUM(${tokenUsage.cachedInputTokens}), 0)`,
    })
    .from(tokenUsage);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 md:gap-3">
      {/* Input tokens */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 px-3 dark:bg-gray-800 mr-2">
            <GroupIcon className="size-6 text-gray-800 dark:text-white/90" />
          </div>
        </div>
        <div className="mt-5 flex items-end justify-between">
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Input tokens</span>
            <h4 className="mt-2 text-xl font-bold text-gray-800 dark:text-white/90">
              {fmt(row.inputTokens ?? 0)}
            </h4>
          </div>
        </div>
      </div>

      {/* Output tokens */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-between">
          <div className="mr-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 px-3 dark:bg-gray-800">
            <GroupIcon className="size-6 text-gray-800 dark:text-white/90" />
          </div>
        </div>
        <div className="mt-5 flex items-end justify-between">
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Output tokens</span>
            <h4 className="mt-2 text-xl font-bold text-gray-800 dark:text-white/90">
              {fmt(row.outputTokens ?? 0)}
            </h4>
          </div>
        </div>
      </div>

      {/* Reasoning tokens */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-between">
          <div className="mr-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 px-3 dark:bg-gray-800">
            <GroupIcon className="size-6 text-gray-800 dark:text-white/90" />
          </div>
        </div>
        <div className="mt-5 flex items-end justify-between">
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Reasoning tokens</span>
            <h4 className="mt-2 text-xl font-bold text-gray-800 dark:text-white/90">
              {fmt(row.reasoningTokens ?? 0)}
            </h4>
          </div>
        </div>
      </div>

      {/* Cached input tokens */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-between">
          <div className="mr-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 px-3 dark:bg-gray-800">
            <GroupIcon className="size-6 text-gray-800 dark:text-white/90" />
          </div>
        </div>
        <div className="mt-5 flex items-end justify-between">
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Cached input tokens</span>
            <h4 className="mt-2 text-xl font-bold text-gray-800 dark:text-white/90">
              {fmt(row.cachedInputTokens ?? 0)}
            </h4>
          </div>
        </div>
      </div>
    </div>
  );
}
