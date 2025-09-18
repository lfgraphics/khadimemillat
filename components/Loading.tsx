"use client";
import { Loader2 } from "lucide-react";
import React from "react";
import clsx from "clsx";

/**
 * Reusable loading spinner.
 *
 * Props:
 * - inline: if true, spinner only takes minimal space (default true unless fullScreen)
 * - fullScreen: covers viewport with dim background (route-level or blocking overlay)
 * - label: optional accessible label / text shown next to spinner
 * - size: spinner size in tailwind rem units (default 6 -> w-6 h-6)
 * - className: extra classes
 */
export interface LoadingProps {
  inline?: boolean;
  fullScreen?: boolean;
  label?: string;
  size?: number; // tailwind sizing number e.g. 4 => w-4 h-4
  className?: string;
  children?: React.ReactNode; // optional additional content
}

const Loading: React.FC<LoadingProps> = ({
  inline,
  fullScreen,
  label = "Loading...",
  size = 6,
  className,
  children
}) => {
  const sizeClassMap: Record<number, string> = {
    3: "w-3 h-3",
    4: "w-4 h-4",
    5: "w-5 h-5",
    6: "w-6 h-6",
    7: "w-7 h-7",
    8: "w-8 h-8",
    9: "w-9 h-9",
    10: "w-10 h-10",
    12: "w-12 h-12",
  };
  const resolvedSize = sizeClassMap[size] ?? "w-6 h-6";

  const spinner = (
    <div className="flex items-center gap-2" role="status" aria-live="polite" aria-label={label}>
      <Loader2 className={clsx("animate-spin text-muted-foreground", resolvedSize)} />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
      {children}
    </div>
  );

  if (fullScreen) {
    return (
      <div className={clsx("fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm", className)}>
        {spinner}
      </div>
    );
  }

  if (inline === false) {
    return (
      <div className={clsx("py-8 flex justify-center", className)}>
        {spinner}
      </div>
    );
  }

  return <span className={clsx("inline-flex", className)}>{spinner}</span>;
};

export default Loading;
