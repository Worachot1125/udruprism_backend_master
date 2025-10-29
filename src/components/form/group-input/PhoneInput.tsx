"use client";
import React, { useState } from "react";

interface CountryCode {
  code: string;
  label: string; // ใช้เป็น prefix เช่น "+1"
}

interface PhoneInputProps {
  countries: CountryCode[];
  placeholder?: string;
  onChange?: (phoneNumber: string) => void;
  selectPosition?: "start" | "end";
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  countries,
  placeholder = "+1 (555) 000-0000",
  onChange,
  selectPosition = "start",
}) => {
  const [selectedCountry, setSelectedCountry] = useState<string>(countries[0]?.code ?? "US");
  const [phoneNumber, setPhoneNumber] = useState<string>(countries[0]?.label ?? "+1");

  const countryCodes: Record<string, string> = countries.reduce(
    (acc, { code, label }) => ({ ...acc, [code]: label }),
    {}
  );

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCountry = e.target.value;
    setSelectedCountry(newCountry);
    const prefix = countryCodes[newCountry] ?? "";
    setPhoneNumber(prefix);
    onChange?.(prefix);
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPhoneNumber = e.target.value;
    setPhoneNumber(newPhoneNumber);
    onChange?.(newPhoneNumber);
  };

  return (
    <div className="relative flex">
      {/* Dropdown at start */}
      {selectPosition === "start" && (
        <div className="absolute left-0 top-0 h-11">
          <select
            value={selectedCountry}
            onChange={handleCountryChange}
            className="rounded-l-lg border-0 border-r border-gray-200 bg-transparent py-3 pl-3.5 pr-8 leading-tight text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-gray-800 dark:text-gray-400"
            aria-label="Select country code"
          >
            {countries.map((country) => (
              <option
                key={country.code}
                value={country.code}
                className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
              >
                {country.code}
              </option>
            ))}
          </select>

          {/* Caret icon (SVG ปลอดภัย: ไม่มี xmlns, ใส่ aria-hidden, ใช้ camelCase attrs) */}
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-700 dark:text-gray-400">
            <svg
              width={20}
              height={20}
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4.792 7.396 10 12.604 15.208 7.396"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Input */}
      <input
        type="tel"
        value={phoneNumber}
        onChange={handlePhoneNumberChange}
        placeholder={placeholder}
        className={`h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800
          ${selectPosition === "start" ? "pl-[84px]" : "pr-[84px]"}`}
        aria-label="Phone number"
      />

      {/* Dropdown at end */}
      {selectPosition === "end" && (
        <div className="absolute right-0 top-0 h-11">
          <select
            value={selectedCountry}
            onChange={handleCountryChange}
            className="rounded-r-lg border-0 border-l border-gray-200 bg-transparent py-3 pl-3.5 pr-8 leading-tight text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-gray-800 dark:text-gray-400"
            aria-label="Select country code"
          >
            {countries.map((country) => (
              <option
                key={country.code}
                value={country.code}
                className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
              >
                {country.code}
              </option>
            ))}
          </select>

          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-700 dark:text-gray-400">
            <svg
              width={20}
              height={20}
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4.792 7.396 10 12.604 15.208 7.396"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhoneInput;
