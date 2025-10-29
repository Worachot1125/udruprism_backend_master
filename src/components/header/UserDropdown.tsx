/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import Image from "next/image";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";

import { UserRound, Settings, LifeBuoy, LogOut, ChevronDown } from "lucide-react";

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();
  const isLoading = status === "loading";

  const fullName = session?.user?.name ?? "User";
  const firstName = fullName?.trim().split(/\s+/)[0] || "User";
  const email = session?.user?.email ?? "";
  const avatar = session?.user?.image ?? "/images/user/owner.jpg";

  const toggleDropdown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };
  const closeDropdown = () => setIsOpen(false);
  const handleLogout = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    closeDropdown();

    // เรียก API ของเราให้ลบ prism_session แล้วให้ NextAuth เซ็ต Set-Cookie ลบ session
    await fetch("/api/logout", {
      method: "POST",
      // ป้องกัน cache และให้แน่ใจว่า cookie ถูกส่งมาด้วย
      credentials: "same-origin",
      cache: "no-store",
    });

    // จากนั้นค่อยเปลี่ยนหน้าแบบ SPA (ไม่เกิด popup/แท็บใหม่)
    router.replace("/login");
    router.refresh();
  };

  if (isLoading) {
    return <div className="h-11 w-28 rounded-lg bg-gray-100 dark:bg-white/5 animate-pulse" />;
  }

  // สไตล์ไอคอนให้เห็นชัดขึ้นและสม่ำเสมอ
  const iconClass =
    "h-5 w-5 shrink-0 text-gray-600 group-hover:text-gray-800 dark:text-gray-300 dark:group-hover:text-gray-100";
  const iconWrapClass =
    "shrink-0 rounded-xl p-1.5 bg-gray-50 group-hover:bg-gray-100 dark:bg-white/5 dark:group-hover:bg-white/10";

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center text-gray-700 dark:text-gray-200 dropdown-toggle"
      >
        <span className="mr-3 overflow-hidden rounded-full h-11 w-11 ring-1 ring-gray-200 dark:ring-white/10">
          {/* <Image
            width={44}
            height={44}
            src={avatar ?? "/fallback-avatar.png"}
            alt="User avatar"
            unoptimized
            /> */}
        </span>

        <span className="block mr-1 font-medium text-theme-sm">{firstName}</span>

        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 text-gray-500 dark:text-gray-400 ${isOpen ? "rotate-180" : ""
            }`}
          aria-hidden
        />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="px-1">
          <span className="block font-semibold text-gray-800 text-theme-sm dark:text-gray-100">
            {firstName}
          </span>
          <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
            {email}
          </span>
        </div>

        <ul className="flex flex-col gap-1 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800">
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href="/profile"
              className="group flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg text-theme-sm hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-gray-100"
            >
              <span className={iconWrapClass}>
                <UserRound className={iconClass} aria-hidden />
              </span>
              Edit profile
            </DropdownItem>
          </li>

          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href="/settings"
              className="group flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg text-theme-sm hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-gray-100"
            >
              <span className={iconWrapClass}>
                <Settings className={iconClass} aria-hidden />
              </span>
              Account settings
            </DropdownItem>
          </li>

          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href="/support"
              className="group flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg text-theme-sm hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-gray-100"
            >
              <span className={iconWrapClass}>
                <LifeBuoy className={iconClass} aria-hidden />
              </span>
              Support
            </DropdownItem>
          </li>
        </ul>

        <button
          type="button"
          onClick={handleLogout}
          className="group flex items-center gap-3 px-3 py-2 mt-3 font-medium text-gray-700 rounded-lg text-theme-sm hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-gray-100"
        >
          <span className={iconWrapClass}>
            <LogOut className={iconClass} aria-hidden />
          </span>
          Sign out
        </button>
      </Dropdown>
    </div>
  );
}
