"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";

export default function ConfirmDeleteModal({
  open,
  onClose,
  policy,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  policy: { id: string; name: string } | null;
  onConfirm: () => Promise<void> | void;
}) {
  const [input, setInput] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    if (!open) setInput("");
  }, [open]);

  const match = !!policy?.name && input.trim() === String(policy.name);

  const handleConfirm = async () => {
    if (!match) return;
    try {
      setDeleting(true);
      await onConfirm();
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} showCloseButton className="max-w-lg p-6 md:p-5">
      {!policy ? null : (
        <div>
          <div className="mb-3 flex items-center justify-between border-b pb-3 border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Confirm delete</h3>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Please confirm deleting this <span className="font-semibold">Policy</span>. This action cannot be undone.
            </p>
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              Type the Policy name exactly to confirm: <span className="font-semibold">&quot;{policy.name}&quot;</span>
            </div>
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-red-500 focus:ring-red-500 bg-white text-gray-800 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-red-400"
              placeholder="Type the Policy name to confirm"
              autoComplete="off"
            />
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              className="rounded-lg border bg-white px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              onClick={onClose}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              className={`rounded-lg px-4 py-2.5 text-sm text-white ${match ? "bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700" : "bg-red-300 cursor-not-allowed dark:bg-red-900/40"}`}
              onClick={handleConfirm}
              disabled={!match || deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
