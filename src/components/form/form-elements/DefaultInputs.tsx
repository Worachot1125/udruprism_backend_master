"use client";
import React, { useState } from "react";
import ComponentCard from "../../common/ComponentCard";
import Label from "../Label";
import Input from "../input/InputField";
import Select from "../Select";
import { EyeCloseIcon, EyeIcon } from "../../../icons"; // ใช้เฉพาะตา (ถ้าต้องการให้ผมอินไลน์ให้ด้วย บอกได้)
import DatePicker from "@/components/form/date-picker";

export default function DefaultInputs() {
  const [showPassword, setShowPassword] = useState(false);
  const options = [
    { value: "marketing", label: "Marketing" },
    { value: "template", label: "Template" },
    { value: "development", label: "Development" },
  ];
  const handleSelectChange = (value: string) => {
    console.log("Selected value:", value);
  };
  return (
    <ComponentCard title="Default Inputs">
      <div className="space-y-6">
        <div>
          <Label>Input</Label>
          <Input type="text" />
        </div>

        <div>
          <Label>Input with Placeholder</Label>
          <Input type="text" placeholder="info@gmail.com" />
        </div>

        <div>
          <Label>Select Input</Label>
          <div className="relative">
            <Select
              options={options}
              placeholder="Select an option"
              onChange={handleSelectChange}
              className="dark:bg-dark-900"
            />
            {/* Chevron (SVG inline ปลอดภัย build) */}
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M4.792 7.396L10 12.604 15.208 7.396"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
        </div>

        <div>
          <Label>Password Input</Label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 z-30 -translate-y-1/2 cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
              ) : (
                <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
              )}
            </button>
          </div>
        </div>

        <div>
          <DatePicker
            id="date-picker"
            label="Date Picker Input"
            placeholder="Select a date"
            onChange={(dates, currentDateString) => {
              console.log({ dates, currentDateString });
            }}
          />
        </div>

        <div>
          <Label htmlFor="tm">Time Picker Input</Label>
          <div className="relative">
            <Input
              type="time"
              id="tm"
              name="tm"
              onChange={(e) => console.log(e.target.value)}
            />
            {/* นาฬิกา (SVG inline ปลอดภัย build) */}
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <circle cx="10" cy="10" r="7.5" strokeWidth="1.5" />
                <path
                  d="M10 5.5v4.2l2.6 1.5"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
        </div>

        <div>
          <Label htmlFor="card">Input with Payment</Label>
          <div className="relative">
            <Input type="text" id="card" placeholder="Card number" className="pl-[62px]" />
            <span className="absolute left-0 top-1/2 -translate-y-1/2 flex h-11 w-[46px] items-center justify-center border-r border-gray-200 dark:border-gray-800">
              {/* โลโก้บัตร (ตกแต่งอย่างเดียว) */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <circle cx="6.25" cy="10" r="5.625" fill="#E80B26" />
                <circle cx="13.75" cy="10" r="5.625" fill="#F59D31" />
                <path
                  d="M10 14.1924C11.1508 13.1625 11.875 11.6657 11.875 9.99979C11.875 8.33383 11.1508 6.8371 10 5.80713C8.84918 6.8371 8.125 8.33383 8.125 9.99979C8.125 11.6657 8.84918 13.1625 10 14.1924Z"
                  fill="#FC6020"
                />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </ComponentCard>
  );
}
