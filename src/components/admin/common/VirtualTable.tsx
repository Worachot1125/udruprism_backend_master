// "use client";
// import React from "react";
// import AutoSizer from "react-virtualized-auto-sizer";
// import { FixedSizeList, ListChildComponentProps } from "react-window";

// export function VirtualTable<T>({
//   items,
//   rowHeight,
//   renderRow,
//   overscan = 6,
// }: {
//   items: T[];
//   rowHeight: number;
//   overscan?: number;
//   renderRow: (p: { item: T; index: number }) => React.ReactNode;
// }) {
//   const Row = React.useCallback(
//     ({ index, style }: ListChildComponentProps) => {
//       const item = items[index];
//       return (
//         <div style={style} key={index}>
//           {renderRow({ item, index })}
//         </div>
//       );
//     },
//     [items, renderRow],
//   );

//   // กำหนดความสูงรวมขั้นต่ำ ถ้ารายการน้อย
//   const minH = Math.max(1, Math.min(items.length, 10)) * rowHeight;

//   return (
//     <div className="h-[480px] w-full" style={{ minHeight: minH }}>
//       <AutoSizer>
//         {({ height, width }) => (
//           <FixedSizeList
//             height={height}
//             width={width}
//             itemCount={items.length}
//             itemSize={rowHeight}
//             overscanCount={overscan}
//           >
//             {Row}
//           </FixedSizeList>
//         )}
//       </AutoSizer>
//     </div>
//   );
// }

/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";

type RowRenderer<T> = (args: { item: T; index: number }) => React.ReactNode;

type Props<T> = {
  items: T[];
  rowHeight: number;               // px / แถว
  height?: number;                 // ความสูงของ viewport (px) ถ้าไม่ระบุ จะยืดตาม min-height
  overscan?: number;               // แถว buffer บน/ล่าง
  className?: string;
  renderRow: RowRenderer<T>;
};

/**
 * Virtualized list/table แบบเบา ๆ
 * - ใช้ native addEventListener('scroll', { passive: true })
 * - throttle ด้วย requestAnimationFrame เพื่อลด re-render
 * - ไม่ผูก onWheel เลย (ลด scroll-blocking warning)
 */
export function VirtualTable<T>({
  items,
  rowHeight,
  height = 560,
  overscan = 6,
  className,
  renderRow,
}: Props<T>) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const [scrollTop, setScrollTop] = React.useState(0);
  const total = items.length;
  const totalHeight = total * rowHeight;

  const viewportHeight = height;
  const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2;

  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const end = Math.min(total, start + visibleCount);

  const offsetY = start * rowHeight;
  const visibleItems = items.slice(start, end);

  // passive scroll + rAF
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let raf = 0;
    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setScrollTop(el.scrollTop);
      });
    };

    // ใช้ passive: true เพื่อไม่ block main thread
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll as any);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "relative",
        height: viewportHeight,
        overflow: "auto",
        willChange: "transform",
      }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            transform: `translateY(${offsetY}px)`,
          }}
        >
          {visibleItems.map((item, i) => {
            const index = start + i;
            return (
              <div key={index} style={{ height: rowHeight }}>
                {renderRow({ item, index })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default VirtualTable;
