"use client";

import { useRef, useState } from "react";

export interface RegistryInfo {
  count: number;
  source?: "upload" | "seed";
  fileName?: string;
  updatedAt?: string | null;
  departments?: string[];
}

interface RegistryUploadProps {
  info: RegistryInfo | null;
  onUpdated: (info: RegistryInfo) => void;
  onError: (message: string) => void;
}

function formatUpdatedAt(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function RegistryUpload({
  info,
  onUpdated,
  onError,
}: RegistryUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function uploadFile(file: File) {
    setBusy(true);
    onError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/registry", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось загрузить реестр");
      onUpdated({
        count: data.count,
        source: data.source ?? "upload",
        fileName: data.fileName,
        updatedAt: data.updatedAt,
        departments: data.departments,
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : "Ошибка загрузки реестра");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function resetToSeed() {
    if (
      !window.confirm(
        "Вернуть исходный файл реестра из проекта? Загруженная копия будет удалена.",
      )
    ) {
      return;
    }
    setBusy(true);
    onError("");
    try {
      const res = await fetch("/api/registry", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось сбросить реестр");
      onUpdated({
        count: data.count,
        source: data.source,
        fileName: data.fileName,
        updatedAt: data.updatedAt,
        departments: data.departments,
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : "Ошибка сброса реестра");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <p className="text-sm leading-relaxed text-[var(--muted)]">
        {info ? (
          <>
            В реестре{" "}
            <strong className="text-[var(--ink)]">{info.count}</strong>{" "}
            инициатив
            {info.fileName ? (
              <>
                {" "}
                ·{" "}
                <span className="break-all text-[var(--ink)]">{info.fileName}</span>
              </>
            ) : null}
            {info.source === "upload" ? " · загружен из UI" : " · файл проекта"}
            {info.updatedAt ? (
              <> · обновлён {formatUpdatedAt(info.updatedAt)}</>
            ) : null}
          </>
        ) : (
          "Загрузка сведений о реестре…"
        )}
      </p>
      <p className="mt-2 text-xs text-[var(--muted)]">
        Excel с листом «Инициативы» и колонкой «Название» (.xlsx)
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadFile(file);
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="rounded-xl bg-[linear-gradient(135deg,var(--brand),var(--brand-2))] px-3.5 py-2.5 text-sm font-semibold text-[#041018] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Обновляем…" : "Загрузить Excel"}
        </button>
        {info?.source === "upload" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void resetToSeed()}
            className="rounded-xl border border-[var(--line)] bg-[var(--card)] px-3.5 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--brand)] disabled:opacity-50"
          >
            Вернуть исходный
          </button>
        ) : null}
      </div>
    </div>
  );
}
