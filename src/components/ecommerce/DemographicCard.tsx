// /* eslint-disable @next/next/no-img-element */
// "use client";

// import Image from "next/image";
// import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
// import dynamic from "next/dynamic";
// import { MoreDotIcon } from "@/icons";
// import { Dropdown } from "../ui/dropdown/Dropdown";
// import { DropdownItem } from "../ui/dropdown/DropdownItem";

// type CountryStat = {
//   code: string;         // e.g. "usa"
//   name: string;         // e.g. "USA"
//   customers: number;    // absolute count
//   percent: number;      // 0..100
//   flagSrc: string;      // /images/country/country-01.svg
// };

// const CountryMap = dynamic(() => import("./CountryMap"), { ssr: false, loading: () => (
//   <div className="h-full w-full animate-pulse rounded-xl bg-gray-200/70 dark:bg-gray-800/50" />
// )});

// export default function DemographicCard({
//   data,
//   title = "Customers Demographic",
//   subtitle = "Number of customers based on country",
// }: {
//   data?: CountryStat[];
//   title?: string;
//   subtitle?: string;
// }) {
//   const [isOpen, setIsOpen] = useState(false);
//   const menuRef = useRef<HTMLDivElement | null>(null);
//   const btnRef = useRef<HTMLButtonElement | null>(null);

//   const toggleDropdown = useCallback(() => setIsOpen((v) => !v), []);
//   const closeDropdown = useCallback(() => setIsOpen(false), []);

//   // Close on Esc
//   useEffect(() => {
//     if (!isOpen) return;
//     const onKey = (e: KeyboardEvent) => {
//       if (e.key === "Escape") {
//         closeDropdown();
//         btnRef.current?.focus();
//       }
//     };
//     window.addEventListener("keydown", onKey);
//     return () => window.removeEventListener("keydown", onKey);
//   }, [isOpen, closeDropdown]);

//   // Click outside to close
//   useEffect(() => {
//     if (!isOpen) return;
//     const onDocClick = (e: MouseEvent) => {
//       if (!menuRef.current) return;
//       if (menuRef.current.contains(e.target as Node)) return;
//       if (btnRef.current?.contains(e.target as Node)) return;
//       closeDropdown();
//     };
//     document.addEventListener("mousedown", onDocClick);
//     return () => document.removeEventListener("mousedown", onDocClick);
//   }, [isOpen, closeDropdown]);

//   // Fallback demo data
//   const countries = useMemo<CountryStat[]>(
//     () =>
//       data && data.length
//         ? data
//         : [
//             { code: "usa", name: "USA", customers: 2379, percent: 79, flagSrc: "/images/country/country-01.svg" },
//             { code: "fra", name: "France", customers: 589, percent: 23, flagSrc: "/images/country/country-02.svg" },
//           ],
//     [data]
//   );

//   return (
//     <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
//       {/* Header */}
//       <div className="flex items-start justify-between gap-3">
//         <div>
//           <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{title}</h3>
//           <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
//         </div>

//         <div className="relative inline-block" ref={menuRef}>
//           <button
//             ref={btnRef}
//             type="button"
//             onClick={toggleDropdown}
//             aria-haspopup="menu"
//             aria-expanded={isOpen}
//             aria-controls="demographic-menu"
//             aria-label="Open menu"
//             className="rounded-full p-1 text-gray-400 transition hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 dark:hover:text-gray-300 dark:focus:ring-gray-700 dark:focus:ring-offset-gray-900"
//           >
//             <MoreDotIcon />
//           </button>

//           <Dropdown id="demographic-menu" isOpen={isOpen} onClose={closeDropdown} className="w-44 p-2">
//             <DropdownItem
//               onItemClick={closeDropdown}
//               className="flex w-full rounded-lg text-left font-normal text-gray-600 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-gray-200"
//             >
//               View More
//             </DropdownItem>
//             <DropdownItem
//               onItemClick={closeDropdown}
//               className="flex w-full rounded-lg text-left font-normal text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
//             >
//               Delete
//             </DropdownItem>
//           </Dropdown>
//         </div>
//       </div>

//       {/* Map */}
//       <div className="my-6 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 px-4 py-6 dark:border-gray-800 dark:bg-gray-900 sm:px-6">
//         <div className="mapOne map-btn mx-auto h-auto w-full max-w-[720px]">
//           <div className="relative w-full aspect-[16/9]">
//             <div className="absolute inset-0">
//               <CountryMap />
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* List (empty state handled) */}
//       {countries.length === 0 ? (
//         <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-400">
//           No country data available.
//         </div>
//       ) : (
//         <div className="space-y-5">
//           {countries.map((c) => {
//             const pct = Math.min(Math.max(c.percent, 0), 100);
//             return (
//               <div key={c.code} className="flex items-center justify-between">
//                 <div className="flex items-center gap-3">
//                   <div className="w-8">
//                     <Image
//                       width={48}
//                       height={48}
//                       src={c.flagSrc}
//                       alt={`${c.name} flag`}
//                       className="h-auto w-full"
//                     />
//                   </div>
//                   <div>
//                     <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">{c.name}</p>
//                     <span className="block text-theme-xs text-gray-500 dark:text-gray-400">
//                       {c.customers.toLocaleString()} Customers
//                     </span>
//                   </div>
//                 </div>

//                 <div className="flex w-full max-w-[180px] items-center gap-3">
//                   <div
//                     className="relative block h-2 w-full max-w-[120px] overflow-hidden rounded-sm bg-gray-200 dark:bg-gray-800"
//                     role="progressbar"
//                     aria-valuenow={pct}
//                     aria-valuemin={0}
//                     aria-valuemax={100}
//                     aria-label={`${c.name} customer share`}
//                     title={`${pct}%`}
//                   >
//                     <div
//                       className="absolute left-0 top-0 h-full rounded-sm bg-brand-500"
//                       style={{ width: `${pct}%` }}
//                     />
//                   </div>
//                   <p className="tabular-nums text-theme-sm font-medium text-gray-800 dark:text-white/90">{pct}%</p>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </section>
//   );
// }
