"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

interface Option {
  value: string;
  text: string;
  selected?: boolean;
}

interface MultiSelectProps {
  label: string;
  options: Option[];
  defaultSelected?: string[];
  onChange?: (selected: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  options,
  defaultSelected = [],
  onChange,
  disabled = false,
  placeholder = "Select option",
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const fallbackFromOptions = useMemo(
    () => options.filter(o => o.selected).map(o => o.value),
    [options]
  );

  const [selectedOptions, setSelectedOptions] = useState<string[]>(
    defaultSelected.length ? defaultSelected : fallbackFromOptions
  );
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setSelectedOptions(defaultSelected.length ? defaultSelected : fallbackFromOptions);
  }, [defaultSelected, fallbackFromOptions]);

  useEffect(() => {
    if (!isOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    if (disabled) return;
    setIsOpen(prev => !prev);
  };

  const handleSelect = (optionValue: string) => {
    const next = selectedOptions.includes(optionValue)
      ? selectedOptions.filter(v => v !== optionValue)
      : [...selectedOptions, optionValue];
    setSelectedOptions(next);
    onChange?.(next);
  };

  const removeOption = (value: string) => {
    const next = selectedOptions.filter(opt => opt !== value);
    setSelectedOptions(next);
    onChange?.(next);
  };

  const selectedItems = useMemo(
    () =>
      selectedOptions
        .map(v => options.find(o => o.value === v))
        .filter(Boolean) as Option[],
    [options, selectedOptions]
  );

  return (
    <div className={`w-full ${className}`} ref={containerRef}>
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
        {label}
      </label>

      <div className="relative z-20 inline-block w-full">
        {/* Trigger */}
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={toggleDropdown}
          disabled={disabled}
          className={`mb-2 flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 py-1.5 pl-3 pr-2 shadow-theme-xs transition
                      focus:outline-none focus-visible:border-brand-300 focus-visible:shadow-focus-ring
                      dark:border-gray-700 dark:bg-gray-900 dark:focus-visible:border-brand-300
                      ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        >
          <div className="flex flex-wrap flex-auto gap-2">
            {selectedItems.length ? (
              selectedItems.map((opt) => (
                <span
                  key={opt.value}
                  className="group inline-flex items-center rounded-full border-[0.7px] border-transparent bg-gray-100 py-1 pl-2.5 pr-1.5 text-sm text-gray-800 hover:border-gray-200 dark:bg-gray-800 dark:text-white/90 dark:hover:border-gray-700"
                >
                  <span className="max-w-full">{opt.text}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${opt.text}`}
                    onClick={(e) => { e.stopPropagation(); removeOption(opt.value); }}
                    className="ml-2 inline-flex p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {/* X icon */}
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      aria-hidden="true"
                      className="text-current"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M3.407 4.469a.75.75 0 0 1 1.061-1.061L7 5.94l2.531-2.532a.75.75 0 1 1 1.06 1.06L8.06 7l2.53 2.532a.75.75 0 1 1-1.06 1.06L7 8.06l-2.532 2.53a.75.75 0 1 1-1.06-1.06L5.94 7 3.407 4.469Z"
                      />
                    </svg>
                  </button>
                </span>
              ))
            ) : (
              <span className="text-sm text-gray-500 dark:text-gray-400">{placeholder}</span>
            )}
          </div>

          <span className="inline-flex h-7 w-7 items-center justify-center text-gray-700 dark:text-gray-400">
            {/* Caret icon */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              aria-hidden="true"
              className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
            >
              <path
                d="M4.792 7.396L10 12.604 15.208 7.396"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div
            role="listbox"
            aria-multiselectable="true"
            className="absolute left-0 top-full z-40 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col">
              {options.map((option) => {
                const on = selectedOptions.includes(option.value);
                return (
                  <button
                    type="button"
                    key={option.value}
                    role="option"
                    aria-selected={on}
                    onClick={() => handleSelect(option.value)}
                    className={`flex w-full cursor-pointer items-center gap-2 border-b px-3 py-2 text-left text-sm leading-6 transition last:border-b-0
                                ${on ? "bg-brand-50/50 dark:bg-brand-500/10" : "hover:bg-gray-50 dark:hover:bg-white/5"}
                                border-gray-100 dark:border-gray-800 text-gray-800 dark:text-white/90`}
                  >
                    <span
                      className={`inline-flex size-4 items-center justify-center rounded border
                                  ${on ? "bg-brand-500 border-brand-500" : "border-gray-300 dark:border-gray-600"}`}
                      aria-hidden="true"
                    >
                      {on && (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 12 10"
                          aria-hidden="true"
                          fill="none"
                          stroke="white"
                        >
                          <path d="M1 5l3 3 7-7" strokeWidth="2" />
                        </svg>
                      )}
                    </span>
                    {option.text}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiSelect;
