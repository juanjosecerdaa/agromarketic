import { ArrowUpRight } from "lucide-react";

export function StatCard({
  label,
  value,
  change,
  icon: Icon,
}: {
  label: string;
  value: string;
  change?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-5">
      <div className="flex items-start justify-between">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e5f0df] text-forest">
          <Icon className="h-5 w-5" />
        </div>
        {change && (
          <span className="flex items-center gap-1 text-xs font-bold text-leaf">
            {change}
            <ArrowUpRight className="h-3 w-3" />
          </span>
        )}
      </div>
      <p className="mt-5 text-sm text-ink/50">{label}</p>
      <p className="mt-1 font-display text-3xl font-extrabold">{value}</p>
    </div>
  );
}
