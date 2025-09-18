"use client";
import React, { Suspense } from "react";
import Loading, { LoadingProps } from "./Loading";

/**
 * Convenience wrapper to apply Suspense to any subtree with a localized fallback.
 * Default fallback: centered block spinner (not fullscreen).
 */
export interface SuspenseSectionProps {
  children: React.ReactNode;
  /** Override fallback completely */
  fallback?: React.ReactNode;
  /** Pass props to default Loading fallback */
  loadingProps?: Partial<LoadingProps>;
  /** If true, fallback stretches to block with padding (default true) */
  padded?: boolean;
  /** Additional class for wrapper */
  className?: string;
}

const SuspenseSection: React.FC<SuspenseSectionProps> = ({
  children,
  fallback,
  loadingProps,
  padded = true,
  className
}) => {
  const defaultFallback = (
    <div className={padded ? "py-4" : undefined}>
      <Loading inline={false} {...loadingProps} />
    </div>
  );

  return (
    <Suspense fallback={fallback ?? defaultFallback}>
      <div className={className}>{children}</div>
    </Suspense>
  );
};

export default SuspenseSection;
