"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import {
  GridIcon,
  ListIcon,
  PieChartIcon,
  BoxCubeIcon,
  PlugInIcon,
  HorizontaLDots,
  ChevronDownIcon,
} from "../icons/index";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const navItems: NavItem[] = [
  { name: "Dashboard", icon: <GridIcon className="w-6 h-6" />, path: "/" },
  {
    name: "Management",
    icon: <ListIcon className="w-6 h-6" />,
    subItems: [
      { name: "Policy", path: "/policy" },
      { name: "Users", path: "/users" },
      { name: "Bans", path: "/bans" },
      { name: "AI Models", path: "/models" },
      { name: "Admin", path: "/admin" },
    ],
  },
  {
    name: "Reports",
    icon: <ListIcon className="w-6 h-6" />,
    subItems: [
      { name: "Token Usage", path: "/reports/tokens" },
      { name: "Message", path: "/reports/message" },
    ],
  },
];

const othersItems: NavItem[] = [
  {
    name: "Charts",
    icon: <PieChartIcon />,
    subItems: [
      { name: "Line Chart", path: "/line-chart" },
      { name: "Bar Chart", path: "/bar-chart" },
    ],
  },
  {
    name: "UI Elements",
    icon: <BoxCubeIcon />,
    subItems: [
      { name: "Alerts", path: "/alerts" },
      { name: "Avatar", path: "/avatars" },
      { name: "Badge", path: "/badge" },
      { name: "Buttons", path: "/buttons" },
      { name: "Images", path: "/images" },
      { name: "Videos", path: "/videos" },
    ],
  },
  {
    name: "Authentication",
    icon: <PlugInIcon />,
    subItems: [
      { name: "Sign In", path: "/signin" },
      { name: "Sign Up", path: "/signup" },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname() || "/";
  const isSidebarOpen = isExpanded || isHovered || isMobileOpen;

  const isActive = useCallback((path: string) => pathname === path, [pathname]);

  // ใช้ group เดียวในการ “เปิด” (ไม่ทำ accordion หลายอันพร้อมกัน)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // เปิด group อัตโนมัติถ้า path ปัจจุบันอยู่ในกลุ่มนั้น
  useEffect(() => {
    const allGroups = [...navItems, ...othersItems].filter((n) => n.subItems);
    const match = allGroups.find((g) =>
      (g.subItems ?? []).some((s) => s.path === pathname)
    );
    setSelectedGroup(match ? match.name : null);
  }, [pathname]);

  const isGroupActive = useCallback(
    (nav: NavItem) =>
      (nav.subItems ?? []).some((s) => isActive(s.path!)) ||
      selectedGroup === nav.name,
    [isActive, selectedGroup]
  );

  const toggleGroup = (name: string) =>
    setSelectedGroup((g) => (g === name ? null : name));

  const renderMenuItems = (items: NavItem[], sectionKey: string) => (
    <ul className="flex flex-col gap-4">
      {items.map((nav) => {
        const groupOpen = isSidebarOpen && selectedGroup === nav.name;
        const groupIsActive = isGroupActive(nav);

        if (nav.subItems) {
          return (
            <li key={`${sectionKey}-${nav.name}`}>
              {/* หัวกลุ่ม */}
              <button
                type="button"
                onClick={() => toggleGroup(nav.name)}
                className={`menu-item group w-full cursor-pointer ${
                  !isSidebarOpen ? "lg:justify-center" : "lg:justify-start"
                } ${groupIsActive ? "menu-item-active" : "menu-item-inactive"}`}
                aria-expanded={groupOpen}
                aria-controls={`submenu-${sectionKey}-${nav.name}`}
              >
                <span
                  className={`${
                    groupIsActive
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {isSidebarOpen && (
                  <>
                    <span className="menu-item-text">{nav.name}</span>
                    <ChevronDownIcon
                      className={`ml-auto h-5 w-5 transition-transform ${
                        groupOpen ? "rotate-180 text-brand-500" : ""
                      }`}
                    />
                  </>
                )}
              </button>

              {/* รายการย่อย */}
              <div
                id={`submenu-${sectionKey}-${nav.name}`}
                className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${
                  groupOpen ? "max-h-96" : "max-h-0"
                }`}
              >
                {isSidebarOpen && (
                  <ul className="ml-9 mt-2 space-y-1">
                    {nav.subItems.map((sub) => {
                      const active = isActive(sub.path);
                      return (
                        <li key={`${nav.name}-${sub.name}`}>
                          <Link
                            href={sub.path}
                            className={`menu-dropdown-item ${
                              active
                                ? "menu-dropdown-item-active"
                                : "menu-dropdown-item-inactive"
                            }`}
                          >
                            {sub.name}
                            <span className="ml-auto flex items-center gap-1">
                              {sub.new && (
                                <span
                                  className={`menu-dropdown-badge ${
                                    active
                                      ? "menu-dropdown-badge-active"
                                      : "menu-dropdown-badge-inactive"
                                  }`}
                                >
                                  new
                                </span>
                              )}
                              {sub.pro && (
                                <span
                                  className={`menu-dropdown-badge ${
                                    active
                                      ? "menu-dropdown-badge-active"
                                      : "menu-dropdown-badge-inactive"
                                  }`}
                                >
                                  pro
                                </span>
                              )}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </li>
          );
        }

        // รายการเดี่ยว
        return nav.path ? (
          <li key={`${sectionKey}-${nav.name}`}>
            <Link
              href={nav.path}
              className={`menu-item group ${
                isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
              }`}
            >
              <span
                className={`${
                  isActive(nav.path)
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {isSidebarOpen && <span className="menu-item-text">{nav.name}</span>}
            </Link>
          </li>
        ) : null;
      })}
    </ul>
  );

  return (
    <aside
      className={`fixed left-0 top-0 z-50 mt-16 h-screen border-r border-gray-200 bg-white text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 lg:mt-0
        ${
          isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Sidebar navigation"
    >
      {/* โลโก้ */}
      <div
        className={`flex py-8 ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href="/" aria-label="Go to home">
          {isSidebarOpen ? (
            <>
              <Image
                className="dark:hidden"
                src="/images/logo/logo.svg"
                alt="Logo"
                width={150}
                height={40}
                priority
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/logo-dark.svg"
                alt="Logo"
                width={150}
                height={40}
                priority
              />
            </>
          ) : (
            <Image
              src="/images/logo/logo-icon.svg"
              alt="Logo"
              width={32}
              height={32}
              priority
            />
          )}
        </Link>
      </div>

      {/* เมนู */}
      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="mb-6">
          <div className="flex flex-col gap-6">
            <div>
              <h2
                className={`mb-4 flex text-xs uppercase leading-[20px] text-gray-400 ${
                  !isSidebarOpen ? "lg:justify-center" : "justify-start"
                }`}
              >
                {isSidebarOpen ? "Menu" : <HorizontaLDots />}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>

            {/* ถ้าจะเปิดส่วน Others ให้เอาคอมเมนต์นี้ออก
            <div>
              <h2
                className={`mb-4 flex text-xs uppercase leading-[20px] text-gray-400 ${
                  !isSidebarOpen ? "lg:justify-center" : "justify-start"
                }`}
              >
                {isSidebarOpen ? "Others" : <HorizontaLDots />}
              </h2>
              {renderMenuItems(othersItems, "others")}
            </div>
            */}
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
