import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const KPISkeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <Card
    className={cn("soft-shadow animate-pulse", className)}
    ref={ref}
    {...props}
  >
    <CardHeader className="py-3">
      <CardTitle className="text-sm flex items-center gap-2">
        <div className="h-4 bg-muted rounded w-16"></div>
        <div className="h-3 bg-muted rounded w-12"></div>
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="text-2xl font-bold">
        <div className="h-6 bg-muted rounded w-20"></div>
      </div>
      <div className="text-xs text-muted-foreground">
        <div className="h-3 bg-muted rounded w-24 mt-1"></div>
      </div>
    </CardContent>
  </Card>
));
KPISkeleton.displayName = "KPISkeleton";

type KPICardProps = {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  className?: string;
};

export function KPICard({ label, value, hint, icon, className }: KPICardProps) {
  return (
    <Card className={cn("soft-shadow", className)}>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-bold">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

export { KPISkeleton };
