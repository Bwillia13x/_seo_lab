import { LoadingIndicator } from "@/components/ui/loading-indicator";

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingIndicator text="Loading Belmont SEO Lab..." size="lg" />
    </div>
  );
}
