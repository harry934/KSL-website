"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DingToaster, toast as dingToast } from "@/components/ui/ding-toast";
import { cn } from "@/lib/cn";

type ToastKind = "success" | "error";
type ToastAction = { label: string; onClick: () => void };

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
};

type FeedbackApi = {
  toast: (message: string, kind?: ToastKind, action?: ToastAction) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const FeedbackContext = createContext<FeedbackApi | null>(null);

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);

  const toast = useCallback((message: string, kind: ToastKind = "success", action?: ToastAction) => {
    const opts = action
      ? {
          action: {
            label: action.label,
            onClick: () => {
              action.onClick();
            },
          },
          duration: 12000,
        }
      : kind === "error"
        ? { duration: 7000 }
        : { duration: 4000 };

    if (kind === "error") dingToast.error(message, opts);
    else dingToast.success(message, opts);
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setDialog({ ...options, resolve })),
    []
  );

  function close(ok: boolean) {
    const resolve = dialog?.resolve;
    // Wait until the click finishes. Removing the layer on mouse-down leaves the page unable to take the next click.
    window.setTimeout(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      resolve?.(ok);
      setDialog(null);
    }, 0);
  }

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}
      <DingToaster position="top-center" theme="light" />
      {dialog && <ConfirmDialog options={dialog} onClose={close} />}
    </FeedbackContext.Provider>
  );
}

function ConfirmDialog({ options, onClose }: { options: ConfirmOptions; onClose: (ok: boolean) => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[#0b1f3a]/45 p-4" onClick={() => onClose(false)}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="ksl-confirm-title"
        className="toast-enter w-full max-w-[420px] rounded-[12px] bg-white p-6 shadow-[0_24px_60px_rgba(11,31,58,0.3)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              options.danger ? "bg-[#fdecea] text-[#b42318]" : "bg-[#eef2f6] text-[#0b1f3a]"
            )}
          >
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 id="ksl-confirm-title" className="text-[16px] font-bold text-[#0b1f3a]">
              {options.title}
            </h2>
            {options.message && <p className="mt-1 text-[14px] text-[#5b6775]">{options.message}</p>}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onClose(false)}>
            Cancel
          </Button>
          <Button
            ref={confirmRef}
            onClick={() => onClose(true)}
            className={options.danger ? "border-[#b42318] bg-[#b42318] hover:border-[#9a1d13] hover:bg-[#9a1d13]" : undefined}
          >
            {options.confirmLabel ?? "Confirm"}
          </Button>
        </div>
      </div>
    </div>
  );
}

const fallback: FeedbackApi = {
  toast: () => {},
  confirm: async (o) => window.confirm(o.message ? `${o.title}\n\n${o.message}` : o.title),
};

export function useFeedback() {
  return useContext(FeedbackContext) ?? fallback;
}
