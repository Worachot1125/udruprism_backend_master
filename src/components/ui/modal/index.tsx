"use client";
import React from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  isFullscreen?: boolean;
  labelledById?: string; // optional: ใช้โยงหัวข้อ
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  className = "",
  showCloseButton = true,
  isFullscreen = false,
  labelledById,
}) => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (isOpen) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [isOpen, onClose]);

  React.useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const containerCls = isFullscreen
    ? "fixed inset-0 z-[99999] flex"
    : "fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6";

  const panelCls = isFullscreen
    ? "relative w-screen h-screen max-w-none rounded-none overflow-hidden bg-white dark:bg-gray-900"
    : "relative w-[96vw] max-w-6xl rounded-3xl overflow-hidden bg-white dark:bg-gray-900";

  const node = (
    <div
      className={containerCls}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledById}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px]" />

      {/* Panel */}
      <div
        className={`${panelCls} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full
                       bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800
                       dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label="Close"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
        {children}
      </div>
    </div>
  );

  return createPortal(node, document.body);
};
