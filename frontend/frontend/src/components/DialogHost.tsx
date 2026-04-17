import { Modal } from "./ui/Modal";
import { useAppStore } from "../store/appStore";

export const DialogHost = () => {
  const dialog = useAppStore((s) => s.dialog);
  const confirmDialog = useAppStore((s) => s.confirmDialog);
  const cancelDialog = useAppStore((s) => s.cancelDialog);
  const setDialogInput = useAppStore((s) => s.setDialogInput);

  return (
    <Modal
      isOpen={dialog.isOpen}
      title={dialog.title}
      message={dialog.type === "confirm" ? dialog.message : undefined}
      onCancel={cancelDialog}
      onConfirm={confirmDialog}
      confirmLabel="Bestätigen"
      cancelLabel="Abbrechen"
    >
      {dialog.type === "prompt" ? (
        <input
          type="text"
          autoFocus
          value={dialog.inputValue}
          onChange={(e) => setDialogInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") confirmDialog();
          }}
          className="mb-2 w-full cursor-text rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-[0_2px_8px_rgb(0,0,0,0.04)] outline-none ring-1 ring-slate-900/5 transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
        />
      ) : null}
    </Modal>
  );
};
