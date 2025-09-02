import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingIndicatorProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export function LoadingIndicator({
  size = "md",
  text = "Loading...",
  className,
}: LoadingIndicatorProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Loader2 className={cn("animate-spin", sizeClasses[size])} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}

export function LoadingSpinner({
  size = "md",
  className,
}: Omit<LoadingIndicatorProps, "text">) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <Loader2 className={cn("animate-spin", sizeClasses[size], className)} />
  );
}
