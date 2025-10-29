"use client";
import React, { useEffect, useState, useCallback } from "react";

interface SwitchProps {
  label?: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  color?: "blue" | "gray";
  checked?: boolean;
  id?: string;
  className?: string;
}

const Switch: React.FC<SwitchProps> = ({
  label,
  defaultChecked = false,
  disabled = false,
  onChange,
  color = "blue",
  checked,                // <-- controlled (ถ้าส่งมา)
  id,
  className,
}) => {
  // ถ้าเป็น controlled ให้ state สะท้อนค่าจาก prop; ถ้าไม่ ให้ใช้ internal state
  const isControlled = typeof checked === "boolean";
  const [internal, setInternal] = useState<boolean>(defaultChecked);
  const isChecked = isControlled ? (checked as boolean) : internal;

  // sync defaultChecked เมื่อ prop เปลี่ยน (กรณี uncontrolled)
  useEffect(() => {
    if (!isControlled) setInternal(defaultChecked);
  }, [defaultChecked, isControlled]);

  const emitChange = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternal(next);
      onChange?.(next);
    },
    [isControlled, onChange]
  );

  const handleToggle = useCallback(() => {
    if (disabled) return;
    emitChange(!isChecked);
  }, [disabled, isChecked, emitChange]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      emitChange(!isChecked);
    }
  };

  const switchColors =
    color === "blue"
      ? {
          background: isChecked ? "bg-brand-500" : "bg-gray-200 dark:bg-white/10",
          knob: isChecked ? "translate-x-full bg-white" : "translate-x-0 bg-white",
        }
      : {
          background: isChecked ? "bg-gray-800 dark:bg-white/10" : "bg-gray-200 dark:bg-white/10",
          knob: isChecked ? "translate-x-full bg-white" : "translate-x-0 bg-white",
        };

  return (
    <label
      htmlFor={id}
      className={`flex select-none items-center gap-3 text-sm font-medium ${
        disabled ? "text-gray-400" : "text-gray-700 dark:text-gray-400"
      } ${className ?? ""}`}
    >
      {/* ปุ่มจริง ๆ (a11y) */}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={isChecked}
        aria-disabled={disabled || undefined}
        onClick={handleToggle}
        onKeyDown={onKeyDown}
        disabled={disabled}
        className={`relative h-6 w-11 rounded-full transition duration-150 ease-linear outline-none
          focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400 dark:focus-visible:ring-gray-600
          ${disabled ? "pointer-events-none bg-gray-100 dark:bg-gray-800" : switchColors.background}`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full shadow-theme-sm transform
            transition-transform duration-150 ease-linear ${switchColors.knob}`}
        />
      </button>
      {label}
    </label>
  );
};

export default Switch;
