// lib/admin/availableModels.ts
"use client";
import * as React from "react";

export type RemoteModel = {
  id: string;
  name: string;
  provider: string;
  description?: string | null;
};

type Resp = {
  models: RemoteModel[];
};

// ---------- helpers: type guards ----------
function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object";
}
function isString(v: unknown): v is string {
  return typeof v === "string";
}
function isRemoteModel(v: unknown): v is RemoteModel {
  if (!isRecord(v)) return false;
  return isString(v.id) && isString(v.name) && isString(v.provider) &&
    (v.description === undefined || v.description === null || isString(v.description));
}
function isResp(v: unknown): v is Resp {
  return isRecord(v) && Array.isArray(v.models) && v.models.every(isRemoteModel);
}

// ---------- safe JSON + fetch ----------
async function parseJsonSafe(input: Response): Promise<unknown> {
  // อ่านเป็น text ก่อน เผื่อไม่ใช่ JSON ที่แท้จริง
  const raw = await input.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw; // คืนข้อความดิบไว้เป็น error message ได้
  }
}

/** Fetch แล้วโยน error ที่อ่านง่าย โดยไม่ใช้ `any` */
async function j<TExpected>(r: Response): Promise<TExpected> {
  const data = await parseJsonSafe(r);
  if (!r.ok) {
    const msg =
      (isRecord(data) && isString(data.error) && data.error) ||
      (typeof data === "string" && data) ||
      `HTTP ${r.status}`;
    throw new Error(msg);
  }
  // ปล่อยให้ผู้เรียก validate ต่อ (เราคืน unknown shape ที่ผู้เรียกจะตรวจอีกชั้น)
  return data as TExpected;
}

export function useAvailableModels() {
  const [items, setItems] = React.useState<RemoteModel[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchList = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/admin/models/ai", { cache: "no-store" });
      const data = await j<unknown>(resp);

      // ตรวจรูปแบบผลลัพธ์ให้แน่ใจ
      if (isResp(data)) {
        setItems(data.models);
      } else if (isRecord(data) && Array.isArray(data.models)) {
        // มี models แต่ object ภายในยังไม่ตรง ให้กรองเฉพาะที่ผ่าน guard
        const safe = data.models.filter(isRemoteModel);
        setItems(safe);
      } else {
        setItems([]);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load models";
      setError(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { items, loading, error, fetchList };
}
