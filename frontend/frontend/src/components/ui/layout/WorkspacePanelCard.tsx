import type { ReactNode } from "react";

import { cn } from "../../../lib/ui/cn";
import {
  WORKSPACE_PANEL_HEADER,
  WORKSPACE_PANEL_TITLE,
  workspacePanelCardClassName,
} from "../../../lib/ui/workspaceSurfaces";

type Props = {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
};

export const WorkspacePanelCard = ({
  title,
  children,
  className,
  bodyClassName,
  headerClassName,
}: Props) => (
  <div className={cn(workspacePanelCardClassName, className)}>
    {title != null ? (
      <div className={cn(WORKSPACE_PANEL_HEADER, headerClassName)}>
        {typeof title === "string" ? (
          <h3 className={WORKSPACE_PANEL_TITLE}>{title}</h3>
        ) : (
          title
        )}
      </div>
    ) : null}
    <div className={cn("min-h-0 min-w-0 flex-1 overflow-auto", bodyClassName)}>
      {children}
    </div>
  </div>
);
