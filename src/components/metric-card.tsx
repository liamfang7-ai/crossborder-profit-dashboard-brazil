type MetricCardProps = {
  title: string;
  value: string;
  helper?: string;
  tone?: "default" | "profit" | "cost" | "warning";
};

const toneStyles = {
  default: "border-slate-200 bg-white text-slate-950",
  profit: "border-emerald-200 bg-emerald-50 text-emerald-950",
  cost: "border-rose-200 bg-rose-50 text-rose-950",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
};

export function MetricCard({
  title,
  value,
  helper,
  tone = "default",
}: MetricCardProps) {
  return (
    <section
      className={`rounded-lg border p-4 shadow-sm shadow-slate-200/50 ${toneStyles[tone]}`}
    >
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-3 text-2xl font-semibold tracking-normal">{value}</p>
      {helper ? <p className="mt-3 text-xs text-slate-500">{helper}</p> : null}
    </section>
  );
}
