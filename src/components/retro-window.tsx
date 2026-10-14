import type { ReactNode } from "react";
import { PixelIcon, type PixelIconName } from "./pixel-icon";

type RetroWindowProps = {
  title: string;
  icon?: PixelIconName;
  children: ReactNode;
  status?: string;
  action?: ReactNode;
  className?: string;
};

/** Shared game-window frame; meaningful headings stay in its content. */
export function RetroWindow({
  title,
  icon,
  children,
  status,
  action,
  className = "",
}: RetroWindowProps) {
  return (
    <div className={`retro-window info-panel ${className}`}>
      <div className="panel-heading">
        {icon && <PixelIcon name={icon} />}
        <span>{title}</span>
        <span aria-hidden="true">▪ ▪ ▪</span>
      </div>
      <div className="window-content">{children}</div>
      {(status || action) && (
        <div className="window-footer">
          {status && <span>{status}</span>}
          {action}
        </div>
      )}
    </div>
  );
}
