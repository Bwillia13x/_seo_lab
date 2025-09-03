"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { AIBadge } from "@/components/ui/ai-badge";

type PageHeaderProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  showLogo?: boolean;
};

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
  showLogo = false,
}: Readonly<PageHeaderProps>) {
  return (
    <div className={cn("page-header", className)}>
      <div className="flex items-center gap-3">
        {showLogo && (
          <Image
            src="/images/PRAIRIESIGNALLOGO.png"
            alt="Prairie Signal"
            width={32}
            height={32}
            className="h-8 w-8"
          />
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <AIBadge />
        {actions}
      </div>
    </div>
  );
}
