// AdminCardTable.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import clsx from "clsx";

/* =========================================
 * Hook: useHeaderCheckbox
 * - ใช้ทำ checkbox ในหัวตาราง (select all)
 * - รองรับสถานะ indeterminate อัตโนมัติ
 * ========================================= */
export function useHeaderCheckbox(
    selectedCount: number,
    totalCount: number,
    onToggleAll: () => void,
) {
    const ref = React.useRef<HTMLInputElement>(null);
    const checked = totalCount > 0 && selectedCount === totalCount;
    const indeterminate = totalCount > 0 && selectedCount > 0 && selectedCount < totalCount;

    React.useEffect(() => {
        if (ref.current) {
            ref.current.indeterminate = indeterminate;
        }
    }, [indeterminate]);

    return {
        ref,
        checked,
        onChange: onToggleAll,
    };
}

/* =========================================
 * Table Primitives (styled)
 * ========================================= */
export const Table: React.FC<React.HTMLAttributes<HTMLTableElement>> = ({ className, ...rest }) => (
    <table className={clsx("w-full text-left text-sm", className)} {...rest} />
);

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ className, ...rest }) => (
    <thead className={clsx("bg-white dark:bg-white/[0.02]", className)} {...rest} />
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ className, ...rest }) => (
    <tbody className={clsx("divide-y divide-gray-100 dark:divide-white/[0.05]", className)} {...rest} />
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ className, ...rest }) => (
    <tr className={clsx("hover:bg-gray-50/60 dark:hover:bg-white/[0.04]", className)} {...rest} />
);

export const TableCell: React.FC<
    React.ThHTMLAttributes<HTMLTableCellElement> &
    React.TdHTMLAttributes<HTMLTableCellElement> & { isHeader?: boolean }
> = ({ isHeader, className, ...rest }) => {
    const Comp: any = isHeader ? "th" : "td";
    return (
        <Comp
            className={clsx(
                isHeader
                    ? "px-5 py-3 font-medium text-gray-500 text-xs dark:text-gray-400 text-start"
                    : "px-5 py-4 text-sm text-gray-700 dark:text-gray-300",
                className
            )}
            {...rest}
        />
    );
};

/* =========================================
 * UserCell
 * - รองรับ props แบบที่ไฟล์ของคุณเรียกใช้:
 *   <UserCell title="ชื่อ" subtitle="..." image?="/path" />
 * - ถ้าไม่ส่ง image จะเป็น avatar วงกลมตัวอักษรแรก
 * ========================================= */
export const UserCell: React.FC<{
    title: string;
    subtitle?: string;
    image?: string;
}> = ({ title, subtitle, image }) => {
    const initial = title?.trim()?.charAt(0)?.toUpperCase() || "?";
    return (
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt={title} className="w-10 h-10 object-cover" />
                ) : (
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{initial} Test</span>
                )}
            </div>
            <div>
                <span className="block font-medium text-gray-800 dark:text-white/90">{title}</span>
                {subtitle && (
                    <span className="block text-gray-500 text-xs dark:text-gray-400">{subtitle}</span>
                )}
            </div>
        </div>
    );
};

/* =========================================
 * AdminCardTable (Container)
 * - รองรับ prop: minWidth (px) สำหรับกำหนด min width ด้านใน (ป้องกัน column เบียด)
 * ========================================= */
const AdminCardTable: React.FC<{
    children: React.ReactNode;
    minWidth?: number;
    className?: string;
}> = ({ children, minWidth = 900, className }) => {
    return (
        <div
            className={clsx(
                "overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]",
                className
            )}
        >
            <div className="max-w-full overflow-x-auto">
                <div className="min-w-full" style={{ minWidth }}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default AdminCardTable;
