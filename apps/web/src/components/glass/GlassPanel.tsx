import { type HTMLAttributes } from "react";

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function GlassPanel({
  hover = false,
  padding = "md",
  className = "",
  children,
  ...props
}: GlassPanelProps) {
  return (
    <div
      className={`glass-panel ${paddingClasses[padding]} ${hover ? "glass-panel-hover" : ""} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
