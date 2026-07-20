import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  description?: string;
  icon?: LucideIcon;
  trend?: { value: string; direction: "up" | "down" };
}

export function StatCard({ label, value, description, icon: Icon, trend }: StatCardProps) {
  return (
    <div className="group relative border border-line bg-surface hover:bg-surface-alt transition-colors p-6">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs text-muted/60 font-mono tracking-[0.1em] uppercase">
          {label}
        </span>
        {Icon && <Icon className="w-4 h-4 text-muted/40" />}
      </div>
      <div className="text-2xl font-bold tracking-[-0.03em] tabular-nums">{value}</div>
      {trend && (
        <div className="flex items-center gap-1.5 mt-2">
          <span
            className={`text-xs font-medium ${
              trend.direction === "up" ? "text-green-400/70" : "text-red-400/70"
            }`}
          >
            {trend.direction === "up" ? "↑" : "↓"} {trend.value}
          </span>
        </div>
      )}
      {description && (
        <div className="text-xs text-muted/50 mt-2 leading-relaxed">{description}</div>
      )}
    </div>
  );
}
