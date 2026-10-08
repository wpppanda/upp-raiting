"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";

/** A native modal dialog, outside table layout, with a right-hand slide-in. */
export default function SidePanel({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  closeLabel = "Close panel",
  width = 460,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  closeLabel?: string;
  width?: number;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleId = useId();
  const subtitleId = useId();

  const requestClose = useCallback(() => {
    if (timerRef.current) return;
    if (dialogRef.current) dialogRef.current.dataset.leaving = "true";
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onClose();
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 180);
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    dialog.dataset.leaving = "false";
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="side-panel"
      style={{ "--panel-width": `${width}px` } as CSSProperties}
      aria-labelledby={titleId}
      aria-describedby={subtitle ? subtitleId : undefined}
      aria-modal="true"
      onCancel={(event) => { event.preventDefault(); requestClose(); }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const dialog = event.currentTarget;
        const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )).filter(element => element.tabIndex >= 0 && element.getClientRects().length > 0);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) { event.preventDefault(); return; }
        if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
          event.preventDefault();
          first.focus();
        }
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) requestClose();
      }}
    >
      <header className="side-panel-header">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[.1em] text-slate-400">Business reputation</p>
          <h2 id={titleId} className="text-[18px] font-semibold tracking-tight text-[#1E293B]">{title}</h2>
          {subtitle && <p id={subtitleId} className="mt-1 text-xs leading-relaxed text-slate-500">{subtitle}</p>}
        </div>
        <button ref={closeRef} type="button" className="panel-close" onClick={requestClose} aria-label={closeLabel} title="Close (Esc)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
      </header>
      <div className="side-panel-body">{open ? children : null}</div>
      <footer className="side-panel-footer">
        {footer ?? <><span className="text-xs text-slate-400">Press <kbd className="rounded border border-slate-200 px-1 py-0.5 font-sans text-[10px]">Esc</kbd> to close</span><button type="button" className="panel-secondary-button" onClick={requestClose}>Close</button></>}
      </footer>
    </dialog>
  );
}
