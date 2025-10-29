"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";

/**
 * ตรวจสอบ session ด้วย 2 ขั้น:
 * 1) พยายามเรียก /api/auth/session (ถ้ามี) -> 200 แปลว่ามี session
 * 2) ถ้า endpoint ไม่มี/ล้มเหลว -> fallback ดู cookie 'session' ใน document.cookie
 */
async function hasSessionViaApi(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/session", { cache: "no-store" });
    return res.ok; // 200/204 ถือว่าโอเค
  } catch {
    return false;
  }
}
function hasSessionCookie(): boolean {
  if (typeof document === "undefined") return false;
  return /(?:^|;\s*)session=/.test(document.cookie);
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  // ป้องกัน flash: render หลังเช็คเสร็จ
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      // ขั้นที่ 1: ลองเช็คผ่าน API
      const ok = (await hasSessionViaApi()) || hasSessionCookie();
      if (!mounted) return;

      if (!ok) {
        // แนบ next path เพื่อกลับมาหน้าเดิมหลังล็อกอิน
        const next = encodeURIComponent(pathname || "/");
        router.replace(`/login?next=${next}`);
        return;
      }
      setReady(true);
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ยังเช็คไม่เสร็จ — ไม่ render หน้า (กัน hydration mismatch/หน้าเว็บ)
  if (!ready) return null;

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
      ? "lg:ml-[290px]"
      : "lg:ml-[90px]";

  return (
    <div className="min-h-screen xl:flex">
      {/* Sidebar and Backdrop */}
      <AppSidebar />
      <Backdrop />
      {/* Main Content Area */}
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}
      >
        {/* Header */}
        <AppHeader />
        {/* Page Content */}
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
