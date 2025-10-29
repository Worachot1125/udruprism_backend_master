"use client";
import * as React from "react";
import { Modal } from "@/components/ui/modal";

export type ConfirmCfg = { title: string; body: React.ReactNode; onConfirm: () => void | Promise<void> };

export default function ConfirmDialog({
  open, onClose, cfg,
}: { open: boolean; onClose: () => void; cfg: ConfirmCfg }) {
  return (
    <Modal isOpen={open} onClose={onClose} showCloseButton className="max-w-md p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b px-1 py-4">
          <h3 className="text-base font-semibold">{cfg.title}</h3>
        </div>
        <div className="text-sm text-gray-700 px-2 py-3">{cfg.body}</div>
        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <button onClick={onClose} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">Cancel</button>
          <button
            onClick={async () => {
              await cfg.onConfirm();
              onClose(); 
            }}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </Modal>
  );
}
