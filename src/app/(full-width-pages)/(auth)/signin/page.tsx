/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/(full-width-pages)/(auth)/signin/page.tsx
import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Next.js SignIn Page | TailAdmin - Next.js Dashboard Template",
  description: "This is Next.js Signin Page TailAdmin Dashboard Template",
};

// ✅ เวอร์ชันที่รองรับกรณีที่ Next ให้ searchParams เป็น Promise
export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // ถ้าจะใช้ค่า next:
  const sp = await searchParams; // <- สำคัญ: await ให้ถูก type
  // const next = typeof sp.next === "string" ? sp.next : "/";

  return <SignInForm />;
}
