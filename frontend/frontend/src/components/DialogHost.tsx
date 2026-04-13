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
          className="mb-2 w-full cursor-text rounded-xl border border-neutral-300 p-3 text-lg font-medium outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : null}
    </Modal>
  );
};
