interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
}

export function UndoToast({ message, onUndo, onDismiss }: UndoToastProps) {
  return (
    <div
      className="bg-ink text-bone fixed right-4 bottom-20 z-50 flex min-h-14 items-center gap-5 px-5 py-3 shadow-[0_16px_50px_rgb(17_17_15/0.24)] md:bottom-5"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm">{message}</p>
      <button
        className="focus-ring-light font-label min-h-11 text-[0.68rem] font-semibold underline underline-offset-4"
        type="button"
        onClick={onUndo}
      >
        Undo
      </button>
      <button
        className="focus-ring-light -mr-2 grid min-h-11 min-w-11 place-items-center text-lg"
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}
