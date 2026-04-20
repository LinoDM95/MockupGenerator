/** Blob-URLs sofort zu revoken bricht Downloads oft ab; Browser braucht Zeit zum Start. */
export const REVOKE_BLOB_URL_MS = 60_000;

export const scheduleRevokeObjectURL = (url: string) => {
  window.setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }, REVOKE_BLOB_URL_MS);
};

/** Programmatischer Download; URL wird verzoegert freigegeben. */
export const triggerAnchorDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  scheduleRevokeObjectURL(url);
};
