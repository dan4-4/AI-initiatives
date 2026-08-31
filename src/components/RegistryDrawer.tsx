"use client";

import { useEffect } from "react";
import {
  RegistryUpload,
  type RegistryInfo,
} from "@/components/RegistryUpload";

interface RegistryDrawerProps {
  info: RegistryInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (info: RegistryInfo) => void;
  onError: (message: string) => void;
}

export function RegistryDrawer({
  info,
  open,
  onOpenChange,
  onUpdated,
  onError,
}: RegistryDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <div className="no-print">
      {open ? (
        <button
          type="button"
          aria-label="Закрыть реестр"
          className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px]"
          onClick={() => onOpenChange(false)}
        />
      ) : null}

      <aside
        id="registry-drawer"
        className={`fixed left-0 top-0 z-50 flex h-full w-[min(100%,360px)] flex-col border-r border-[var(--line)] bg-[var(--card)] shadow-[var(--shadow)] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">
              Реестр инициатив
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
              Excel-реестр
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Загрузка и обновление без подмены файла вручную
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-[var(--line)] px-3 py-1.5 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--brand)]"
          >
            Скрыть
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <RegistryUpload
            info={info}
            onUpdated={onUpdated}
            onError={onError}
          />
        </div>
      </aside>
    </div>
  );
}
