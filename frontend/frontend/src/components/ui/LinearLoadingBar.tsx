type Props = {
  message: string;
};

/** Dünne Leiste oben im Bereich – indeterminierter Lauf für Uploads / API-Ladevorgänge. */
export const LinearLoadingBar = ({ message }: Props) => (
  <div
    role="status"
    aria-live="polite"
    aria-busy="true"
    className="mb-4 overflow-hidden rounded-xl border border-blue-100 bg-blue-50/90 px-3 py-2.5 shadow-sm"
  >
    <p className="mb-2 text-xs font-medium text-blue-900">{message}</p>
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
      <div className="studio-linear-bar-fill h-full w-[38%] rounded-full bg-blue-600" />
    </div>
  </div>
);
