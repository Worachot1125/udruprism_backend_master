import React from "react";

interface CheckboxProps {
  label?: string;
  checked: boolean;
  className?: string;
  id?: string;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked,
  id,
  onChange,
  className = "",
  disabled = false,
}) => {
  const autoId = React.useId();
  const inputId = id ?? autoId;

  return (
    <div className={`flex items-center gap-3 ${disabled ? "opacity-60" : ""}`}>
      <div className="relative h-5 w-5">
        <input
          id={inputId}
          type="checkbox"
          className={`h-5 w-5 appearance-none rounded-md border border-gray-300 checked:border-transparent checked:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-gray-700 ${className} ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />

        {/* checkmark (แสดงเฉพาะเมื่อ checked) */}
        {checked && (
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            width={14}
            height={14}
            viewBox="0 0 14 14"
            fill="none"
          >
            <path
              d="M11.6666 3.5 5.24992 9.91667 2.33325 7"
              stroke="white"
              strokeWidth={1.94437}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}

        {/* disabled mark (แสดงเมื่อ disabled และไม่ checked) */}
        {disabled && !checked && (
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            width={14}
            height={14}
            viewBox="0 0 14 14"
            fill="none"
          >
            <path
              d="M11.6666 3.5 5.24992 9.91667 2.33325 7"
              stroke="#E4E7EC"
              strokeWidth={2.33333}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {label && (
        <label
          htmlFor={inputId}
          className={`text-sm font-medium text-gray-800 dark:text-gray-200 ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
        >
          {label}
        </label>
      )}
    </div>
  );
};

export default Checkbox;
