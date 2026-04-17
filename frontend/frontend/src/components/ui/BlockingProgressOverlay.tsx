import { WorkSessionShell } from "./workSession/WorkSessionShell";

/** @deprecated Name beibehalten — rendert dieselbe {@link WorkSessionShell} inkl. Footer-Pixel-Glyph (z. B. ZIP, Kurzdialoge). */
export type BlockingProgressOverlayProps = {
  title: string;
  subtitle?: string;
  message?: string;
  current?: number;
  total?: number;
  packPercent?: number | null;
  indeterminate?: boolean;
};

/** Gleicher Wartebereich wie Generator/Upscaler; nur z-[100] für Overlay über laufender Shell. */
export const BlockingProgressOverlay = ({
  title,
  subtitle = "Bitte kurz warten und dieses Fenster nicht schließen.",
  message = "",
  current = 0,
  total = 1,
  packPercent = null,
  indeterminate = false,
}: BlockingProgressOverlayProps) => (
  <WorkSessionShell
    shellClassName="z-[100]"
    title={title}
    subtitle={subtitle}
    message={message}
    current={current}
    total={total}
    packPercent={packPercent}
    indeterminate={indeterminate}
  >
    <div className="min-h-0 flex-1" aria-hidden />
  </WorkSessionShell>
);
