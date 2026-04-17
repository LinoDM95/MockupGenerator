/** Formatiert Millisekunden als lesbare deutsche Restzeit (mindestens Sekunden). */
export const formatRemainingMs = (ms: number): string => {
  if (!Number.isFinite(ms) || ms <= 0) return "0 Sek.";
  const sec = Math.ceil(ms / 1000);
  if (sec < 60) return `${sec} Sek.`;
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  if (min < 60) {
    return s > 0 ? `${min} Min. ${s} Sek.` : `${min} Min.`;
  }
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h} Std. ${m} Min.` : `${h} Std.`;
};
