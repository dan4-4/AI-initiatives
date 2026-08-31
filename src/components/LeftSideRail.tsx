"use client";

const TAB_CLASS =
  "flex h-[7.25rem] w-10 shrink-0 flex-col items-center justify-center gap-2 rounded-r-2xl border border-l-0 border-[var(--line)] bg-[var(--card)] shadow-[var(--shadow)] transition hover:border-[var(--brand)]";

interface LeftSideRailProps {
  historyCount: number;
  registryCount: number | string;
  historyOpen: boolean;
  registryOpen: boolean;
  onOpenHistory: () => void;
  onOpenRegistry: () => void;
}

/** Общая колонка вкладок слева — одинаковый размер, без наложения */
export function LeftSideRail({
  historyCount,
  registryCount,
  historyOpen,
  registryOpen,
  onOpenHistory,
  onOpenRegistry,
}: LeftSideRailProps) {
  return (
    <div className="no-print fixed left-0 top-1/2 z-40 flex -translate-y-1/2 flex-col gap-2">
      <button
        type="button"
        onClick={onOpenHistory}
        className={TAB_CLASS}
        aria-expanded={historyOpen}
        aria-controls="history-drawer"
        title="История паспортов"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)] [writing-mode:vertical-rl] rotate-180">
          История
        </span>
        <span className="min-w-[1.5rem] rounded-full bg-[var(--brand-soft)] px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums text-[var(--brand)]">
          {historyCount}
        </span>
      </button>
      <button
        type="button"
        onClick={onOpenRegistry}
        className={TAB_CLASS}
        aria-expanded={registryOpen}
        aria-controls="registry-drawer"
        title="Реестр инициатив"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)] [writing-mode:vertical-rl] rotate-180">
          Реестр
        </span>
        <span className="min-w-[1.5rem] rounded-full bg-[var(--brand-soft)] px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums text-[var(--brand)]">
          {registryCount}
        </span>
      </button>
    </div>
  );
}
