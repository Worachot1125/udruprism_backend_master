// src/components/charts/line/LineChartOne.tsx
"use client";

import React, { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

/**
 * ปรับค่าคงที่ตามต้องการ
 * - HEIGHT: ความสูงกราฟ
 * - WIDTH:  ความกว้างกราฟ (ให้ใหญ่กว่าพื้นที่แสดงจริงเล็กน้อยได้)
 */
const HEIGHT = 320;
const WIDTH = 1200;

export default function LineChartOne() {
  const options: ApexOptions = useMemo(() => {
    return {
      chart: {
        type: "area",
        height: HEIGHT,
        width: WIDTH,
        toolbar: { show: false },
        animations: { enabled: false },        // ปิด animation เพื่อลด flicker
        parentHeightOffset: 0,
        redrawOnParentResize: false,
        redrawOnWindowResize: false,           // ไม่ต้องวาดใหม่เวลา window resize
        fontFamily: "Outfit, sans-serif",
      },
      responsive: [],                           // ปิด responsive rules
      colors: ["#465FFF", "#9CB9FF"],
      stroke: { curve: "straight", width: 2 },
      fill: { type: "gradient", gradient: { opacityFrom: 0.35, opacityTo: 0 } },
      dataLabels: { enabled: false },
      grid: {
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } },
        padding: { left: 8, right: 8, top: 8, bottom: 8 },
      },
      markers: {
        size: 0,                 // ไม่แสดงจุด
        hover: { size: 0 },      // ไม่ให้ขยายตอน hover (กัน container เปลี่ยนขนาด)
      },
      // ไม่ให้ filter ทำงานตอน hover/active (กัน reflow)
      states: {
        normal: { filter: { type: "none" } },
        hover: { filter: { type: "none" } },
        active: { filter: { type: "none" } },
      },
      tooltip: {
        enabled: true,
        shared: false,
        // จับ tooltip ไว้มุมขวาบน เพื่อตัดโอกาสทำให้เกิด scrollbar
        fixed: { enabled: true, position: "topRight", offsetX: 0, offsetY: 0 },
      },
      xaxis: {
        type: "category",
        categories: [
          "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ],
        axisBorder: { show: false },
        axisTicks: { show: false },
        tooltip: { enabled: false }, // ปิด xaxis tooltip (กัน reflow)
        tickPlacement: "between",
        labels: { rotate: 0 },
      },
      yaxis: {
        decimalsInFloat: 0,
        labels: { style: { fontSize: "12px", colors: ["#6B7280"] } },
        title: { text: "" },
      },
      legend: { show: false },
    };
  }, []);

  const series = useMemo(
    () => [
      { name: "Sales", data: [180, 190, 170, 160, 175, 165, 170, 205, 230, 210, 240, 235] },
      { name: "Revenue", data: [40, 30, 50, 40, 55, 40, 70, 100, 110, 120, 150, 140] },
    ],
    [],
  );

  return (
    <div
      className="apex-fixed-wrapper"
      style={{
        width: WIDTH,         // ล็อกกว้าง/สูงตายตัว
        height: HEIGHT,
        minWidth: WIDTH,
        minHeight: HEIGHT,
        maxWidth: WIDTH,
        maxHeight: HEIGHT,
        overflow: "hidden",   // กัน scrollbar โผล่แล้วไปกระตุก ResizeObserver
        position: "relative",
      }}
    >
      <ReactApexChart
        options={options}
        series={series}
        type="area"
        height={HEIGHT}
        width={WIDTH}
      />
    </div>
  );
}
