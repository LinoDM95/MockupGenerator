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
          className="mb-2 w-full cursor-text rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />
      ) : null}
    </Modal>
  );
};
